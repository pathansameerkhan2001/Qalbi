import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Collection, Product } from "@/types/commerce";
import { mediaUrl } from "@/lib/assets";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { homeCategories } from "@/data/categories";

/** Cache tag for everything read from the Supabase store tables. Admin writes call updateTag(STORE_TAG). */
export const STORE_TAG = "store";

import { BESTSELLERS_HANDLE, rowToProduct, type ProductImageRow, type ProductRow } from "./product-mapping";

export { BESTSELLERS_HANDLE, rowToProduct, type ProductImageRow, type ProductRow };

/**
 * Supabase is the catalogue source only when explicitly enabled
 * (COMMERCE_SOURCE=supabase) and Shopify is not configured — so there is never
 * more than one source of truth for product data. Missing Supabase keys do NOT
 * switch the shop back to the preview catalogue: the catalogue reads then fail
 * with CatalogUnavailableError and the shop pages show their error state.
 */
export function isSupabaseCommerce(shopifyConfigured: boolean): boolean {
  return !shopifyConfigured && process.env.COMMERCE_SOURCE === "supabase";
}

// ---------------------------------------------------------------------------
// Database rows (columns of the production tables)
// ---------------------------------------------------------------------------

const PRODUCT_COLUMNS = "id, category_id, name, slug, description, price, compare_at_price, stock_quantity, sku, is_featured, is_best_seller, is_published, created_at";
/** SEO columns added by migrations/20261019000000_content_management.sql. */
const PRODUCT_SEO_COLUMNS = `${PRODUCT_COLUMNS}, seo_title, seo_description`;
/** Postgres / PostgREST codes for "column does not exist" (SEO migration not applied yet). */
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);
const IMAGE_COLUMNS = "id, product_id, image_url, alt_text, sort_order, is_primary";
const CATEGORY_COLUMNS = "id, name, slug, description, image_url, sort_order, is_active";

interface DbProduct {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  stock_quantity: number | null;
  sku: string | null;
  is_featured: boolean | null;
  is_best_seller: boolean | null;
  is_published: boolean | null;
  created_at: string;
  seo_title?: string | null;
  seo_description?: string | null;
}

interface DbImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
}

interface DbCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

export interface CategoryRow {
  id: string;
  handle: string;
  title: string;
  description: string;
  imagePath: string | null;
  sort: number;
  active: boolean;
}

const toCategory = (c: DbCategory): CategoryRow => ({
  id: c.id,
  handle: c.slug,
  title: c.name,
  description: c.description ?? "",
  imagePath: c.image_url,
  sort: c.sort_order ?? 0,
  active: c.is_active === true,
});

/** Primary image first, then by sort order. */
const imageOrder = (a: ProductImageRow, b: ProductImageRow) => Number(b.isPrimary) - Number(a.isPrimary) || a.sort - b.sort;

function joinProducts(products: DbProduct[], images: DbImage[], categories: CategoryRow[]): ProductRow[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const imagesByProduct = new Map<string, ProductImageRow[]>();
  for (const img of images) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push({ id: img.id, path: img.image_url, alt: img.alt_text ?? "", sort: img.sort_order ?? 0, isPrimary: img.is_primary === true });
    imagesByProduct.set(img.product_id, list);
  }
  return products.map((p) => {
    const category = p.category_id ? categoryById.get(p.category_id) : undefined;
    return {
      id: p.id,
      handle: p.slug,
      title: p.name,
      description: p.description ?? "",
      price: Number(p.price),
      compareAtPrice: p.compare_at_price === null ? null : Number(p.compare_at_price),
      inventory: p.stock_quantity,
      sku: p.sku,
      categoryId: p.category_id,
      category: category ? { handle: category.handle, title: category.title } : null,
      featured: p.is_featured === true,
      bestSeller: p.is_best_seller === true,
      published: p.is_published === true,
      createdAt: p.created_at,
      seoTitle: p.seo_title ?? null,
      seoDescription: p.seo_description ?? null,
      images: (imagesByProduct.get(p.id) ?? []).sort(imageOrder),
    };
  });
}

type DbError = { code?: string; message: string };
export class StoreQueryError extends Error {
  constructor(
    readonly scope: string,
    readonly dbError: DbError,
  ) {
    super(`Could not load ${scope}.`);
  }
}

/**
 * Reads products with their images and categories as three plain queries joined
 * here, so nothing depends on foreign-key names. Row level security decides
 * what the client may see (visitors: published products and active categories;
 * administrators: everything).
 */
export async function queryProducts(db: SupabaseClient, filter?: { id: string }, loadedCategories?: Promise<CategoryRow[]>): Promise<ProductRow[]> {
  const productQuery = (columns: string) => {
    const query = db.from("products").select(columns).order("is_featured", { ascending: false }).order("name");
    return filter ? query.eq("id", filter.id) : query;
  };
  // Callers that already load the categories pass them in, so the table is read once per request.
  const [withSeo, categories] = await Promise.all([productQuery(PRODUCT_SEO_COLUMNS), loadedCategories ?? queryCategories(db)]);
  let products = withSeo;
  // Before the SEO migration is applied the extra columns don't exist: read without them.
  if (products.error?.code && MISSING_COLUMN.has(products.error.code)) products = await productQuery(PRODUCT_COLUMNS);
  if (products.error) throw new StoreQueryError("products", products.error);
  const rows = (products.data ?? []) as unknown as DbProduct[];
  if (rows.length === 0) return [];
  const images = await db
    .from("product_images")
    .select(IMAGE_COLUMNS)
    .in(
      "product_id",
      rows.map((p) => p.id),
    );
  if (images.error) throw new StoreQueryError("product images", images.error);
  return joinProducts(rows, (images.data ?? []) as DbImage[], categories);
}

export async function queryCategories(db: SupabaseClient): Promise<CategoryRow[]> {
  const { data, error } = await db.from("categories").select(CATEGORY_COLUMNS).order("sort_order").order("name");
  if (error) throw new StoreQueryError("categories", error);
  return ((data ?? []) as DbCategory[]).map(toCategory);
}

// ---------------------------------------------------------------------------
// Storefront
// ---------------------------------------------------------------------------

/**
 * Thrown when the database catalogue is selected (COMMERCE_SOURCE=supabase) but
 * cannot be read. Pages show their error state with a retry instead of an empty
 * catalogue; failures are never cached.
 */
export class CatalogUnavailableError extends Error {
  constructor(readonly scope: string) {
    super(`The product catalogue could not be loaded (${scope}).`);
    this.name = "CatalogUnavailableError";
  }
}

function unavailable(error: unknown): never {
  if (!isSupabaseConfigured()) {
    console.error("[store] COMMERCE_SOURCE=supabase but NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set");
    throw new CatalogUnavailableError("configuration");
  }
  if (error instanceof StoreQueryError) {
    console.error(`[store] ${error.scope} query failed:`, error.dbError.code ?? error.dbError.message);
    throw new CatalogUnavailableError(error.scope);
  }
  throw error;
}

export async function getStoreProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  try {
    return (await queryProducts(createPublicClient())).map(rowToProduct);
  } catch (error) {
    unavailable(error);
  }
}

export async function getStoreCategories(): Promise<CategoryRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  try {
    return await queryCategories(createPublicClient());
  } catch (error) {
    unavailable(error);
  }
}

/** QALBI's category photo for a handle (src/data/categories.ts), for categories saved without an image. */
function builtInCollectionImage(handle: string): Collection["image"] {
  const image = homeCategories.find((c) => c.collectionHandle === handle)?.image;
  return image ? { url: image.src, alt: image.alt, width: image.width, height: image.height } : null;
}

export async function getStoreCollections(): Promise<Collection[]> {
  const [categories, products] = await Promise.all([getStoreCategories(), getStoreProducts()]);
  const collections: Collection[] = categories
    .filter((c) => c.active)
    .map((c) => ({
      id: `category-${c.handle}`,
      handle: c.handle,
      title: c.title,
      description: c.description,
      image: c.imagePath ? { url: mediaUrl(c.imagePath), alt: c.title, width: 600, height: 600 } : builtInCollectionImage(c.handle),
    }));
  if (!collections.some((c) => c.handle === BESTSELLERS_HANDLE) && products.some((p) => p.collectionHandles.includes(BESTSELLERS_HANDLE))) {
    collections.push({ id: "category-bestsellers", handle: BESTSELLERS_HANDLE, title: "The QALBI Favourites", description: "", image: null });
  }
  return collections;
}
