"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { fromIstInput, isMediaPath, isSafeSiteLink, isSlug, normalizeReelUrl, slugify } from "@/lib/content/rules";
import { ingredientIcons } from "@/types/content";
import { requireAdmin } from "./auth";
import { checkbox, dbError, invalid, refreshStore, type ActionState } from "./action-helpers";

/**
 * Admin mutations for website content (hero slides, Instagram Reels, ingredients, blog posts).
 * Same pattern as actions.ts: requireAdmin() first, then writes with the
 * administrator's own session so row level security applies as well.
 */

const id = z.union([z.uuid(), z.literal("")]);
/** Optional text: trimmed, empty → null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => v || null);
const mediaPath = (message: string) => z.string().trim().refine(isMediaPath, message);
const sortOrder = z.coerce.number().int("Use a whole number").min(-1000).max(100000);
const field = (formData: FormData, key: string) => formData.get(key) ?? "";

// ---------------------------------------------------------------------------
// Hero slides
// ---------------------------------------------------------------------------

const heroSchema = z
  .object({
    id,
    heading: optionalText(90),
    subtitle: optionalText(200),
    button_label: optionalText(40),
    button_href: z
      .string()
      .trim()
      .refine((v) => v === "" || isSafeSiteLink(v), "Use a website path such as /products or a full https:// link")
      .transform((v) => v || null),
    desktop_image_path: mediaPath("Upload a desktop image"),
    mobile_image_path: mediaPath("Upload a mobile image"),
    alt_text: z.string().trim().min(1, "Describe the image for screen readers").max(200),
    sort_order: sortOrder,
    is_active: checkbox,
  })
  .refine((v) => (v.button_label === null) === (v.button_href === null), {
    path: ["button_href"],
    message: "A button needs both a label and a destination",
  });

export async function saveHeroSlideAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = heroSchema.safeParse(
    Object.fromEntries(
      ["id", "heading", "subtitle", "button_label", "button_href", "desktop_image_path", "mobile_image_path", "alt_text", "sort_order", "is_active"].map((k) => [k, field(formData, k)]),
    ),
  );
  if (!parsed.success) return invalid(parsed.error);
  const { id: slideId, ...fields } = parsed.data;
  const db = await createSessionClient();
  const { error } = slideId ? await db.from("hero_slides").update(fields).eq("id", slideId) : await db.from("hero_slides").insert(fields);
  if (error) return dbError("hero slide", error);
  refreshStore("/admin/hero", "/");
  return { ok: true, message: slideId ? "Slide saved." : fields.is_active ? "Slide added and published." : "Slide added as hidden. Tick “Show on the website” to publish it." };
}

export async function deleteHeroSlideAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const slideId = z.uuid().safeParse(formData.get("id"));
  if (!slideId.success) return { ok: false, message: "Unknown slide." };
  const db = await createSessionClient();
  const { error } = await db.from("hero_slides").delete().eq("id", slideId.data);
  if (error) return dbError("hero slide", error);
  refreshStore("/admin/hero", "/");
  return { ok: true, message: "Slide deleted. Its images stay in the Media library." };
}

// ---------------------------------------------------------------------------
// Ingredients (homepage carousel and /ingredients)
// ---------------------------------------------------------------------------

const ingredientSchema = z
  .object({
    id,
    name: z.string().trim().min(1, "Enter the ingredient name").max(40, "Keep the name under 40 characters"),
    slug: z
      .string()
      .trim()
      .transform((v) => slugify(v))
      .refine((v) => v.length > 0 && v.length <= 60 && isSlug(v), "Use lowercase letters, numbers and hyphens"),
    description: z.string().trim().min(1, "Add a short description").max(160, "Keep the description under 160 characters"),
    image_path: z
      .string()
      .trim()
      .refine((v) => v === "" || isMediaPath(v), "Upload an image or leave it empty")
      .transform((v) => v || null),
    image_alt: optionalText(200),
    icon: z.enum(ingredientIcons, "Choose an icon"),
    product_handles: z.array(z.string().refine(isSlug)).max(20),
    sort_order: sortOrder,
    is_active: checkbox,
  })
  .refine((v) => v.image_path === null || v.image_alt !== null, { path: ["image_alt"], message: "Describe the photo for screen readers" });

export async function saveIngredientAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "");
  const parsed = ingredientSchema.safeParse({
    ...Object.fromEntries(["id", "name", "description", "image_path", "image_alt", "icon", "sort_order", "is_active"].map((k) => [k, field(formData, k)])),
    slug: String(formData.get("slug") ?? "") || name,
    product_handles: formData.getAll("product_handles").map(String),
  });
  if (!parsed.success) return invalid(parsed.error);
  const { id: ingredientId, ...fields } = parsed.data;
  const db = await createSessionClient();
  const { error } = ingredientId ? await db.from("ingredients").update(fields).eq("id", ingredientId) : await db.from("ingredients").insert(fields);
  if (error) return dbError("ingredient", error, "An ingredient with that URL handle already exists.");
  refreshStore("/admin/ingredients", "/", "/ingredients");
  return { ok: true, message: ingredientId ? "Ingredient saved." : fields.is_active ? "Ingredient added and published." : "Ingredient added as hidden. Tick “Show on the website” to publish it." };
}

export async function deleteIngredientAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const ingredientId = z.uuid().safeParse(formData.get("id"));
  if (!ingredientId.success) return { ok: false, message: "Unknown ingredient." };
  const db = await createSessionClient();
  const { error } = await db.from("ingredients").delete().eq("id", ingredientId.data);
  if (error) return dbError("ingredient", error);
  refreshStore("/admin/ingredients", "/", "/ingredients");
  return { ok: true, message: "Ingredient deleted. Its photo stays in the Media library." };
}

// ---------------------------------------------------------------------------
// Instagram Reels (manual: a public Reel link + an uploaded thumbnail)
// ---------------------------------------------------------------------------

const reelSchema = z.object({
  id,
  reel_url: z
    .string()
    .transform((v) => normalizeReelUrl(v) ?? "")
    .refine(Boolean, "Paste a public Instagram Reel or post link, e.g. https://www.instagram.com/reel/…"),
  caption: z.string().trim().min(1, "Add a short caption").max(80, "Keep the caption under 80 characters"),
  thumbnail_path: mediaPath("Upload a thumbnail image"),
  sort_order: sortOrder,
  is_published: checkbox,
});

export async function saveReelAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = reelSchema.safeParse(Object.fromEntries(["id", "reel_url", "caption", "thumbnail_path", "sort_order", "is_published"].map((k) => [k, field(formData, k)])));
  if (!parsed.success) return invalid(parsed.error);
  const { id: reelId, ...fields } = parsed.data;
  const db = await createSessionClient();
  const { error } = reelId ? await db.from("instagram_reels").update(fields).eq("id", reelId) : await db.from("instagram_reels").insert(fields);
  if (error) return dbError("Reel", error, "That Reel has already been added.");
  refreshStore("/admin/reels", "/");
  return { ok: true, message: reelId ? "Reel saved." : fields.is_published ? "Reel added and published." : "Reel added as hidden. Tick “Show on the website” to publish it." };
}

export async function deleteReelAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const reelId = z.uuid().safeParse(formData.get("id"));
  if (!reelId.success) return { ok: false, message: "Unknown Reel." };
  const db = await createSessionClient();
  const { error } = await db.from("instagram_reels").delete().eq("id", reelId.data);
  if (error) return dbError("Reel", error);
  refreshStore("/admin/reels", "/");
  return { ok: true, message: "Reel deleted. Its thumbnail stays in the Media library." };
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

const blogSchema = z.object({
  id,
  title: z.string().trim().min(1, "Enter a title").max(140, "Keep the title under 140 characters"),
  slug: z.string().trim().toLowerCase(),
  excerpt: z.string().trim().max(320, "Keep the excerpt under 320 characters"),
  body: z.string().trim().max(50000, "The article is too long (50,000 characters maximum)"),
  category: optionalText(40),
  author: optionalText(80),
  cover_image_path: z
    .string()
    .trim()
    .refine((v) => v === "" || isMediaPath(v), "Upload a cover image")
    .transform((v) => v || null),
  cover_alt: optionalText(200),
  seo_title: optionalText(120),
  seo_description: optionalText(320),
  published_at: z.string().trim(),
  intent: z.enum(["draft", "publish"]),
});

/**
 * Saves a post. intent "publish" makes it public (immediately, or at the chosen
 * date); intent "draft" saves it hidden — also used to unpublish.
 */
export async function saveBlogPostAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = blogSchema.safeParse(
    Object.fromEntries(
      ["id", "title", "slug", "excerpt", "body", "category", "author", "cover_image_path", "cover_alt", "seo_title", "seo_description", "published_at", "intent"].map((k) => [k, field(formData, k)]),
    ),
  );
  if (!parsed.success) return invalid(parsed.error);
  const { id: postId, intent, published_at, ...fields } = parsed.data;

  const slug = fields.slug || slugify(fields.title);
  if (!isSlug(slug)) return { ok: false, message: "Please check the highlighted fields.", fieldErrors: { slug: "Use lowercase letters, numbers and hyphens" } };

  let publishedAt: string | null = null;
  if (published_at) {
    publishedAt = fromIstInput(published_at);
    if (!publishedAt) return { ok: false, message: "Please check the highlighted fields.", fieldErrors: { published_at: "Enter a valid date and time" } };
  }

  const publishing = intent === "publish";
  if (publishing) {
    const missing: Record<string, string> = {};
    if (!fields.cover_image_path) missing.cover_image_path = "A cover image is required to publish";
    if (!fields.excerpt) missing.excerpt = "An excerpt is required to publish";
    if (!fields.body) missing.body = "Write the article before publishing";
    if (Object.keys(missing).length) return { ok: false, message: "Complete these fields before publishing. You can still save as a draft.", fieldErrors: missing };
  }

  const row = {
    ...fields,
    slug,
    status: publishing ? "published" : "draft",
    // Publishing without a date publishes now; drafts keep their chosen date (if any).
    published_at: publishedAt ?? (publishing ? new Date().toISOString() : null),
  };
  const db = await createSessionClient();
  const saved = postId
    ? await db.from("blog_posts").update(row).eq("id", postId).select("id").single()
    : await db.from("blog_posts").insert(row).select("id").single();
  if (saved.error) return dbError("blog post", saved.error, "Another post already uses that URL handle.");

  refreshStore("/admin/blog", `/admin/blog/${saved.data.id}`, "/journal", `/journal/${slug}`, "/");
  if (!postId) redirect(`/admin/blog/${saved.data.id}?saved=1`);
  const scheduled = publishing && new Date(row.published_at!).getTime() > Date.now();
  return { ok: true, message: publishing ? (scheduled ? "Saved. The post will appear on the website at the chosen time." : "Published.") : "Saved as a draft (not visible on the website)." };
}

export async function deleteBlogPostAction(formData: FormData) {
  await requireAdmin();
  const postId = z.uuid().safeParse(formData.get("id"));
  if (!postId.success) return;
  const db = await createSessionClient();
  const { error } = await db.from("blog_posts").delete().eq("id", postId.data);
  if (error) {
    console.error("[admin] delete blog post:", error.code);
    return;
  }
  refreshStore("/admin/blog", "/journal", "/");
  redirect("/admin/blog?deleted=1");
}
