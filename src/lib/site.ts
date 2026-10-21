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

/**
 * schema.org BreadcrumbList for the visible breadcrumb trail (Home is added first).
 * The current page (no href) is the last item and carries no URL, as Google allows.
 */
export function breadcrumbJsonLd(crumbs: { label: string; href?: string }[]): string {
  const items = [{ label: "Home", href: "/" }, ...crumbs];
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: absoluteUrl(c.href) } : {}),
    })),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
