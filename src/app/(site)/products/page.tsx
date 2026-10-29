import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/shopify";
import { parseSort } from "@/lib/sort";
import { getCategoryLinks } from "@/lib/navigation";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { ProductListing } from "@/components/products/product-listing";
import { FloralCorner } from "@/components/ui/flowers";

export const metadata: Metadata = {
  alternates: { canonical: "/products" },
  title: "Shop All Skincare",
  description: "Explore the QALBI Naturals skincare collection — serums, creams, cleansers and more.",
};

/** The visitor's sort (?sort=…), known only at request time. */
async function SortedListing({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const sort = parseSort((await searchParams).sort);
  return <ProductListing products={await getProducts(sort)} sort={sort} basePath="/products" />;
}

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  // Both cached: the products are part of the prerendered page, not fetched after it arrives.
  const [categoryLinks, products] = await Promise.all([getCategoryLinks(), getProducts()]);
  return (
    <>
      <PageHeader
        eyebrow="Shop"
        floral="rose"
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
      <Container className="relative isolate py-10 sm:py-12">
        <FloralCorner variant="bouquet" corner="bl" size="md" desktop className="lg:-left-24 xl:-left-40" />
        <FloralCorner variant="jasmine" corner="tr" size="md" desktop className="lg:-right-24 xl:-right-40" />
        {/* The default order is in the page shell; a ?sort view streams in over it. */}
        <Suspense fallback={<ProductListing products={products} sort="featured" basePath="/products" />}>
          <SortedListing searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}
