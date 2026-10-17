"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";
import { STORE_TAG } from "@/lib/store/catalog";
import { settingSchemas, type SettingKey } from "@/lib/store/settings";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { rateLimit } from "@/lib/server/rate-limit";
import { headers } from "next/headers";
import { requireAdmin } from "./auth";
import { orderStatuses, paymentStatuses } from "./data";

/**
 * Admin mutations. Every action starts with requireAdmin() (server-side check of
 * the Supabase session + admin_users) and writes with the user's own session, so
 * row level security also rejects anything a non-admin attempts.
 */

export interface ActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

const handleField = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
const pathField = z.string().trim().max(300).regex(/^(https:\/\/|[a-z0-9])[^\s<>"']*$/i, "Enter a media path such as products/serum.webp");
const optionalPath = z.union([pathField, z.literal("")]).transform((v) => v || null);
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const money = z.coerce.number().min(0, "Must be 0 or more").max(1_000_000);

function invalid(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
}

const columnLabels: Record<string, string> = {
  name: "Name",
  slug: "URL handle",
  price: "Price",
  compare_at_price: "Compare-at price",
  stock_quantity: "Units in stock",
  sku: "SKU",
  category_id: "Category",
  image_url: "Image path",
  sort_order: "Sort order",
};

/** Constraint violations caused by what the admin entered: shown to them, not logged as server errors. */
const inputErrorCodes = new Set(["23505", "23502", "23514", "23503"]);

/** Maps database errors (including the production tables' own constraints) to clear messages; logs only unexpected codes. */
function dbError(scope: string, error: { code?: string; message: string }): ActionState {
  if (!error.code || !inputErrorCodes.has(error.code)) console.error(`[admin] ${scope}:`, error.code ?? error.message);
  const column = /column "([a-z_]+)"/.exec(error.message)?.[1];
  const label = column ? (columnLabels[column] ?? column.replace(/_/g, " ")) : null;
  switch (error.code) {
    case "23505":
      return { ok: false, message: `That ${scope === "product" ? "URL handle or SKU" : "handle"} is already in use.` };
    case "23502":
      return { ok: false, message: label ? `${label} is required.` : "A required field is missing." };
    case "23514":
      return { ok: false, message: "A value is outside the range the database allows. Please check the numbers." };
    case "23503":
      return { ok: false, message: `This ${scope} is still linked to other records.` };
    case "42501":
      return { ok: false, message: "You don't have permission to do that." };
    case "PGRST205":
    case "42P01":
      return { ok: false, message: "The database setup for this section has not been applied yet." };
  }
  return { ok: false, message: `Could not save ${scope}. Please try again.` };
}

function refreshStore(...paths: string[]) {
  updateTag(STORE_TAG);
  for (const p of paths) revalidatePath(p);
}

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

const optionalUuid = z.union([z.uuid(), z.literal("")]).transform((v) => v || null);

const productSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  slug: handleField,
  name: z.string().trim().min(1, "Enter a name").max(120),
  description: z.string().trim().max(4000),
  price: money,
  compare_at_price: z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v)),
  stock_quantity: z.union([z.literal(""), z.coerce.number().int().min(0, "Must be 0 or more").max(100000)]).transform((v) => (v === "" ? null : v)),
  sku: z.string().trim().max(64).transform((v) => v || null),
  category_id: optionalUuid,
  is_published: checkbox,
  is_featured: checkbox,
  is_best_seller: checkbox,
  images: z.array(z.object({ path: pathField, alt: z.string().trim().max(200) })).max(20),
});

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
  });
  if (!parsed.success) return invalid(parsed.error);
  const { id, images: imageList, ...fields } = parsed.data;
  if (fields.compare_at_price !== null && fields.compare_at_price <= fields.price) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors: { compare_at_price: "Compare-at price must be higher than the price" } };
  }

  const db = await createSessionClient();
  const saved = id
    ? await db.from("products").update(fields).eq("id", id).select("id").single()
    : await db.from("products").insert(fields).select("id").single();
  if (saved.error) return dbError("product", saved.error);
  const productId = saved.data.id as string;

  const removed = await db.from("product_images").delete().eq("product_id", productId);
  if (removed.error) return dbError("product images", removed.error);
  if (imageList.length) {
    const inserted = await db
      .from("product_images")
      .insert(imageList.map((img, i) => ({ product_id: productId, image_url: img.path, alt_text: img.alt || null, sort_order: i, is_primary: i === 0 })));
    if (inserted.error) return dbError("product images", inserted.error);
  }

  refreshStore("/admin/products", "/", "/products");
  if (!id) redirect(`/admin/products/${productId}?saved=1`);
  return { ok: true, message: "Product saved." };
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const db = await createSessionClient();
  // Images first, so the delete never depends on how the image foreign key is defined.
  const images = await db.from("product_images").delete().eq("product_id", id.data);
  const { error } = images.error ? images : await db.from("products").delete().eq("id", id.data);
  if (error) console.error("[admin] delete product:", error.code);
  refreshStore("/admin/products", "/", "/products");
  redirect("/admin/products");
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
      image_url: optionalPath,
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
    case "hero":
      return { desktopPath: s("desktopPath") || null, mobilePath: s("mobilePath") || null, alt: s("alt") || "QALBI Naturals skincare" };
    case "instagram_reels":
      return s("lines")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, i) => {
          const [title, reelUrl, thumbnailPath] = line.split("|").map((p) => p.trim());
          return { id: `reel-${i}`, title, reelUrl, thumbnailPath };
        });
    case "trust_badges":
      return Object.fromEntries(f.getAll("verified").map((id) => [String(id), true]));
    case "featured":
      return { collectionHandle: s("collectionHandle") || "bestsellers" };
    case "brand_claims":
      return { verified: on("verified"), note: s("note") };
  }
}

export async function saveSettingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const key = String(formData.get("key") ?? "") as SettingKey;
  if (!(key in settingSchemas)) return { ok: false, message: "Unknown setting." };
  const parsed = settingSchemas[key].safeParse(settingFromForm(key, formData));
  if (!parsed.success) return { ok: false, message: `Please check this section: ${parsed.error.issues[0]?.message ?? "invalid value"}.` };
  if (key === "checkout") {
    const checkout = parsed.data as { phoneEnabled: boolean; qrImagePath: string | null };
    if (checkout.phoneEnabled && !checkout.qrImagePath) {
      return { ok: false, message: "Upload the real payment QR image in Media and enter its path before turning on UPI QR payment." };
    }
    if (checkout.qrImagePath && !pathField.safeParse(checkout.qrImagePath).success) return { ok: false, message: "Enter a valid media path for the QR image." };
  }
  if (key === "instagram_reels") {
    const bad = (parsed.data as { reelUrl: string }[]).find((r) => !/^https:\/\/(www\.)?instagram\.com\/(reel|p)\//.test(r.reelUrl));
    if (bad) return { ok: false, message: "Reel links must be real Instagram post or Reel URLs (https://www.instagram.com/reel/…)." };
  }
  const db = await createSessionClient();
  const existing = await db.from("store_settings").select("id").eq("setting_key", key).limit(1).maybeSingle();
  if (existing.error) return dbError("settings", existing.error);
  const { error } = existing.data
    ? await db.from("store_settings").update({ setting_value: parsed.data }).eq("id", existing.data.id)
    : await db.from("store_settings").insert({ setting_key: key, setting_value: parsed.data });
  if (error) return dbError("settings", error);
  refreshStore("/admin/settings", "/", "/checkout");
  return { ok: true, message: "Settings saved." };
}

// ---------------------------------------------------------------------------
// Media library
// ---------------------------------------------------------------------------

const MAX_BYTES = 5 * 1024 * 1024;

/** Detects the real image type from the file's first bytes (the browser-supplied type is not trusted). */
function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return { mime: "image/png", ext: "png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return { mime: "image/avif", ext: "avif" };
  return null;
}

const folderField = z.string().trim().toLowerCase().regex(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/, "Folder: lowercase letters, numbers, hyphens");

export async function uploadMediaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image to upload." };
  if (file.size > MAX_BYTES) return { ok: false, message: "Images must be 5 MB or smaller." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { ok: false, message: "Only JPEG, PNG, WebP or AVIF images can be uploaded." };

  const replacePath = String(formData.get("replacePath") ?? "").trim();
  let path: string;
  if (replacePath) {
    const valid = pathField.safeParse(replacePath);
    if (!valid.success || replacePath.startsWith("https://")) return { ok: false, message: "Invalid path to replace." };
    if (!replacePath.toLowerCase().endsWith(`.${type.ext}`) && !(type.ext === "jpg" && /\.jpe?g$/i.test(replacePath))) {
      return { ok: false, message: `The replacement must be the same file type (.${replacePath.split(".").pop()}).` };
    }
    path = replacePath;
  } else {
    const folder = folderField.safeParse(String(formData.get("folder") ?? "general") || "general");
    if (!folder.success) return { ok: false, message: folder.error.issues[0].message };
    const base =
      file.name
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "image";
    path = `uploads/${folder.data}/${base}-${crypto.randomUUID().slice(0, 8)}.${type.ext}`;
  }

  const db = await createSessionClient();
  const { error } = await db.storage.from(supabaseConfig.mediaBucket).upload(path, bytes, {
    contentType: type.mime,
    upsert: Boolean(replacePath),
    cacheControl: replacePath ? "300" : "31536000",
  });
  if (error) {
    console.error("[admin] upload:", error.message);
    return { ok: false, message: "Upload failed. Check that you are an administrator and the storage bucket exists." };
  }
  revalidatePath("/admin/media");
  return { ok: true, message: `Uploaded: ${path}` };
}

export async function deleteMediaAction(formData: FormData) {
  await requireAdmin();
  const path = pathField.safeParse(formData.get("path"));
  if (!path.success || path.data.startsWith("https://")) return;
  const db = await createSessionClient();
  const { error } = await db.storage.from(supabaseConfig.mediaBucket).remove([path.data]);
  if (error) console.error("[admin] delete media:", error.message);
  revalidatePath("/admin/media");
}
