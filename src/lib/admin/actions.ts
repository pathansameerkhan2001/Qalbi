"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";
import { STORE_TAG } from "@/lib/store/catalog";
import { settingSchemas, type SettingKey } from "@/lib/store/settings";
import { homepageSectionIds } from "@/lib/content/homepage";
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
  const removed = await db.from("product_images").delete().eq("product_id", productId);
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

/** Publish / unpublish from the product list. Publishing re-checks the stored price and photos on the server. */
export async function setProductPublishedAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (isShopifyConfigured()) return { ok: false, message: "Products are managed in Shopify while the store is connected." };
  const parsed = z.object({ id: z.uuid(), publish: z.enum(["true", "false"]) }).safeParse({ id: formData.get("id"), publish: formData.get("publish") });
  if (!parsed.success) return { ok: false, message: "Unknown product." };
  const publish = parsed.data.publish === "true";
  const db = await createSessionClient();
  if (publish) {
    const [product, images] = await Promise.all([
      db.from("products").select("name, price").eq("id", parsed.data.id).maybeSingle(),
      db.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", parsed.data.id),
    ]);
    if (product.error) return dbError("product", product.error);
    if (images.error) return dbError("product images", images.error);
    if (!product.data) return { ok: false, message: "Product not found." };
    const blockers = publishBlockers({ name: String(product.data.name ?? ""), price: Number(product.data.price), imageCount: images.count ?? 0 });
    if (blockers.length) return { ok: false, message: `Before publishing, ${blockers.join(" and ")}.` };
  }
  const { data, error } = await db.from("products").update({ is_published: publish }).eq("id", parsed.data.id).select("id");
  if (error) return dbError("product", error);
  if (!data?.length) return { ok: false, message: "Product not found or not editable." };
  refreshStore("/admin/products", "/", "/products");
  return { ok: true, message: publish ? "Published." : "Unpublished — hidden from customers." };
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
  const { error } = id ? await db.from("categories").update(fields).eq("id", id) : await db.from("categories").insert(fields);
  if (error) return dbError("category", error);
  refreshStore("/admin/categories", "/", "/products");
  return { ok: true, message: `Saved “${fields.name}”.` };
}

export async function deleteCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, message: "Unknown category." };
  const db = await createSessionClient();
  const { error } = await db.from("categories").delete().eq("id", id.data);
  if (error) {
    if (error.code === "23503") return { ok: false, message: "Move the products in this category to another category first." };
    return dbError("category", error);
  }
  refreshStore("/admin/categories", "/", "/products");
  return { ok: true, message: "Category deleted." };
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
