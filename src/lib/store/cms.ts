import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { JournalArticle } from "@/types/content";
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
  desktopImagePath: string;
  mobileImagePath: string;
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

const HERO_COLUMNS = "id, heading, subtitle, button_label, button_href, desktop_image_path, mobile_image_path, alt_text, sort_order, is_active";
const REEL_COLUMNS = "id, reel_url, caption, thumbnail_path, sort_order, is_published";
const POST_COLUMNS = "id, slug, title, excerpt, body, category, author, cover_image_path, cover_alt, seo_title, seo_description, status, published_at, created_at, updated_at";

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : null);

const toHero = (r: Row): HeroSlideRow => ({
  id: String(r.id),
  heading: str(r.heading),
  subtitle: str(r.subtitle),
  buttonLabel: str(r.button_label),
  buttonHref: str(r.button_href),
  desktopImagePath: String(r.desktop_image_path),
  mobileImagePath: String(r.mobile_image_path),
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

export async function queryHeroSlides(db: SupabaseClient): Promise<HeroSlideRow[]> {
  const { data, error } = await db.from("hero_slides").select(HERO_COLUMNS).order("sort_order").order("created_at");
  if (error) throw new StoreQueryError("hero slides", error);
  return (data ?? []).map(toHero);
}

export async function queryReels(db: SupabaseClient): Promise<ReelRow[]> {
  const { data, error } = await db.from("instagram_reels").select(REEL_COLUMNS).order("sort_order").order("created_at");
  if (error) throw new StoreQueryError("Instagram Reels", error);
  return (data ?? []).map(toReel);
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
