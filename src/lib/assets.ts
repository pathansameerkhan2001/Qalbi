/**
 * Image asset resolution.
 *
 * Every website image lives at the same relative path in two places:
 *  - Supabase Storage: bucket `qalbi-naturals-media` (public), e.g. hero/homepage-desktop.webp
 *  - Local mirror:     /public/assets/hero/homepage-desktop.webp
 *
 * Images are served from Supabase only when NEXT_PUBLIC_ASSET_SOURCE=supabase,
 * which should be set after `npm run assets:upload` has uploaded and verified
 * every file. Otherwise the identical local copies are used.
 */

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
export const assetsBucket = process.env.NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET || "qalbi-naturals-media";
export const assetSource: "supabase" | "local" =
  process.env.NEXT_PUBLIC_ASSET_SOURCE === "supabase" && supabaseUrl ? "supabase" : "local";

/** Storage object path → URL the browser should load. */
export function assetUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return assetSource === "supabase"
    ? `${supabaseUrl}/storage/v1/object/public/${assetsBucket}/${clean}`
    : `/assets/${clean}`;
}

/**
 * Public Supabase Storage URL for an object that exists only in the bucket
 * (admin uploads, the hero film), whatever NEXT_PUBLIC_ASSET_SOURCE says.
 * null when Supabase is not configured.
 */
export function storageUrl(path: string): string | null {
  return supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${assetsBucket}/${path.replace(/^\/+/, "")}` : null;
}

/**
 * URL for an image path stored in the database (products, categories, settings).
 * Absolute https URLs pass through; `uploads/…` objects exist only in Supabase
 * (added through /admin/media); other paths are the website assets above.
 */
export function mediaUrl(path: string): string {
  if (/^https:\/\//.test(path)) return path;
  const clean = path.replace(/^\/+/, "");
  if (clean.startsWith("uploads/")) return storageUrl(clean) ?? assetUrl(clean);
  return assetUrl(clean);
}
