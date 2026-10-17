import type { ProductSortKey } from "@/types/commerce";

export const sortOptions: { value: ProductSortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title", label: "Name: A–Z" },
];

export function parseSort(value: string | string[] | undefined): ProductSortKey {
  const v = Array.isArray(value) ? value[0] : value;
  return sortOptions.some((o) => o.value === v) ? (v as ProductSortKey) : "featured";
}
