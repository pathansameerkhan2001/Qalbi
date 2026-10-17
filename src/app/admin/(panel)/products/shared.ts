import "server-only";
import { assetUrl } from "@/lib/assets";
import { supabaseConfig } from "@/lib/supabase/config";
import type { ProductRow } from "@/lib/store/catalog";
import type { ProductFormValues } from "./product-form";

export const mediaBase = {
  assets: assetUrl("x").replace(/\/x$/, ""),
  uploads: `${supabaseConfig.url}/storage/v1/object/public/${supabaseConfig.mediaBucket}`,
};

export const emptyProduct: ProductFormValues = {
  id: "",
  slug: "",
  name: "",
  description: "",
  price: "",
  compare_at_price: "",
  stock_quantity: "0",
  sku: "",
  category_id: "",
  is_published: false,
  is_featured: false,
  is_best_seller: false,
  images: [],
};

export function toFormValues(p: ProductRow): ProductFormValues {
  return {
    id: p.id,
    slug: p.handle,
    name: p.title,
    description: p.description,
    price: String(p.price),
    compare_at_price: p.compareAtPrice === null ? "" : String(p.compareAtPrice),
    stock_quantity: p.inventory === null ? "" : String(p.inventory),
    sku: p.sku ?? "",
    category_id: p.categoryId ?? "",
    is_published: p.published,
    is_featured: p.featured,
    is_best_seller: p.bestSeller,
    images: p.images.map((i) => ({ path: i.path, alt: i.alt })),
  };
}
