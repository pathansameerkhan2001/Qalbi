import type { Cart, Collection, Money, Product, ProductImage, ProductRating } from "@/types/commerce";
import type { ShopifyCart, ShopifyCollection, ShopifyImage, ShopifyMoney, ShopifyProduct } from "./types";

export const toMoney = (m: ShopifyMoney): Money => ({ amount: Number(m.amount), currencyCode: m.currencyCode });

export function toImage(img: ShopifyImage | null, fallbackAlt: string): ProductImage | null {
  if (!img) return null;
  return { url: img.url, alt: img.altText || fallbackAlt, width: img.width ?? 1000, height: img.height ?? 1000 };
}

function metafield(product: ShopifyProduct, namespace: string, key: string): string | null {
  return product.metafields.find((m) => m?.namespace === namespace && m?.key === key)?.value?.trim() || null;
}

/** Parses Shopify's standard `rating` metafield JSON. Returns null if absent or malformed. */
function parseRating(product: ShopifyProduct): ProductRating | null {
  const raw = metafield(product, "reviews", "rating");
  const count = Number(metafield(product, "reviews", "rating_count"));
  if (!raw || !Number.isFinite(count) || count <= 0) return null;
  try {
    const parsed = JSON.parse(raw) as { value?: string; scale_max?: string };
    const value = Number(parsed.value);
    const scaleMax = Number(parsed.scale_max ?? 5);
    if (!Number.isFinite(value) || value <= 0) return null;
    return { value, scaleMax, count };
  } catch {
    return null;
  }
}

export function toProduct(p: ShopifyProduct): Product {
  const compare = p.compareAtPriceRange;
  const hasCompare = compare && Number(compare.maxVariantPrice.amount) > 0;
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    productType: p.productType,
    tags: p.tags,
    availableForSale: p.availableForSale,
    featuredImage: toImage(p.featuredImage, p.title),
    images: p.images.nodes.map((img) => toImage(img, p.title)).filter((i): i is ProductImage => i !== null),
    options: p.options.map((o) => ({ name: o.name, values: o.optionValues.map((v) => v.name) })),
    variants: p.variants.nodes.map((v) => ({
      id: v.id,
      title: v.title,
      availableForSale: v.availableForSale,
      quantityAvailable: v.quantityAvailable ?? null,
      price: toMoney(v.price),
      compareAtPrice: v.compareAtPrice ? toMoney(v.compareAtPrice) : null,
      selectedOptions: v.selectedOptions,
      image: toImage(v.image, p.title),
    })),
    priceRange: { min: toMoney(p.priceRange.minVariantPrice), max: toMoney(p.priceRange.maxVariantPrice) },
    compareAtPriceRange: hasCompare
      ? { min: toMoney(compare.minVariantPrice), max: toMoney(compare.maxVariantPrice) }
      : null,
    rating: parseRating(p),
    ingredients: metafield(p, "qalbi", "ingredients"),
    directions: metafield(p, "qalbi", "directions"),
    warnings: metafield(p, "qalbi", "warnings"),
    collectionHandles: p.collections.nodes.map((c) => c.handle),
  };
}

export function toCollection(c: ShopifyCollection): Collection {
  return { id: c.id, handle: c.handle, title: c.title, description: c.description, image: toImage(c.image, c.title) };
}

export function toCart(c: ShopifyCart): Cart {
  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity,
    cost: {
      subtotalAmount: toMoney(c.cost.subtotalAmount),
      totalAmount: toMoney(c.cost.totalAmount),
      totalTaxAmount: null,
    },
    lines: c.lines.nodes.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      cost: { totalAmount: toMoney(line.cost.totalAmount) },
      merchandise: {
        id: line.merchandise.id,
        title: line.merchandise.title,
        selectedOptions: line.merchandise.selectedOptions,
        price: toMoney(line.merchandise.price),
        product: {
          handle: line.merchandise.product.handle,
          title: line.merchandise.product.title,
          featuredImage: toImage(line.merchandise.product.featuredImage, line.merchandise.product.title),
        },
      },
    })),
  };
}
