import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments are not for search engines.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    // Page assets (/_next/, /assets/, images) stay crawlable so Google can render pages.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart", "/checkout", "/account", "/search"] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
