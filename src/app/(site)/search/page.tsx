import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { searchProducts } from "@/lib/shopify";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { ProductGridSkeleton } from "@/components/ui/skeletons";
import { ProductGrid } from "@/components/products/product-grid";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const raw = (await searchParams).q;
  const term = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? "";
  if (!term) return <p className="text-sm text-muted">Enter a search term to find products.</p>;
  const products = await searchProducts(term);
  return (
    <>
      <p className="mb-6 text-sm text-muted" role="status">
        {products.length} {products.length === 1 ? "result" : "results"} for <span className="font-medium text-ink">&ldquo;{term}&rdquo;</span>
      </p>
      <ProductGrid products={products} emptyMessage={`No products match “${term}”.`} />
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <PageHeader title="Search" breadcrumbs={[{ label: "Search" }]}>
        <form action="/search" role="search" className="mt-6 flex max-w-xl gap-2">
          <label htmlFor="search-page-input" className="sr-only">Search products</label>
          <div className="relative flex-1">
            <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input id="search-page-input" name="q" type="search" maxLength={100} placeholder="Search products" className="field pl-9" />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </PageHeader>
      <Container className="py-10">
        <Suspense fallback={<ProductGridSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}
