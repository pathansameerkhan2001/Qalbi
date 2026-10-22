"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { createPublicClient, createSessionClient } from "@/lib/supabase/server";
import { getCommerceSource } from "@/lib/shopify";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";
import { STORE_TAG } from "@/lib/store/catalog";
import { settingSchemas, type SettingKey } from "@/lib/store/settings";
import { homepageSectionIds } from "@/lib/content/homepage";
import { suggestedCategories } from "@/data/category-suggestions";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { rateLimit } from "@/lib/server/rate-limit";
import { headers } from "next/headers";
import { requireAdmin } from "./auth";
import { orderStatuses, paymentStatuses } from "./data";
import { checkbox, dbError, invalid, refreshStore, type ActionState } from "./action-helpers";
import { storeImage } from "./media";
import { imagePath, productSchema, publishBlockers } from "./product-rules";
import { codBlockers, getCheckoutReadiness, verifyQrImage } from "./checkout-readiness";

export type { ActionState };

/**
 * Admin mutations. Every action starts with requireAdmin() (server-side check of
 * the Supabase session + admin_users) and writes with the user's own session, so
 * row level security also rejects anything a non-admin attempts.
 */

const handleField = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
const pathField = z.string().trim().max(300).regex(/^(https:\/\/|[a-z0-9])[^\s<>"']*$/i, "Enter a media path such as products/serum.webp");

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase is not configured." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`admin-login:${ip}`, 8, 15 * 60 * 1000).allowed) return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again." };

  const parsed = z
    .object({
      email: z.string().trim().min(1, "Enter your email address").pipe(z.email("Enter a valid email address")),
      password: z.string().min(1, "Enter your password").max(200, "Password is too long"),
    })
    .safeParse({ email: formData.get("email") ?? "", password: formData.get("password") ?? "" });
  if (!parsed.success) return { ...invalid(parsed.error), message: "" };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, message: signInErrorMessage(error) };

  // Authorise on the server with the new session: admin_users is only readable
  // by its own row's user (RLS), so a non-admin account finds nothing.
  const { data: adminRow, error: adminError } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (adminError || !adminRow) {
    if (adminError) console.error("[admin] sign-in authorisation check failed:", adminError.code ?? adminError.message);
    await supabase.auth.signOut();
    if (!adminError) return { ok: false, message: "This account doesn't have administrator access." };
    const notSetUp = adminError.code === "PGRST205" || adminError.code === "42P01";
    return {
      ok: false,
      message: notSetUp
        ? "Administrator access hasn't been set up in the database yet. Your password was accepted, but no admin list exists."
        : "We couldn't verify administrator access right now. Please try again shortly.",
    };
  }
  redirect("/admin");
}

function signInErrorMessage(error: { code?: string; status?: number; message: string } | null): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "This email address hasn't been confirmed yet.";
    case "user_banned":
      return "This account has been disabled.";
    case "over_request_rate_limit":
      return "Too many sign-in attempts. Please wait a few minutes and try again.";
  }
  if (error?.status === 429) return "Too many sign-in attempts. Please wait a few minutes and try again.";
  console.error("[admin] sign-in failed:", error?.code ?? error?.status ?? "no user returned");
  return "We couldn't sign you in right now. Please try again.";
}

export async function signOutAction() {
  if (isSupabaseConfigured()) await (await createSessionClient()).auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function saveProductAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (isShopifyConfigured()) return { ok: false, message: "Products are managed in Shopify while the store is connected." };

  let images: unknown = [];
  try {
    images = JSON.parse(String(formData.get("images") ?? "[]"));
  } catch {
    return { ok: false, message: "Image list is invalid." };
  }
  const field = (k: string) => formData.get(k) ?? "";
  const parsed = productSchema.safeParse({
    id: field("id"),
    slug: field("slug"),
    name: field("name"),
    description: field("description"),
    price: formData.get("price"),
    compare_at_price: field("compare_at_price"),
    stock_quantity: field("stock_quantity"),
    sku: field("sku"),
    category_id: field("category_id"),
    is_published: formData.get("is_published"),
    is_featured: formData.get("is_featured"),
    is_best_seller: formData.get("is_best_seller"),
    images,
    seo_title: field("seo_title"),
    seo_description: field("seo_description"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const { id, images: imageList, seo_title, seo_description, ...base } = parsed.data;
  // SEO columns are only written when used, so saving works before the SEO migration is applied.
  const fields = seo_title || seo_description || formData.get("seo_present") ? { ...base, seo_title, seo_description } : base;

  const db = await createSessionClient();
  const saved = id
    ? await db.from("products").update(fields).eq("id", id).select("id").single()
    : await db.from("products").insert(fields).select("id").single();
  if (saved.error) return dbError("product", saved.error);
  const productId = saved.data.id as string;

  // Replace the image list. PostgREST has no multi-statement transaction, so the
  // previous rows are restored if inserting the new list fails.
  const previous = await db.from("product_images").select("image_url, alt_text, sort_order, is_primary").eq("product_id", productId);
  if (previous.error) return dbError("product images", previous.error);
  // Most saves don't touch the photos: skip the delete + insert round trips when the list is unchanged.
  const before = [...(previous.data ?? [])].sort((a, b) => Number(a.sort_order) - Number(b.sort_order)).map((img) => `${img.image_url}\n${img.alt_text ?? ""}`);
  const after = imageList.map((img) => `${img.path}\n${img.alt || ""}`);
  if (id && before.join("\0") === after.join("\0")) {
    refreshStore("/admin/products", "/", "/products");
    return { ok: true, message: "Product saved." };
  }
  const removed =await db.from("product_images").delete().eq("product_id", productId);
  if (removed.error) return dbError("product images", removed.error);
  if (imageList.length) {
    const inserted = await db
      .from("product_images")
      .insert(imageList.map((img, i) => ({ product_id: productId, image_url: img.path, alt_text: img.alt || null, sort_order: i, is_primary: i === 0 })));
    if (inserted.error) {
      if (previous.data?.length) {
        const restored = await db.from("product_images").insert(previous.data.map((img) => ({ ...img, product_id: productId })));
        if (restored.error) console.error("[admin] restoring product images failed:", restored.error.code);
      }
      refreshStore("/admin/products", "/", "/products");
      return { ...dbError("product images", inserted.error), message: "The product details were saved, but the photo changes were not. Please check the photos and save again." };
    }
  }

  refreshStore("/admin/products", "/", "/products");
  if (!id) redirect(`/admin/products/${productId}?saved=1`);
  return { ok: true, message: "Product saved." };
}

/**
 * Publish / unpublish from the product list. Publishing re-checks the stored
 * price and photos on the server, and success is reported only after the
 * database returns the row with the new is_published value.
 */
export async function setProductPublishedAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (isShopifyConfigured()) return { ok: false, message: "Products are managed in Shopify while the store is connected." };
  const parsed = z.object({ id: z.uuid(), publish: z.enum(["true", "false"]) }).safeParse({ id: formData.get("id"), publish: formData.get("publish") });
  if (!parsed.success) return { ok: false, message: "Unknown product." };
  const publish = parsed.data.publish === "true";
  const db = await createSessionClient();
  const [product, images] = await Promise.all([
    db.from("products").select("name, slug, price").eq("id", parsed.data.id).maybeSingle(),
    db.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", parsed.data.id),
  ]);
  if (product.error) return dbError("product", product.error);
  if (images.error) return dbError("product images", images.error);
  if (!product.data) return { ok: false, message: "Product not found — it may have been deleted. Reload the page." };
  const name = String(product.data.name ?? "");
  if (publish) {
    const price = Number(product.data.price);
    const blockers = publishBlockers({ name, price, imageCount: images.count ?? 0 });
    if (blockers.length) {
      const priceNote = price > 0 ? "" : ` (the saved price is ${price === 0 ? "₹0" : "missing"})`;
      return { ok: false, message: `“${name}” can't be published yet: ${blockers.join(" and ")}${priceNote}. Open the product, fill this in and save, then publish.` };
    }
  }
  const { data, error } = await db.from("products").update({ is_published: publish }).eq("id", parsed.data.id).select("id, is_published");
  if (error) return dbError("product", error);
  // Row level security turns a forbidden update into "0 rows updated" without an error.
  if (!data?.length) return { ok: false, message: "The database did not update this product — this account may not have administrator rights for products (row level security)." };
  if (data[0].is_published !== publish) return { ok: false, message: `The database still has “${name}” as ${data[0].is_published ? "published" : "a draft"}. Please try again.` };
  refreshStore("/admin/products", `/products/${product.data.slug}`);
  if (!publish) return { ok: true, message: `“${name}” is now a draft — hidden from customers.` };

  // Confirm visitors can now read it (the same anonymous access the storefront uses).
  const visible = await createPublicClient().from("products").select("id").eq("id", parsed.data.id).maybeSingle();
  if (visible.error || !visible.data) {
    if (visible.error) console.error("[admin] public visibility check:", visible.error.code ?? visible.error.message);
    return { ok: true, message: `“${name}” is saved as published, but the public website could not read it yet. Check the products read policy in Supabase.` };
  }
  return {
    ok: true,
    message:
      getCommerceSource() === "supabase"
        ? `“${name}” is published and live on the website.`
        : `“${name}” is published in the database. The website shows it once COMMERCE_SOURCE=supabase is set (see the Dashboard checklist).`,
  };
}

export async function deleteProductAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (isShopifyConfigured()) return { ok: false, message: "Products are managed in Shopify while the store is connected." };
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, message: "Unknown product." };
  const db = await createSessionClient();
  // Images are removed with the product (on delete cascade); orders keep their own copy of the details.
  const { data, error } = await db.from("products").delete().eq("id", id.data).select("id");
  if (error) return dbError("product", error);
  if (!data?.length) return { ok: false, message: "Product not found or not deletable." };
  refreshStore("/admin/products", "/", "/products");
  redirect("/admin/products?deleted=1");
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function updateOrderAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(orderStatuses), payment_status: z.enum(paymentStatuses) })
    .safeParse({ id: formData.get("id"), status: formData.get("status"), payment_status: formData.get("payment_status") });
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...fields } = parsed.data;
  const db = await createSessionClient();
  const { error } = await db.from("orders").update(fields).eq("id", id);
  // The database refuses to reopen a cancelled order (its stock was already returned).
  if (error?.message.startsWith("order_cancelled")) return { ok: false, message: "A cancelled order can't be reopened. Place a new order instead." };
  if (error) return dbError("order", error);
  updateTag(STORE_TAG); // cancellation can return stock
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: "Order updated." };
}

// ---------------------------------------------------------------------------
// Categories & ingredients
// ---------------------------------------------------------------------------

export async function saveCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.union([z.uuid(), z.literal("")]),
      slug: handleField,
      name: z.string().trim().min(1, "Enter a name").max(80),
      description: z.string().trim().max(400).transform((v) => v || null),
      image_url: z.union([imagePath, z.literal("")]).transform((v) => v || null),
      sort_order: z.coerce.number().int().min(-1000).max(100000),
      is_active: checkbox,
    })
    .safeParse(Object.fromEntries(["id", "slug", "name", "description", "image_url", "sort_order", "is_active"].map((k) => [k, formData.get(k) ?? ""])));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...fields } = parsed.data;
  const db = await createSessionClient();
  const { data, error } = id
    ? await db.from("categories").update(fields).eq("id", id).select("id, is_active")
    : await db.from("categories").insert(fields).select("id, is_active");
  if (error) return dbError("category", error);
  // Row level security turns a forbidden write into "0 rows" without an error: never report that as saved.
  if (!data?.length) return { ok: false, message: "The database did not save this category — this account may not have administrator rights for categories." };
  refreshStore("/admin/categories", "/admin/products", `/collections/${fields.slug}`);
  return { ok: true, message: `Saved “${fields.name}” — ${categoryVisibilityNote(data[0].is_active === true)}` };
}

function categoryVisibilityNote(active: boolean): string {
  if (!active) return "hidden from the website.";
  return getCommerceSource() === "supabase"
    ? "visible on the website (menu, “Shop by Category” and /products)."
    : "marked visible; the website shows it once COMMERCE_SOURCE=supabase is set.";
}

/** Show / hide a category from the category list without opening its form. */
export async function setCategoryActiveAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) }).safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return { ok: false, message: "Unknown category." };
  const active = parsed.data.active === "true";
  const db = await createSessionClient();
  const { data, error } = await db.from("categories").update({ is_active: active }).eq("id", parsed.data.id).select("name, slug, is_active");
  if (error) return dbError("category", error);
  if (!data?.length) return { ok: false, message: "The database did not update this category — this account may not have administrator rights for categories." };
  if (data[0].is_active !== active) return { ok: false, message: "The database did not change the category's visibility. Please try again." };
  refreshStore("/admin/categories", "/admin/products", `/collections/${data[0].slug}`);
  return { ok: true, message: `“${data[0].name}” is ${categoryVisibilityNote(active)}` };
}

/**
 * Deletes a category. If products still use it, the administrator must choose
 * where they go (`reassign_to`: another category's id, or "none" for no
 * category); they are moved first, and the database still refuses the delete
 * if any product remains (on delete restrict).
 */
export async function deleteCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), reassign_to: z.union([z.uuid(), z.literal("none"), z.literal("")]) })
    .safeParse({ id: formData.get("id"), reassign_to: formData.get("reassign_to") ?? "" });
  if (!parsed.success) return { ok: false, message: "Unknown category." };
  const { id, reassign_to } = parsed.data;
  if (reassign_to === id) return { ok: false, message: "Choose a different category for its products." };
  const db = await createSessionClient();

  const used = await db.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (used.error) return dbError("category", used.error);
  const productCount = used.count ?? 0;
  if (productCount > 0) {
    if (!reassign_to) return { ok: false, message: `${productCount} product${productCount === 1 ? " uses" : "s use"} this category. Choose where to move ${productCount === 1 ? "it" : "them"} first.` };
    const target = reassign_to === "none" ? null : reassign_to;
    if (target) {
      const exists = await db.from("categories").select("id").eq("id", target).maybeSingle();
      if (exists.error) return dbError("category", exists.error);
      if (!exists.data) return { ok: false, message: "The category chosen for its products no longer exists. Reload the page." };
    }
    const moved = await db.from("products").update({ category_id: target }).eq("category_id", id).select("id");
    if (moved.error) return dbError("product", moved.error);
    if ((moved.data?.length ?? 0) < productCount) return { ok: false, message: "Not every product could be moved, so the category was kept. Please try again." };
  }

  const { data, error } = await db.from("categories").delete().eq("id", id).select("id");
  if (error) {
    if (error.code === "23503") return { ok: false, message: "Products were added to this category meanwhile. Reload the page and try again." };
    return dbError("category", error);
  }
  if (!data?.length) return { ok: false, message: "Category not found or not deletable." };
  refreshStore("/admin/categories", "/admin/products");
  return { ok: true, message: productCount ? `Category deleted; its ${productCount} product${productCount === 1 ? " was" : "s were"} moved.` : "Category deleted." };
}

/** Moves a category one place up or down, then renumbers all of them 10, 20, 30… so the order stays unambiguous. */
export async function moveCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }).safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) return { ok: false, message: "Unknown category." };
  const db = await createSessionClient();
  const { data, error } = await db.from("categories").select("id, sort_order").order("sort_order").order("name");
  if (error) return dbError("category", error);
  const list = data ?? [];
  const from = list.findIndex((c) => c.id === parsed.data.id);
  const to = from + (parsed.data.direction === "up" ? -1 : 1);
  if (from < 0) return { ok: false, message: "Category not found. Reload the page." };
  if (to < 0 || to >= list.length) return { ok: true, message: "" };
  [list[from], list[to]] = [list[to], list[from]];
  const changes = list.map((c, i) => ({ id: c.id as string, sort: (i + 1) * 10, before: c.sort_order as number })).filter((c) => c.sort !== c.before);
  const results = await Promise.all(changes.map((c) => db.from("categories").update({ sort_order: c.sort }).eq("id", c.id).select("id")));
  const failed = results.find((r) => r.error || !r.data?.length);
  if (failed) return failed.error ? dbError("category", failed.error) : { ok: false, message: "The database did not save the new order — this account may not have administrator rights for categories." };
  refreshStore("/admin/categories", "/admin/products");
  return { ok: true, message: "" };
}

/** Adds one of the proposed categories (src/data/categories.ts), always hidden. */
export async function addSuggestedCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const suggestion = suggestedCategories.find((s) => s.slug === formData.get("slug"));
  if (!suggestion) return { ok: false, message: "Unknown suggestion." };
  const db = await createSessionClient();
  const last = await db.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  if (last.error) return dbError("category", last.error);
  const { data, error } = await db
    .from("categories")
    .insert({
      name: suggestion.name,
      slug: suggestion.slug,
      description: suggestion.description || null,
      image_url: suggestion.imagePath,
      sort_order: (Number(last.data?.sort_order) || 0) + 10,
      is_active: false,
    })
    .select("id");
  if (error) return dbError("category", error, `A category with the handle “${suggestion.slug}” already exists.`);
  if (!data?.length) return { ok: false, message: "The database did not save this category — this account may not have administrator rights for categories." };
  refreshStore("/admin/categories", "/admin/products");
  return { ok: true, message: `Added “${suggestion.name}” as hidden.` };
}

/**
 * Adds every proposed category that is not in the database yet (matched by handle
 * or by name), all hidden. Idempotent: existing rows are never changed, and the
 * insert ignores a handle that was added meanwhile (on conflict do nothing).
 */
export async function addAllSuggestedCategoriesAction(): Promise<ActionState> {
  await requireAdmin();
  const db = await createSessionClient();
  const existing = await db.from("categories").select("slug, name, sort_order").order("sort_order", { ascending: false });
  if (existing.error) return dbError("category", existing.error);
  const rows = existing.data ?? [];
  const taken = new Set(rows.flatMap((c) => [c.slug as string, String(c.name).trim().toLowerCase()]));
  const missing = suggestedCategories.filter((s) => !taken.has(s.slug) && !taken.has(s.name.toLowerCase()));
  if (missing.length === 0) return { ok: true, message: "Every suggested category is already in the list — nothing was added." };
  const start = Number(rows[0]?.sort_order) || 0;
  const { data, error } = await db
    .from("categories")
    .upsert(
      missing.map((s, i) => ({
        name: s.name,
        slug: s.slug,
        description: s.description || null,
        image_url: s.imagePath,
        sort_order: start + (i + 1) * 10,
        is_active: false,
      })),
      { onConflict: "slug", ignoreDuplicates: true },
    )
    .select("name");
  if (error) return dbError("category", error);
  if (!data?.length) return { ok: false, message: "The database did not add any category — this account may not have administrator rights for categories, or they were added meanwhile. Reload the page." };
  refreshStore("/admin/categories", "/admin/products");
  const skipped = missing.length - data.length;
  return { ok: true, message: `Added ${data.length} categor${data.length === 1 ? "y" : "ies"} as hidden${skipped ? ` (${skipped} already existed)` : ""}. They are now in the product editor's Category list.` };
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

export async function toggleEnquiryAction(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), handled: checkbox }).safeParse({ id: formData.get("id"), handled: formData.get("handled") });
  if (!parsed.success) return;
  const db = await createSessionClient();
  const { error } = await db.from("enquiries").update({ handled: parsed.data.handled }).eq("id", parsed.data.id);
  if (error) console.error("[admin] enquiry:", error.code);
  revalidatePath("/admin/enquiries");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function settingFromForm(key: SettingKey, f: FormData): unknown {
  const s = (k: string) => String(f.get(k) ?? "").trim();
  const on = (k: string) => f.get(k) === "on";
  switch (key) {
    case "checkout":
      return {
        codEnabled: on("codEnabled"),
        phoneEnabled: on("phoneEnabled"),
        deliveryCharge: Number(s("deliveryCharge") || 0),
        freeDeliveryOver: s("freeDeliveryOver") ? Number(s("freeDeliveryOver")) : null,
        qrImagePath: s("qrImagePath") || null,
      };
    case "contact":
      return { whatsappDigits: s("whatsappDigits").replace(/\D/g, ""), whatsappDisplay: s("whatsappDisplay"), email: s("email") };
    case "announcements":
      return s("lines")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, i) => {
          const [text, href] = line.split("|").map((p) => p.trim());
          return { id: `a${i}`, text, ...(href ? { href } : {}) };
        });
    case "trust_badges":
      return Object.fromEntries(f.getAll("verified").map((id) => [String(id), true]));
    case "featured":
      return { collectionHandle: s("collectionHandle") || "bestsellers" };
    case "brand_claims":
      return { verified: on("verified"), note: s("note") };
    case "offer_bar":
      return { enabled: on("enabled"), animate: on("animate"), messages: jsonField(s("messages")) };
    case "homepage_sections":
      return {
        sections: homepageSectionIds
          .map((id, i) => ({ id, visible: on(`visible_${id}`), order: Number(s(`order_${id}`)) || i + 1 }))
          .sort((a, b) => a.order - b.order)
          .map(({ id, visible }) => ({ id, visible })),
      };
  }
}

/** Structured list posted as JSON by a client form; invalid JSON fails schema validation. */
function jsonField(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const settingPages: Partial<Record<SettingKey, string>> = { offer_bar: "/admin/offer-bar", homepage_sections: "/admin/homepage" };

export async function saveSettingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const key = String(formData.get("key") ?? "") as SettingKey;
  if (!(key in settingSchemas)) return { ok: false, message: "Unknown setting." };
  const parsed = settingSchemas[key].safeParse(settingFromForm(key, formData));
  if (!parsed.success) return { ok: false, message: `Please check this section: ${parsed.error.issues[0]?.message ?? "invalid value"}.` };
  // A switched-on bar with no messages shows nothing on the website — refuse rather than report false success.
  if (key === "offer_bar" && (parsed.data as { enabled: boolean; messages: unknown[] }).enabled && (parsed.data as { messages: unknown[] }).messages.length === 0) {
    return { ok: false, message: "Add at least one message before switching the offer bar on (or untick “Show the offer bar”)." };
  }
  if (key === "checkout") {
    const checkout = parsed.data as { codEnabled: boolean; phoneEnabled: boolean; qrImagePath: string | null };
    if (checkout.phoneEnabled && !checkout.qrImagePath) {
      return { ok: false, message: "Upload the real payment QR image in Media and enter its path before turning on UPI QR payment." };
    }
    if (checkout.qrImagePath && !pathField.safeParse(checkout.qrImagePath).success) return { ok: false, message: "Enter a valid media path for the QR image." };
    // Opening checkout requires everything an order needs; switching methods off is always allowed.
    if (checkout.codEnabled || checkout.phoneEnabled) {
      const blockers = codBlockers(await getCheckoutReadiness());
      if (blockers.length) return { ok: false, message: `Checkout can't be switched on yet: ${blockers.join("; ")}.` };
    }
    if (checkout.phoneEnabled) {
      const qr = await verifyQrImage(checkout.qrImagePath);
      if (!qr.ok) return { ok: false, message: qr.message };
    }
  }
  const db = await createSessionClient();
  const existing = await db.from("store_settings").select("id").eq("setting_key", key).limit(1).maybeSingle();
  if (existing.error) return dbError("settings", existing.error);
  const { error } = existing.data
    ? await db.from("store_settings").update({ setting_value: parsed.data }).eq("id", existing.data.id)
    : await db.from("store_settings").insert({ setting_key: key, setting_value: parsed.data });
  if (error) return dbError("settings", error);
  refreshStore(settingPages[key] ?? "/admin/settings", "/", "/checkout");
  return { ok: true, message: "Settings saved." };
}

// ---------------------------------------------------------------------------
// Media library
// ---------------------------------------------------------------------------

const folderField = z.string().trim().toLowerCase().regex(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/, "Folder: lowercase letters, numbers, hyphens");

export async function uploadMediaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const replacePath = String(formData.get("replacePath") ?? "").trim();
  let result;
  if (replacePath) {
    const valid = pathField.safeParse(replacePath);
    if (!valid.success || replacePath.startsWith("https://")) return { ok: false, message: "Invalid path to replace." };
    result = await storeImage(formData.get("file"), { replacePath });
  } else {
    const folder = folderField.safeParse(String(formData.get("folder") ?? "general") || "general");
    if (!folder.success) return { ok: false, message: folder.error.issues[0].message };
    result = await storeImage(formData.get("file"), { folder: folder.data });
  }
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/admin/media");
  return { ok: true, message: `Uploaded: ${result.path}`, path: result.path };
}

/** Upload folders the content forms may use (uploads/<folder>/…). */
const contentFolders = ["hero", "reels", "blog", "products", "categories", "ingredients", "payments"] as const;

/** Uploads one image for a content form and returns its media path (the form then saves the path). */
export async function uploadImageAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const folder = z.enum(contentFolders).safeParse(formData.get("folder"));
  if (!folder.success) return { ok: false, message: "Unknown upload folder." };
  const result = await storeImage(formData.get("file"), { folder: folder.data });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/admin/media");
  return { ok: true, message: "Image uploaded.", path: result.path };
}

/** Where a media path is still used (so deleting it would break the website). Missing tables are ignored. */
async function mediaReferences(db: Awaited<ReturnType<typeof createSessionClient>>, path: string): Promise<string[]> {
  const checks: [string, string, string[]][] = [
    ["product_images", "a product photo", ["image_url"]],
    ["categories", "a category", ["image_url"]],
    ["hero_slides", "a hero slide", ["desktop_image_path", "mobile_image_path"]],
    ["instagram_reels", "an Instagram Reel", ["thumbnail_path"]],
    ["blog_posts", "a blog post", ["cover_image_path"]],
    ["ingredients", "an ingredient", ["image_path"]],
  ];
  const found: string[] = [];
  await Promise.all(
    checks.map(async ([table, label, columns]) => {
      const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).or(columns.map((c) => `${c}.eq.${path}`).join(","));
      if (!error && count) found.push(`${label}${count > 1 ? ` (${count})` : ""}`);
    }),
  );
  const { data } = await db.from("store_settings").select("setting_value").eq("setting_key", "checkout").maybeSingle();
  if ((data?.setting_value as { qrImagePath?: string } | undefined)?.qrImagePath === path) found.push("the payment QR setting");
  return found;
}

export async function deleteMediaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const path = pathField.safeParse(formData.get("path"));
  if (!path.success || path.data.startsWith("https://") || path.data.includes("..") || /[,()]/.test(path.data)) return { ok: false, message: "Unknown file." };
  const db = await createSessionClient();
  const usedBy = await mediaReferences(db, path.data);
  if (usedBy.length) return { ok: false, message: `Still used by ${usedBy.join(", ")}. Replace the image there first.` };
  const { data, error } = await db.storage.from(supabaseConfig.mediaBucket).remove([path.data]);
  if (error) {
    console.error("[admin] delete media:", error.message);
    return { ok: false, message: "Could not delete the file. Please try again." };
  }
  if (!data?.length) return { ok: false, message: "The file was not found or could not be deleted." };
  revalidatePath("/admin/media");
  return { ok: true, message: "File deleted." };
}
