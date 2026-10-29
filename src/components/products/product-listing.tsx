import type { Product, ProductSortKey } from "@/types/commerce";
import { ProductGrid } from "./product-grid";
import { SortSelect } from "./sort-select";

/**
 * A product count, the sort menu and the grid, for /products and the collections.
 * The pages prerender it in the default order as the Suspense fallback, so the
 * products arrive with the cached page itself; the visitor's ?sort view then
 * streams in over it (identical when no sort is chosen).
 */
export function ProductListing({ products, sort, basePath, emptyMessage }: { products: Product[]; sort: ProductSortKey; basePath: string; emptyMessage?: string }) {
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted" role="status">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        <SortSelect value={sort} basePath={basePath} />
      </div>
      <ProductGrid products={products} priorityCount={5} emptyMessage={emptyMessage} />
    </>
  );
}
