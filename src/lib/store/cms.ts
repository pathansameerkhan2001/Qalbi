import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ingredientIcons, type IngredientIcon, type JournalArticle } from "@/types/content";
import { mediaUrl } from "@/lib/assets";
import { parseBlogBody, readingMinutes } from "@/lib/content/rules";
import { STORE_TAG, StoreQueryError } from "./catalog";

/**
 * Admin-managed content tables (supabase/migrations/20261019000000_content_management.sql).
 * Storefront readers use the visitor client, so row level security returns only
 * active / published rows; admin readers pass the signed-in session client.
 * Until the migration has been applied, storefront readers return [] and the
 * website keeps its built-in content.
 */

export interface HeroSlideRow {
  id: string;
  heading: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  buttonHref: string | null;
  mediaType: "image" | "video";
  /** Image slides: the images (always both). Video slides: the optional posters. */
  desktopImagePath: string | null;
  mobileImagePath: string | null;
  /** Video slides only; the mobile video is optional (phones then get the desktop one). */
  desktopVideoPath: string | null;
  mobileVideoPath: string | null;
  alt: string;
  sort: number;
  active: boolean;
}

export interface ReelRow {
  id: string;
  reelUrl: string;
  caption: string;
  thumbnailPath: string;
  sort: number;
  published: boolean;
}

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string | null;
  author: string | null;
  coverImagePath: string | null;
  coverAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  imagePath: string | null;
  imageAlt: string | null;
  icon: IngredientIcon;
  productHandles: string[];
  sort: number;
  active: boolean;
}

const HERO_COLUMNS = "id, heading, subtitle, button_label, button_href, desktop_image_path, mobile_image_path, alt_text, sort_order, is_active";
/** Video columns (supabase/migrations/20261026000000_hero_video_and_product_order.sql). */
const HERO_VIDEO_COLUMNS = `${HERO_COLUMNS}, media_type, desktop_video_path, mobile_video_path`;
/** Undefined column: a migration has not been applied yet. */
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);
const REEL_COLUMNS = "id, reel_url, caption, thumbnail_path, sort_order, is_published";
const POST_COLUMNS = "id, slug, title, excerpt, body, category, author, cover_image_path, cover_alt, seo_title, seo_description, status, published_at, created_at, updated_at";

const INGREDIENT_COLUMNS = "id, slug, name, description, image_path, image_alt, icon, product_handles, sort_order, is_active";

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : null);

const toHero = (r: Row): HeroSlideRow => ({
  id: String(r.id),
  heading: str(r.heading),
  subtitle: str(r.subtitle),
  buttonLabel: str(r.button_label),
  buttonHref: str(r.button_href),
  mediaType: r.media_type === "video" ? "video" : "image",
  desktopImagePath: str(r.desktop_image_path),
  mobileImagePath: str(r.mobile_image_path),
  desktopVideoPath: str(r.desktop_video_path),
  mobileVideoPath: str(r.mobile_video_path),
  alt: String(r.alt_text),
  sort: Number(r.sort_order ?? 0),
  active: r.is_active === true,
});

const toReel = (r: Row): ReelRow => ({
  id: String(r.id),
  reelUrl: String(r.reel_url),
  caption: String(r.caption),
  thumbnailPath: String(r.thumbnail_path),
  sort: Number(r.sort_order ?? 0),
  published: r.is_published === true,
});

const toIngredient = (r: Row): IngredientRow => ({
  id: String(r.id),
  slug: String(r.slug),
  name: String(r.name),
  description: String(r.description ?? ""),
  imagePath: str(r.image_path),
  imageAlt: str(r.image_alt),
  icon: (ingredientIcons as readonly string[]).includes(String(r.icon)) ? (r.icon as IngredientIcon) : "leaf",
  productHandles: Array.isArray(r.product_handles) ? r.product_handles.map(String) : [],
  sort: Number(r.sort_order ?? 0),
  active: r.is_active === true,
});

const toPost = (r: Row): BlogPostRow => ({
  id: String(r.id),
  slug: String(r.slug),
  title: String(r.title),
  excerpt: String(r.excerpt ?? ""),
  body: String(r.body ?? ""),
  category: str(r.category),
  author: str(r.author),
  coverImagePath: str(r.cover_image_path),
  coverAlt: str(r.cover_alt),
  seoTitle: str(r.seo_title),
  seoDescription: str(r.seo_description),
  status: r.status === "published" ? "published" : "draft",
  publishedAt: str(r.published_at),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

// ---------------------------------------------------------------------------
// Queries (RLS decides what the given client may see)
// ---------------------------------------------------------------------------

/** Hero slides in display order. Before the video migration every slide is read as an image slide. */
export async function queryHeroSlides(db: SupabaseClient): Promise<HeroSlideRow[]> {
  const read = (columns: string) => db.from("hero_slides").select(columns).order("sort_order").order("created_at");
  let result = await read(HERO_VIDEO_COLUMNS);
  if (result.error?.code && MISSING_COLUMN.has(result.error.code)) result = await read(HERO_COLUMNS);
  if (result.error) throw new StoreQueryError("hero slides", result.error);
  return ((result.data ?? []) as unknown as Row[]).map(toHero);
}

/** True once the hero video columns exist (admin: video slides can be saved). */
export async function heroVideoReady(db: SupabaseClient): Promise<boolean> {
  const { error } = await db.from("hero_slides").select("media_type").limit(1);
  return !error;
}

export async function queryReels(db: SupabaseClient): Promise<ReelRow[]> {
  const { data, error } = await db.from("instagram_reels").select(REEL_COLUMNS).order("sort_order").order("created_at");
  if (error) throw new StoreQueryError("Instagram Reels", error);
  return (data ?? []).map(toReel);
}

export async function queryIngredients(db: SupabaseClient): Promise<IngredientRow[]> {
  const { data, error } = await db.from("ingredients").select(INGREDIENT_COLUMNS).order("sort_order").order("created_at");
  if (error) throw new StoreQueryError("ingredients", error);
  return (data ?? []).map(toIngredient);
}

export async function queryBlogPosts(db: SupabaseClient, filter?: { id?: string; slug?: string }): Promise<BlogPostRow[]> {
  let query = db.from("blog_posts").select(POST_COLUMNS).order("published_at", { ascending: false, nullsFirst: true }).order("created_at", { ascending: false });
  if (filter?.id) query = query.eq("id", filter.id);
  if (filter?.slug) query = query.eq("slug", filter.slug);
  const { data, error } = await query;
  if (error) throw new StoreQueryError("blog posts", error);
  return (data ?? []).map(toPost);
}

// ---------------------------------------------------------------------------
// Storefront (cached; refreshed by admin saves through updateTag(STORE_TAG))
// ---------------------------------------------------------------------------

/** Missing tables (migration not applied yet) are expected during setup and are not logged as errors. */
async function publicRead<T>(load: () => Promise<T[]>): Promise<T[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await load();
  } catch (error) {
    if (error instanceof StoreQueryError && error.dbError.code !== "PGRST205" && error.dbError.code !== "42P01") {
      console.error(`[cms] ${error.scope} query failed:`, error.dbError.code ?? error.dbError.message);
    }
    return [];
  }
}

export async function getActiveHeroSlides(): Promise<HeroSlideRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  return publicRead(() => queryHeroSlides(createPublicClient()));
}

export async function getPublishedReels(): Promise<ReelRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  return publicRead(() => queryReels(createPublicClient()));
}

export async function getActiveIngredients(): Promise<IngredientRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  return publicRead(() => queryIngredients(createPublicClient()));
}

export async function getPublishedPosts(): Promise<BlogPostRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  return publicRead(() => queryBlogPosts(createPublicClient()));
}

/** Blog post → the Journal article shape used by the storefront (and the admin preview). */
export function postToArticle(post: BlogPostRow): JournalArticle {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category ?? "Journal",
    publishedAt: post.publishedAt ?? post.updatedAt,
    readingMinutes: readingMinutes(post.body),
    // Covers are cropped to 16:9 / 4:3 frames with object-cover; these dimensions only inform aspect hints.
    image: post.coverImagePath
      ? { src: mediaUrl(post.coverImagePath), alt: post.coverAlt || post.title, width: 1600, height: 900 }
      : { src: "", alt: "", width: 1600, height: 900 },
    body: [],
    blocks: parseBlogBody(post.body),
    author: post.author,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    updatedAt: post.updatedAt,
  };
}
