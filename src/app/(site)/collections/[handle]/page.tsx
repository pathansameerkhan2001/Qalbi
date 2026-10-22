import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCollections, getCollectionWithProducts, getCommerceSource } from "@/lib/shopify";
import { parseSort } from "@/lib/sort";
import { collectionTitles } from "@/data/categories";
import { suggestedCategories } from "@/data/category-suggestions";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { ProductGridSkeleton } from "@/components/ui/skeletons";
import { ProductGrid } from "@/components/products/product-grid";
import { SortSelect } from "@/components/products/sort-select";

/** The category's own description, or QALBI's short default introduction for its handle. */
const introduction = (handle: string, description: string) => description || suggestedCategories.find((s) => s.slug === handle)?.description || "";

export async function generateStaticParams() {
  const collections = await getCollections().catch(() => []);
  const handles = new Set([...collections.map((c) => c.handle), ...Object.keys(collectionTitles)]);
  return [...handles].map((handle) => ({ handle }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const data = await getCollectionWithProducts(handle);
  if (!data) return { title: "Collection not found", robots: { index: false } };
  const description = introduction(data.collection.handle, data.collection.description) || `Shop ${data.collection.title} by QALBI Naturals.`;
  // Sorted views (?sort=…) share the collection's canonical URL.
  return {
    title: data.collection.title,
    description,
    alternates: { canonical: `/collections/${data.collection.handle}` },
    // Empty collections and the preview catalogue are thin / unconfirmed content: keep them out of the index.
    ...(data.products.length === 0 || getCommerceSource() === "development-fixtures" ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: data.collection.title, description, url: `/collections/${data.collection.handle}`, images: data.collection.image ? [{ url: data.collection.image.url, alt: data.collection.image.alt }] : undefined },
  };
}

async function CollectionContent({ params, searchParams }: PageProps<"/collections/[handle]">) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const sort = parseSort(query.sort);
  const data = await getCollectionWithProducts(handle, sort);
  if (!data) notFound();
  const { collection, products } = data;

  return (
    <>
      <PageHeader
        eyebrow="Collection"
        title={collection.title}
        description={introduction(collection.handle, collection.description) || undefined}
        image={collection.image}
        breadcrumbs={[{ label: "Products", href: "/products" }, { label: collection.title }]}
      />
      <Container className="py-10 sm:py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-muted" role="status">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
          <SortSelect value={sort} basePath={`/collections/${collection.handle}`} />
        </div>
        <ProductGrid products={products} priorityCount={5} emptyMessage={`New products for ${collection.title} are on their way.`} />
      </Container>
    </>
  );
}

export default function CollectionPage(props: PageProps<"/collections/[handle]">) {
  return (
    <Suspense
      fallback={
        <>
          <div className="h-44 border-b border-line bg-sand" />
          <Container className="py-12">
            <ProductGridSkeleton />
          </Container>
        </>
      }
    >
      <CollectionContent {...props} />
    </Suspense>
  );
}
