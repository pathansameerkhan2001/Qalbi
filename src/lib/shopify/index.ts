import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Collection, CommerceSource, Product, ProductSortKey, ShopPolicy } from "@/types/commerce";
import type { JournalArticle } from "@/types/content";
import { devCollections, devProducts } from "@/data/dev-products";
import { collectionTitles } from "@/data/categories";
import { journalArticles } from "@/data/content";
import { getStoreCollections, getStoreProducts, isSupabaseCommerce } from "@/lib/store/catalog";
import { getSetting } from "@/lib/store/settings";
import { shopifyFetch } from "./client";
import { allowDevelopmentFixtures, isShopifyConfigured, shopifyConfig } from "./config";
import { toCollection, toProduct } from "./mappers";
import {
  BLOG_ARTICLES_QUERY,
  COLLECTION_QUERY,
  COLLECTIONS_QUERY,
  PRODUCT_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
  PRODUCTS_QUERY,
  SHOP_POLICIES_QUERY,
} from "./queries";
import type { ShopifyArticle, ShopifyCollection, ShopifyPolicy, ShopifyProduct } from "./types";

export const CATALOG_TAG = "shopify-catalog";

export function getCommerceSource(): CommerceSource | null {
  if (isShopifyConfigured()) return "shopify";
  if (isSupabaseCommerce(false)) return "supabase";
  return allowDevelopmentFixtures() ? "development-fixtures" : null;
}

const productSort: Record<ProductSortKey, { sortKey: string; reverse: boolean }> = {
  featured: { sortKey: "BEST_SELLING", reverse: false },
  "price-asc": { sortKey: "PRICE", reverse: false },
  "price-desc": { sortKey: "PRICE", reverse: true },
  newest: { sortKey: "CREATED_AT", reverse: true },
  title: { sortKey: "TITLE", reverse: false },
};

const collectionSort: Record<ProductSortKey, { sortKey: string; reverse: boolean }> = {
  featured: { sortKey: "COLLECTION_DEFAULT", reverse: false },
  "price-asc": { sortKey: "PRICE", reverse: false },
  "price-desc": { sortKey: "PRICE", reverse: true },
  newest: { sortKey: "CREATED", reverse: true },
  title: { sortKey: "TITLE", reverse: false },
};

function sortFixtures(products: Product[], sort: ProductSortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.priceRange.min.amount - b.priceRange.min.amount);
    case "price-desc":
      return list.sort((a, b) => b.priceRange.min.amount - a.priceRange.min.amount);
    case "title":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return list;
  }
}

const withInventory = () => shopifyConfig.inventoryAccess;

/** Non-Shopify catalogue: the Supabase store when enabled, else development fixtures (if allowed). */
async function localProducts(): Promise<Product[]> {
  if (isSupabaseCommerce(false)) return getStoreProducts();
  return allowDevelopmentFixtures() ? devProducts : [];
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProducts(sort: ProductSortKey = "featured", first = 48): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  if (!isShopifyConfigured()) return sortFixtures(await localProducts(), sort);
  const { sortKey, reverse } = productSort[sort];
  const data = await shopifyFetch<{ products: { nodes: ShopifyProduct[] } }>(PRODUCTS_QUERY, {
    first,
    sortKey,
    reverse,
    withInventory: withInventory(),
  });
  return data.products.nodes.map(toProduct);
}

export async function getProduct(handle: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  if (!isShopifyConfigured()) return (await localProducts()).find((p) => p.handle === handle) ?? null;
  const data = await shopifyFetch<{ product: ShopifyProduct | null }>(PRODUCT_QUERY, {
    handle,
    withInventory: withInventory(),
  });
  return data.product ? toProduct(data.product) : null;
}

export async function getProductRecommendations(product: Pick<Product, "id" | "handle" | "collectionHandles">): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  if (!isShopifyConfigured()) {
    return (await localProducts())
      .filter((p) => p.handle !== product.handle && p.collectionHandles.some((c) => product.collectionHandles.includes(c)))
      .slice(0, 5);
  }
  const data = await shopifyFetch<{ productRecommendations: ShopifyProduct[] | null }>(PRODUCT_RECOMMENDATIONS_QUERY, {
    productId: product.id,
    withInventory: withInventory(),
  });
  return (data.productRecommendations ?? []).slice(0, 5).map(toProduct);
}

export async function searchProducts(term: string): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const query = term.trim().slice(0, 100);
  if (!query) return [];
  if (!isShopifyConfigured()) {
    const needle = query.toLowerCase();
    return (await localProducts()).filter((p) =>
      [p.title, p.productType, p.description, ...p.tags].some((field) => field.toLowerCase().includes(needle)),
    );
  }
  const data = await shopifyFetch<{ products: { nodes: ShopifyProduct[] } }>(PRODUCTS_QUERY, {
    first: 24,
    sortKey: "RELEVANCE",
    reverse: false,
    query,
    withInventory: withInventory(),
  });
  return data.products.nodes.map(toProduct);
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  if (!isShopifyConfigured()) {
    if (isSupabaseCommerce(false)) return getStoreCollections();
    return allowDevelopmentFixtures() ? devCollections : [];
  }
  const data = await shopifyFetch<{ collections: { nodes: ShopifyCollection[] } }>(COLLECTIONS_QUERY);
  return data.collections.nodes.map(toCollection);
}

export async function getCollectionWithProducts(
  handle: string,
  sort: ProductSortKey = "featured",
): Promise<{ collection: Collection; products: Product[] } | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  if (!isShopifyConfigured() && isSupabaseCommerce(false)) {
    const collection = (await getStoreCollections()).find((c) => c.handle === handle);
    if (!collection) return null;
    return { collection, products: sortFixtures((await getStoreProducts()).filter((p) => p.collectionHandles.includes(handle)), sort) };
  }
  if (!isShopifyConfigured()) {
    const title = collectionTitles[handle];
    if (!title || !allowDevelopmentFixtures()) return null;
    const collection = devCollections.find((c) => c.handle === handle)!;
    return {
      collection,
      products: sortFixtures(
        devProducts.filter((p) => p.collectionHandles.includes(handle)),
        sort,
      ),
    };
  }
  const { sortKey, reverse } = collectionSort[sort];
  const data = await shopifyFetch<{ collection: ShopifyCollection | null }>(COLLECTION_QUERY, {
    handle,
    first: 48,
    sortKey,
    reverse,
    withInventory: withInventory(),
  });
  if (!data.collection) return null;
  return {
    collection: toCollection(data.collection),
    products: (data.collection.products?.nodes ?? []).map(toProduct),
  };
}

/** Homepage favourites: the configured bestsellers collection, else best-selling products. */
export async function getFavouriteProducts(limit = 10): Promise<Product[]> {
  const handle = isSupabaseCommerce(isShopifyConfigured())
    ? ((await getSetting("featured"))?.collectionHandle ?? shopifyConfig.bestsellersCollection)
    : shopifyConfig.bestsellersCollection;
  const fromCollection = await getCollectionWithProducts(handle);
  if (fromCollection && fromCollection.products.length > 0) return fromCollection.products.slice(0, limit);
  return (await getProducts("featured", limit)).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Store content
// ---------------------------------------------------------------------------

const policyFields = {
  "privacy-policy": "privacyPolicy",
  "refund-policy": "refundPolicy",
  "shipping-policy": "shippingPolicy",
  "terms-of-service": "termsOfService",
} as const;

export type PolicyHandle = keyof typeof policyFields;
export const policyHandles = Object.keys(policyFields) as PolicyHandle[];

export async function getPolicy(handle: PolicyHandle): Promise<ShopPolicy | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  if (!isShopifyConfigured()) return null;
  const data = await shopifyFetch<{ shop: Record<string, ShopifyPolicy | null> }>(SHOP_POLICIES_QUERY);
  const policy = data.shop[policyFields[handle]];
  return policy ? { title: policy.title, body: policy.body, handle: policy.handle } : null;
}

export async function getJournalArticles(): Promise<JournalArticle[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  if (!isShopifyConfigured() || !shopifyConfig.blogHandle) return journalArticles;
  const data = await shopifyFetch<{ blog: { articles: { nodes: ShopifyArticle[] } } | null }>(BLOG_ARTICLES_QUERY, {
    handle: shopifyConfig.blogHandle,
  });
  const articles = data.blog?.articles.nodes ?? [];
  return articles
    .filter((a) => a.image)
    .map((a) => ({
      slug: a.handle,
      title: a.title,
      excerpt: a.excerpt ?? a.content.slice(0, 160),
      category: a.tags[0] ?? "Journal",
      publishedAt: a.publishedAt,
      readingMinutes: Math.max(1, Math.round(a.content.split(/\s+/).length / 200)),
      image: { src: a.image!.url, alt: a.image!.altText || a.title, width: a.image!.width ?? 1200, height: a.image!.height ?? 800 },
      body: a.content.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean),
      author: a.authorV2?.name ?? null,
    }));
}

export async function getJournalArticle(slug: string): Promise<JournalArticle | null> {
  const articles = await getJournalArticles();
  return articles.find((a) => a.slug === slug) ?? null;
}
