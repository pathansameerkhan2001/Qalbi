import type { MetadataRoute } from "next";
import { getCollections, getCommerceSource, getJournalArticles, getPolicy, getProducts, policyHandles } from "@/lib/shopify";
import { absoluteUrl } from "@/lib/site";

/**
 * Public, indexable pages only. Products and collections come from the live
 * catalogue (Shopify or Supabase) — never from development fixtures. Policy
 * pages are listed only once they have content; journal posts only when published.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const realCatalogue = getCommerceSource() === "shopify" || getCommerceSource() === "supabase";
  const [products, collections, articles, policies] = await Promise.all([
    realCatalogue ? getProducts("featured", 250) : [],
    realCatalogue ? getCollections() : [],
    getJournalArticles(),
    Promise.all(policyHandles.map(async (h) => ((await getPolicy(h)) ? h : null))),
  ]);

  const staticPaths = ["/", "/products", "/about", "/ingredients", "/customised-skincare", "/journal", "/contact", "/reviews", "/faqs"];
  return [
    ...staticPaths.map((path) => ({ url: absoluteUrl(path) })),
    ...collections.map((c) => ({ url: absoluteUrl(`/collections/${c.handle}`) })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.handle}`),
      ...(p.featuredImage && !p.featuredImage.placeholder ? { images: [absoluteUrl(p.featuredImage.url)] } : {}),
    })),
    ...articles.map((a) => ({ url: absoluteUrl(`/journal/${a.slug}`), lastModified: a.updatedAt ?? a.publishedAt })),
    ...policies.filter((h) => h !== null).map((h) => ({ url: absoluteUrl(`/policies/${h}`) })),
  ];
}
