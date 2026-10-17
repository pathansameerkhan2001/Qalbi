import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Collection, Product, ProductImage } from "@/types/commerce";
import { mediaUrl } from "@/lib/assets";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Cache tag for everything read from the Supabase store tables. Admin writes call updateTag(STORE_TAG). */
export const STORE_TAG = "store";

/** Collection handle for products flagged `is_best_seller` (shown as “The QALBI Favourites”). */
export const BESTSELLERS_HANDLE = "bestsellers";

/**
 * Supabase is the catalogue source only when explicitly enabled
 * (COMMERCE_SOURCE=supabase) and Shopify is not configured — so there is never
 * more than one source of truth for product data.
 */
export function isSupabaseCommerce(shopifyConfigured: boolean): boolean {
  return !shopifyConfigured && process.env.COMMERCE_SOURCE === "supabase" && isSupabaseConfigured();
}

// ---------------------------------------------------------------------------
// Database rows (columns of the production tables)
// ---------------------------------------------------------------------------

const PRODUCT_COLUMNS = "id, category_id, name, slug, description, price, compare_at_price, stock_quantity, sku, is_featured, is_best_seller, is_published, created_at";
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

// ---------------------------------------------------------------------------
// App-facing shapes
// ---------------------------------------------------------------------------

export interface ProductImageRow {
  id: string;
  path: string;
  alt: string;
  sort: number;
  isPrimary: boolean;
}

export interface ProductRow {
  id: string;
  handle: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  /** null = stock not tracked. */
  inventory: number | null;
  sku: string | null;
  categoryId: string | null;
  category: { handle: string; title: string } | null;
  featured: boolean;
  bestSeller: boolean;
  published: boolean;
  createdAt: string;
  images: ProductImageRow[];
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
export async function queryProducts(db: SupabaseClient, filter?: { id: string }): Promise<ProductRow[]> {
  let productQuery = db.from("products").select(PRODUCT_COLUMNS).order("is_featured", { ascending: false }).order("name");
  if (filter) productQuery = productQuery.eq("id", filter.id);
  const [products, categories] = await Promise.all([productQuery, queryCategories(db)]);
  if (products.error) throw new StoreQueryError("products", products.error);
  const rows = (products.data ?? []) as DbProduct[];
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

/** Image dimensions are not stored; 4:5 matches the product photography and only informs aspect hints. */
function toImage(path: string, alt: string): ProductImage {
  return { url: mediaUrl(path), alt, width: 960, height: 1200 };
}

export function rowToProduct(row: ProductRow): Product {
  const price = { amount: row.price, currencyCode: "INR" };
  const compareAt = row.compareAtPrice === null ? null : { amount: row.compareAtPrice, currencyCode: "INR" };
  const images = row.images.map((img) => toImage(img.path, img.alt || row.title));
  const inStock = row.published && (row.inventory === null || row.inventory > 0);
  const collectionHandles = [...(row.category ? [row.category.handle] : []), ...(row.bestSeller ? [BESTSELLERS_HANDLE] : [])];
  return {
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description,
    descriptionHtml: "",
    productType: row.category?.title ?? "",
    tags: row.featured ? ["featured"] : [],
    availableForSale: inStock,
    featuredImage: images[0] ?? null,
    images,
    options: [{ name: "Title", values: ["Default Title"] }],
    // One purchasable unit per product: the variant id is the product id.
    variants: [
      {
        id: row.id,
        title: "Default Title",
        availableForSale: inStock,
        quantityAvailable: row.inventory,
        price,
        compareAtPrice: compareAt,
        selectedOptions: [{ name: "Title", value: "Default Title" }],
        image: images[0] ?? null,
      },
    ],
    priceRange: { min: price, max: price },
    compareAtPriceRange: compareAt ? { min: compareAt, max: compareAt } : null,
    rating: null,
    ingredients: null,
    directions: null,
    warnings: null,
    collectionHandles,
  };
}

export async function getStoreProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  try {
    return (await queryProducts(createPublicClient())).map(rowToProduct);
  } catch (error) {
    if (error instanceof StoreQueryError) console.error(`[store] ${error.scope} query failed:`, error.dbError.code ?? error.dbError.message);
    return [];
  }
}

export async function getStoreCategories(): Promise<CategoryRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  try {
    return await queryCategories(createPublicClient());
  } catch (error) {
    if (error instanceof StoreQueryError) console.error(`[store] ${error.scope} query failed:`, error.dbError.code ?? error.dbError.message);
    return [];
  }
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
      image: c.imagePath ? { url: mediaUrl(c.imagePath), alt: c.title, width: 600, height: 600 } : null,
    }));
  if (!collections.some((c) => c.handle === BESTSELLERS_HANDLE) && products.some((p) => p.collectionHandles.includes(BESTSELLERS_HANDLE))) {
    collections.push({ id: "category-bestsellers", handle: BESTSELLERS_HANDLE, title: "The QALBI Favourites", description: "", image: null });
  }
  return collections;
}
