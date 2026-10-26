"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { fromIstInput, isMediaPath, isSafeSiteLink, isSlug, normalizeReelUrl, slugify } from "@/lib/content/rules";
import { ingredientIcons } from "@/types/content";
import { mediaUrl } from "@/lib/assets";
import { HERO_VIDEO_TYPES, heroVideoFileProblem, heroVideoMaxBytes } from "@/lib/content/hero";
import { supabaseConfig } from "@/lib/supabase/config";
import { heroSettingsSchema } from "@/lib/store/settings";
import { builtInHeroFiles } from "@/lib/store/hero";
import { requireAdmin } from "./auth";
import { probeVideo } from "./hero-media";
import { mediaReferences } from "./media-references";
import { moveInOrder } from "./ordering";
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
/** Row level security turns a forbidden write into "0 rows" without an error: never report that as saved. */
const noRows = (scope: string): ActionState => ({ ok: false, message: `The database did not change this ${scope} — it may have been deleted, or this account may not have administrator rights. Reload the page.` });

// ---------------------------------------------------------------------------
// Hero slides
// ---------------------------------------------------------------------------

const heroText = {
  heading: optionalText(90),
  subtitle: optionalText(200),
  button_label: optionalText(40),
  button_href: z
    .string()
    .trim()
    .refine((v) => v === "" || isSafeSiteLink(v), "Use a website path such as /products or a full https:// link")
    .transform((v) => v || null),
  alt_text: z.string().trim().min(1, "Describe the image or video for screen readers").max(200),
  sort_order: sortOrder,
  is_active: checkbox,
};
const optionalMediaPath = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || isMediaPath(v), message)
    .transform((v) => v || null);
const videoPath = (message: string) => z.string().trim().refine((v) => isMediaPath(v) && /\.(mp4|webm)$/.test(v), message);
const hasButtonPair = (v: { button_label: string | null; button_href: string | null }) => (v.button_label === null) === (v.button_href === null);
const buttonPairError = { path: ["button_href"], message: "A button needs both a label and a destination" };

/** Image slide: both images required. Video slide: the desktop video required; mobile video and both posters optional. */
const imageSlideSchema = z
  .object({
    id,
    media_type: z.literal("image"),
    ...heroText,
    desktop_image_path: mediaPath("Upload a desktop image"),
    mobile_image_path: mediaPath("Upload a mobile image"),
  })
  .refine(hasButtonPair, buttonPairError);
const videoSlideSchema = z
  .object({
    id,
    media_type: z.literal("video"),
    ...heroText,
    desktop_video_path: videoPath("Upload a desktop video (MP4)"),
    mobile_video_path: z.union([z.literal("").transform(() => null), videoPath("Upload an MP4, or leave the mobile video empty")]),
    desktop_image_path: optionalMediaPath("Upload a desktop poster, or leave it empty"),
    mobile_image_path: optionalMediaPath("Upload a mobile poster, or leave it empty"),
  })
  .refine(hasButtonPair, buttonPairError)
  .refine((v) => !v.mobile_image_path || v.desktop_image_path, { path: ["desktop_image_path"], message: "Add a desktop poster as well (it is also used on tablets)" });

const HERO_FIELDS = ["id", "heading", "subtitle", "button_label", "button_href", "desktop_image_path", "mobile_image_path", "desktop_video_path", "mobile_video_path", "alt_text", "sort_order", "is_active"];
const missingColumn = (error: { code?: string } | null) => error?.code === "42703" || error?.code === "PGRST204";
const HERO_VIDEO_MIGRATION = "Video slides need the database update supabase/migrations/20261026000000_hero_video_and_product_order.sql. Run it once in Supabase → SQL Editor, then save again.";

export async function saveHeroSlideAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const input = { ...Object.fromEntries(HERO_FIELDS.map((k) => [k, field(formData, k)])), media_type: formData.get("media_type") === "video" ? "video" : "image" };
  const parsed = input.media_type === "video" ? videoSlideSchema.safeParse(input) : imageSlideSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id: slideId, ...fields } = parsed.data;
  if (fields.media_type === "video") {
    // A path the bucket can't serve would leave visitors on the poster (or skip the slide): refuse it before saving.
    for (const [name, label, path] of [
      ["desktop_video_path", "Desktop video", fields.desktop_video_path],
      ["mobile_video_path", "Mobile video", fields.mobile_video_path],
    ] as const) {
      const problem = path ? (await probeVideo(path)).problem : null;
      if (problem) return { ok: false, message: `${label}: ${problem}. Nothing was saved.`, fieldErrors: { [name]: `${problem} (${path})` } };
    }
  }
  const row: Record<string, unknown> = fields.media_type === "video" ? fields : { ...fields, desktop_video_path: null, mobile_video_path: null };
  const db = await createSessionClient();
  const write = (values: Record<string, unknown>) => (slideId ? db.from("hero_slides").update(values).eq("id", slideId).select("id") : db.from("hero_slides").insert(values).select("id"));
  let { data, error } = await write(row);
  if (missingColumn(error)) {
    if (fields.media_type === "video") return { ok: false, message: HERO_VIDEO_MIGRATION };
    // Before the video migration, image slides are saved with the original columns.
    const imageOnly = Object.fromEntries(Object.entries(row).filter(([k]) => !["media_type", "desktop_video_path", "mobile_video_path"].includes(k)));
    ({ data, error } = await write(imageOnly));
  }
  if (error) return dbError("hero slide", error);
  if (!data?.length) return noRows("slide");
  refreshStore("/admin/hero", "/");
  const kind = fields.media_type === "video" ? "Video slide" : "Slide";
  return { ok: true, message: slideId ? `${kind} saved.` : fields.is_active ? `${kind} added and shown on the homepage.` : `${kind} added as hidden. Tick “Show on the website” to publish it.` };
}

/** Folder for admin-uploaded hero videos. */
const HERO_VIDEO_FOLDER = "uploads/hero/videos/";

export type VideoUploadTicket = { ok: true; path: string; uploadUrl: string } | { ok: false; message: string };

/**
 * Step 1 of a hero video upload: checks the file's declared type and size and
 * returns a one-time signed upload URL for a new object (never an existing
 * one). The browser then sends the file straight to Supabase Storage — videos
 * are too large for a server action — and the admin-only storage policies
 * apply, because the URL is created with the administrator's own session.
 */
export async function startHeroVideoUploadAction(file: { name: string; type: string; size: number }): Promise<VideoUploadTicket> {
  await requireAdmin();
  const problem = heroVideoFileProblem({ type: String(file?.type ?? ""), size: Number(file?.size ?? 0) });
  if (problem) return { ok: false, message: problem };
  const base = slugify(String(file.name ?? "").replace(/\.[^.]+$/, "")).slice(0, 60) || "hero-video";
  const path = `${HERO_VIDEO_FOLDER}${base}-${crypto.randomUUID().slice(0, 8)}.${HERO_VIDEO_TYPES[file.type]}`;
  const db = await createSessionClient();
  const { data, error } = await db.storage.from(supabaseConfig.mediaBucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[admin] video upload url:", error?.message);
    return { ok: false, message: "The media bucket refused the upload. Check that you are signed in as an administrator." };
  }
  return { ok: true, path, uploadUrl: data.signedUrl };
}

/**
 * Step 2: verifies the uploaded object on the server — it exists, is a real
 * MP4/WebM (its first bytes, not the browser's claim) and within the size
 * limit. A file that fails is deleted again.
 */
export async function finishHeroVideoUploadAction(path: string): Promise<ActionState> {
  await requireAdmin();
  if (typeof path !== "string" || !path.startsWith(HERO_VIDEO_FOLDER) || !isMediaPath(path)) return { ok: false, message: "Unknown upload." };
  const probe = await probeVideo(path);
  const max = heroVideoMaxBytes();
  const problem = probe.problem ?? (probe.bytes !== null && probe.bytes > max ? `the file is larger than ${(max / 1048576).toFixed(0)} MB` : null);
  if (problem) {
    const db = await createSessionClient();
    await db.storage.from(supabaseConfig.mediaBucket).remove([path]);
    return { ok: false, message: `Upload rejected: ${problem}.` };
  }
  return { ok: true, message: `Video uploaded (${((probe.bytes ?? 0) / 1048576).toFixed(1)} MB). Save the slide to use it.`, path };
}

export async function deleteHeroSlideAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const slideId = z.uuid().safeParse(formData.get("id"));
  if (!slideId.success) return { ok: false, message: "Unknown slide." };
  const db = await createSessionClient();
  const { data, error } = await db.from("hero_slides").delete().eq("id", slideId.data).select("*");
  if (error) return dbError("hero slide", error);
  if (!data?.length) return noRows("slide");
  refreshStore("/admin/hero", "/");

  // Clean up the slide's own uploads: only files under uploads/ (never the built-in website assets) that nothing else still uses.
  const row = data[0] as Record<string, unknown>;
  const paths = [
    ...new Set(["desktop_image_path", "mobile_image_path", "desktop_video_path", "mobile_video_path"].map((k) => row[k]).filter((p): p is string => typeof p === "string" && p.startsWith("uploads/"))),
  ];
  const unused: string[] = [];
  for (const path of paths) if ((await mediaReferences(db, path)).length === 0) unused.push(path);
  const kept = paths.length - unused.length;
  let removed = 0;
  if (unused.length) {
    const result = await db.storage.from(supabaseConfig.mediaBucket).remove(unused);
    if (result.error) console.error("[admin] hero clean-up:", result.error.message);
    else removed = result.data?.length ?? 0;
  }
  revalidatePath("/admin/media");
  const notes = [
    removed ? `${removed} unused file${removed === 1 ? "" : "s"} removed from the Media library` : "",
    kept ? `${kept} file${kept === 1 ? " is" : "s are"} kept because ${kept === 1 ? "it is" : "they are"} used elsewhere` : "",
  ].filter(Boolean);
  return { ok: true, message: `Slide deleted.${notes.length ? ` ${notes.join("; ")}.` : ""}` };
}

/** Shows or hides a slide without opening its editor. */
export async function setHeroSlideActiveAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) }).safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return { ok: false, message: "Unknown slide." };
  const active = parsed.data.active === "true";
  const db = await createSessionClient();
  const { data, error } = await db.from("hero_slides").update({ is_active: active }).eq("id", parsed.data.id).select("is_active");
  if (error) return dbError("hero slide", error);
  if (!data?.length) return noRows("slide");
  refreshStore("/admin/hero", "/");
  return { ok: true, message: active ? "Slide shown on the homepage." : "Slide hidden from the homepage." };
}

/** Swaps a slide with its neighbour and renumbers the order 10, 20, 30… (ties keep their creation order, as on the homepage). */
export async function moveHeroSlideAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }).safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) return { ok: false, message: "Unknown slide." };
  const db = await createSessionClient();
  const { data, error } = await db.from("hero_slides").select("id, sort_order").order("sort_order").order("created_at");
  if (error) return dbError("hero slide", error);
  const changes = moveInOrder((data ?? []).map((s) => ({ id: s.id as string, sort: s.sort_order as number | null })), parsed.data.id, parsed.data.direction);
  if (!changes) return { ok: false, message: "Slide not found. Reload the page." };
  if (!changes.length) return { ok: true, message: "" };
  const results = await Promise.all(changes.map((s) => db.from("hero_slides").update({ sort_order: s.sort }).eq("id", s.id).select("id")));
  const failed = results.find((r) => r.error || !r.data?.length);
  if (failed) return failed.error ? dbError("hero slide", failed.error) : noRows("slide order");
  refreshStore("/admin/hero", "/");
  return { ok: true, message: "" };
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
  const { data, error } = ingredientId ? await db.from("ingredients").update(fields).eq("id", ingredientId).select("id") : await db.from("ingredients").insert(fields).select("id");
  if (error) return dbError("ingredient", error, "An ingredient with that URL handle already exists.");
  if (!data?.length) return noRows("ingredient");
  refreshStore("/admin/ingredients", "/", "/ingredients");
  return { ok: true, message: ingredientId ? "Ingredient saved." : fields.is_active ? "Ingredient added and published." : "Ingredient added as hidden. Tick “Show on the website” to publish it." };
}

export async function deleteIngredientAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const ingredientId = z.uuid().safeParse(formData.get("id"));
  if (!ingredientId.success) return { ok: false, message: "Unknown ingredient." };
  const db = await createSessionClient();
  const { data, error } = await db.from("ingredients").delete().eq("id", ingredientId.data).select("id");
  if (error) return dbError("ingredient", error);
  if (!data?.length) return noRows("ingredient");
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
  const missing = await missingStorageImage(fields.thumbnail_path);
  if (missing) return { ok: false, message: missing, fieldErrors: { thumbnail_path: missing } };
  const db = await createSessionClient();
  const { data, error } = reelId ? await db.from("instagram_reels").update(fields).eq("id", reelId).select("id") : await db.from("instagram_reels").insert(fields).select("id");
  if (error) return dbError("Reel", error, "That Reel has already been added.");
  if (!data?.length) return noRows("Reel");
  refreshStore("/admin/reels", "/");
  return { ok: true, message: reelId ? "Reel saved." : fields.is_published ? "Reel added and published." : "Reel added as hidden. Tick “Show on the website” to publish it." };
}

export async function deleteReelAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const reelId = z.uuid().safeParse(formData.get("id"));
  if (!reelId.success) return { ok: false, message: "Unknown Reel." };
  const db = await createSessionClient();
  const { data, error } = await db.from("instagram_reels").delete().eq("id", reelId.data).select("id");
  if (error) return dbError("Reel", error);
  if (!data?.length) return noRows("Reel");
  refreshStore("/admin/reels", "/");
  return { ok: true, message: "Reel deleted. Its thumbnail stays in the Media library." };
}

/** Show / hide a Reel from the list without opening its form. */
export async function setReelPublishedAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), publish: z.enum(["true", "false"]) }).safeParse({ id: formData.get("id"), publish: formData.get("publish") });
  if (!parsed.success) return { ok: false, message: "Unknown Reel." };
  const publish = parsed.data.publish === "true";
  const db = await createSessionClient();
  if (publish) {
    const current = await db.from("instagram_reels").select("thumbnail_path").eq("id", parsed.data.id).maybeSingle();
    if (current.error) return dbError("Reel", current.error);
    const missing = current.data ? await missingStorageImage(current.data.thumbnail_path as string) : null;
    if (missing) return { ok: false, message: `${missing} Upload a new thumbnail before showing this Reel.` };
  }
  const { data, error } = await db.from("instagram_reels").update({ is_published: publish }).eq("id", parsed.data.id).select("caption, is_published");
  if (error) return dbError("Reel", error);
  if (!data?.length) return noRows("Reel");
  if (data[0].is_published !== publish) return { ok: false, message: "The database did not change the Reel's visibility. Please try again." };
  refreshStore("/admin/reels", "/");
  return { ok: true, message: publish ? `“${data[0].caption}” is live on the homepage.` : `“${data[0].caption}” is hidden.` };
}

/** Moves a Reel one place up or down, then renumbers all Reels 10, 20, 30… */
export async function moveReelAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }).safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) return { ok: false, message: "Unknown Reel." };
  const db = await createSessionClient();
  const { data, error } = await db.from("instagram_reels").select("id, sort_order").order("sort_order").order("created_at");
  if (error) return dbError("Reel", error);
  const list = data ?? [];
  const from = list.findIndex((r) => r.id === parsed.data.id);
  const to = from + (parsed.data.direction === "up" ? -1 : 1);
  if (from < 0) return { ok: false, message: "Reel not found. Reload the page." };
  if (to < 0 || to >= list.length) return { ok: true, message: "" };
  [list[from], list[to]] = [list[to], list[from]];
  const changes = list.map((r, i) => ({ id: r.id as string, sort: (i + 1) * 10, before: r.sort_order as number })).filter((r) => r.sort !== r.before);
  const results = await Promise.all(changes.map((r) => db.from("instagram_reels").update({ sort_order: r.sort }).eq("id", r.id).select("id")));
  const failed = results.find((r) => r.error || !r.data?.length);
  if (failed) return failed.error ? dbError("Reel", failed.error) : noRows("Reel order");
  refreshStore("/admin/reels", "/");
  return { ok: true, message: "" };
}

/**
 * For images stored in Supabase Storage (uploads/…): a message when the file is
 * definitely missing, so a Reel is never saved with a broken thumbnail. Website
 * assets (served from this deployment) and network hiccups are not blocked.
 */
async function missingStorageImage(path: string): Promise<string | null> {
  if (!path.startsWith("uploads/")) return null;
  try {
    const res = await fetch(mediaUrl(path), { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(4000) });
    return res.status === 404 || res.status === 400 ? "That thumbnail file was not found in the Media library." : null;
  } catch {
    return null;
  }
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

// ---------------------------------------------------------------------------
// Built-in hero media (src/data/images.ts) — /admin/hero → Built-in media
// ---------------------------------------------------------------------------

type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;

/** Reads, changes and saves the list of built-in files taken off the homepage (store setting `hero`). */
async function updateRemovedBuiltIn(db: SessionClient, change: (list: Set<string>) => void): Promise<ActionState | null> {
  const existing = await db.from("store_settings").select("id, setting_value").eq("setting_key", "hero").limit(1).maybeSingle();
  if (existing.error) return dbError("settings", existing.error);
  const current = heroSettingsSchema.safeParse(existing.data?.setting_value ?? {});
  const list = new Set(current.success ? current.data.removedBuiltIn : []);
  change(list);
  const value = { removedBuiltIn: [...list] };
  const { data, error } = existing.data
    ? await db.from("store_settings").update({ setting_value: value }).eq("id", existing.data.id).select("id")
    : await db.from("store_settings").insert({ setting_key: "hero", setting_value: value }).select("id");
  if (error) return dbError("settings", error);
  if (!data?.length) return noRows("homepage setting");
  return null;
}

const builtInFile = (path: unknown) => (typeof path === "string" ? builtInHeroFiles().find((f) => f.path === path) : undefined);

/**
 * Takes a built-in hero file off the homepage, or puts it back. The file
 * itself is not touched; the homepage simply stops (or starts) using it.
 * A bucket file that has been deleted cannot be put back.
 */
export async function setBuiltInHeroMediaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = builtInFile(formData.get("path"));
  if (!file) return { ok: false, message: "Unknown built-in file." };
  const show = formData.get("show") === "true";
  if (show && file.location === "bucket" && (await probeVideo(file.path)).missing) {
    return { ok: false, message: `${file.path} is no longer in the media bucket, so it can't be shown again. Add a video slide with a new file instead.` };
  }
  const db = await createSessionClient();
  const failed = await updateRemovedBuiltIn(db, (list) => (show ? list.delete(file.path) : list.add(file.path)));
  if (failed) return failed;
  refreshStore("/admin/hero", "/");
  return { ok: true, message: show ? `${file.path} is back on the homepage.` : `${file.path} is no longer used on the homepage. The file itself was not deleted.` };
}

/**
 * Permanently deletes a built-in hero file that lives in the media bucket:
 * first the homepage stops using it (so nothing ever points at a missing
 * file), then exactly that one object is removed with the administrator's own
 * session (admin-only storage policy). Success is reported only when Storage
 * confirms the removal. Files that are part of the website itself
 * (public/assets) are refused: they ship with every deploy and can't be
 * deleted from a running website.
 */
export async function deleteBuiltInHeroMediaAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = builtInFile(formData.get("path"));
  if (!file) return { ok: false, message: "Unknown built-in file." };
  if (file.location !== "bucket") {
    return {
      ok: false,
      message: `${file.path} is one of the website's own files (public/assets), deployed with the site, so it can't be deleted from the admin panel. Use “Remove from homepage” instead; to delete the file itself, remove it from the project and redeploy.`,
    };
  }
  const db = await createSessionClient();
  const usedBy = await mediaReferences(db, file.path);
  if (usedBy.length) return { ok: false, message: `${file.path} is also used by ${usedBy.join(", ")}. Change that first; nothing was deleted.` };

  const failed = await updateRemovedBuiltIn(db, (list) => list.add(file.path));
  if (failed) return { ...failed, message: `Nothing was deleted: ${failed.message}` };
  refreshStore("/admin/hero", "/");
  revalidatePath("/admin/media");

  const { data, error } = await db.storage.from(supabaseConfig.mediaBucket).remove([file.path]);
  if (error) {
    console.error("[admin] delete built-in hero file:", error.message);
    return { ok: false, message: `${file.path} is no longer used on the homepage, but the media bucket refused to delete the file (${error.message}). Check that you are signed in as an administrator, then try again.` };
  }
  if (!data?.length) {
    return { ok: true, message: `${file.path} was not in the media bucket (already deleted). The homepage no longer refers to it.` };
  }
  return { ok: true, message: `Deleted ${file.path} from the media bucket and removed it from the homepage. Browsers and the CDN may still hold a cached copy for up to an hour.` };
}
