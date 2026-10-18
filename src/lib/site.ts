/**
 * Canonical public origin of the storefront, from NEXT_PUBLIC_SITE_URL
 * (set it in Vercel to the production https domain, without a trailing slash).
 * Used for canonical URLs, the sitemap, robots.txt and structured data.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** True when the configured origin is a real public https site (not localhost or a preview default). */
export const isProductionSiteUrl = /^https:\/\//.test(siteUrl) && !/localhost|127\.0\.0\.1/.test(siteUrl);

/** Absolute URL for a site path or an already absolute URL. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
