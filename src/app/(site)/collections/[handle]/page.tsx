import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCollections, getCollectionWithProducts, getCommerceSource } from "@/lib/shopify";
import { parseSort } from "@/lib/sort";
import { siteOpenGraph } from "@/lib/social";
import { collectionTitles } from "@/data/categories";
import { suggestedCategories } from "@/data/category-suggestions";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { ProductListing } from "@/components/products/product-listing";

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
    openGraph: { ...siteOpenGraph, title: data.collection.title, description, url: `/collections/${data.collection.handle}`, ...(data.collection.image ? { images: [{ url: data.collection.image.url, alt: data.collection.image.alt }] } : {}) },
    twitter: { card: "summary_large_image", title: data.collection.title, description, images: [data.collection.image?.url ?? siteOpenGraph.images[0].url] },
  };
}

/** The visitor's sort (?sort=…), known only at request time. */
async function SortedListing({ handle, searchParams, emptyMessage }: { handle: string; searchParams: PageProps<"/collections/[handle]">["searchParams"]; emptyMessage: string }) {
  const sort = parseSort((await searchParams).sort);
  const data = await getCollectionWithProducts(handle, sort);
  return <ProductListing products={data?.products ?? []} sort={sort} basePath={`/collections/${handle}`} emptyMessage={emptyMessage} />;
}

/**
 * The header and the products in their default order are prerendered (cached
 * catalogue, known handles from generateStaticParams), so the page arrives with
 * them; only a chosen sort is resolved per request.
 */
export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[handle]">) {
  const { handle } = await params;
  const data = await getCollectionWithProducts(handle);
  if (!data) notFound();
  const { collection, products } = data;
  const emptyMessage = `New products for ${collection.title} are on their way.`;

  return (
    <>
      <PageHeader
        eyebrow="Collection"
        floral="jasmine"
        title={collection.title}
        description={introduction(collection.handle, collection.description) || undefined}
        image={collection.image}
        breadcrumbs={[{ label: "Products", href: "/products" }, { label: collection.title }]}
      />
      <Container className="py-10 sm:py-12">
        <Suspense fallback={<ProductListing products={products} sort="featured" basePath={`/collections/${collection.handle}`} emptyMessage={emptyMessage} />}>
          <SortedListing handle={collection.handle} searchParams={searchParams} emptyMessage={emptyMessage} />
        </Suspense>
      </Container>
    </>
  );
}
