import type { Product, ProductImage } from "@/types/commerce";
import { mediaUrl } from "../assets.ts";

/**
 * Database product rows → storefront products. Kept free of server-only imports
 * so the visibility and pricing rules are unit-tested (tests/products.test.mts).
 */

/** Collection handle for products flagged `is_best_seller` (shown as “The QALBI Favourites”). */
export const BESTSELLERS_HANDLE = "bestsellers";

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
  seoTitle: string | null;
  seoDescription: string | null;
  images: ProductImageRow[];
}

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
    seo: { title: row.seoTitle, description: row.seoDescription },
    sku: row.sku,
  };
}
