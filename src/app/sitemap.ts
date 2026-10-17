import type { MetadataRoute } from "next";
import { getJournalArticles, getProducts, policyHandles } from "@/lib/shopify";
import { productCategoryLinks } from "@/data/navigation";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const [products, articles] = await Promise.all([getProducts("featured", 100), getJournalArticles()]);
  const staticPaths = ["", "/products", "/about", "/ingredients", "/customised-skincare", "/journal", "/contact", "/reviews", "/faqs"];
  return [
    ...staticPaths.map((path) => ({ url: `${site}${path}` })),
    ...productCategoryLinks.filter((l) => l.href.startsWith("/collections/")).map((l) => ({ url: `${site}${l.href}` })),
    ...products.map((p) => ({ url: `${site}/products/${p.handle}` })),
    ...articles.map((a) => ({ url: `${site}/journal/${a.slug}` })),
    ...policyHandles.map((h) => ({ url: `${site}/policies/${h}` })),
  ];
}
