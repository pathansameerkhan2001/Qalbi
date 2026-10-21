import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/shopify";
import { parseSort } from "@/lib/sort";
import { getCategoryLinks } from "@/lib/navigation";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { ProductGridSkeleton } from "@/components/ui/skeletons";
import { ProductGrid } from "@/components/products/product-grid";
import { SortSelect } from "@/components/products/sort-select";

export const metadata: Metadata = {
  alternates: { canonical: "/products" },
  title: "Shop All Skincare",
  description: "Explore the QALBI Naturals skincare collection — serums, creams, cleansers and more.",
};

async function ProductListing({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const sort = parseSort((await searchParams).sort);
  const products = await getProducts(sort);
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted" role="status">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        <SortSelect value={sort} basePath="/products" />
      </div>
      <ProductGrid products={products} priorityCount={5} />
    </>
  );
}

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const categoryLinks = await getCategoryLinks();
  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="All Products"
        description="Thoughtfully crafted skincare essentials for your everyday self-care ritual."
        breadcrumbs={[{ label: "Products" }]}
      >
        <nav aria-label="Product categories" className="mt-6">
          <ul className="scroll-row -mx-4 gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {categoryLinks.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link href={link.href} className="inline-flex min-h-9 items-center rounded-full border border-line bg-ivory px-4 text-xs font-medium text-ink transition hover:border-forest hover:text-forest">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </PageHeader>
      <Container className="py-10 sm:py-12">
        <Suspense
          fallback={
            <>
              <div className="mb-6 h-10" />
              <ProductGridSkeleton count={10} />
            </>
          }
        >
          <ProductListing searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}
