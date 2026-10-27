import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MessageCircle } from "lucide-react";
import type { Product } from "@/types/commerce";
import { getCommerceSource, getProduct, getProductRecommendations, getProducts } from "@/lib/shopify";
import { sanitizeHtml, whatsappLink } from "@/lib/utils";
import { brandConfig } from "@/data/brand";
import { truncate } from "@/lib/content/rules";
import { descriptionSummary, parseProductDescription, stripMarkdown } from "@/lib/content/product-description";
import { getIngredients } from "@/lib/store/content";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/site";
import { Container } from "@/components/ui/container";
import { ProductDetailSkeleton, ProductGridSkeleton } from "@/components/ui/skeletons";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductGallery } from "@/components/products/product-gallery";
import { PurchasePanel } from "@/components/products/purchase-panel";
import { getWhatsAppOrderConfig } from "@/lib/whatsapp-order";
import { ProductGrid } from "@/components/products/product-grid";
import { FloralBorder, FloralCorner, FlowerMark } from "@/components/ui/flowers";
import { Rating } from "@/components/products/rating";
import { ProductStory } from "@/components/products/product-story";
import { DescriptionBlocks, InlineText } from "@/components/products/rich-text";

export async function generateStaticParams() {
  const products = await getProducts("featured", 100).catch(() => []);
  // Cache Components requires at least one param; unknown handles render notFound().
  return products.length ? products.map((p) => ({ handle: p.handle })) : [{ handle: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/products/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const image = product.featuredImage && !product.featuredImage.placeholder ? [{ url: product.featuredImage.url, alt: product.featuredImage.alt }] : undefined;
  const title = product.seo?.title || product.title;
  const description = truncate(product.seo?.description || plainSummary(product) || `${product.title} by ${brandConfig.name}.`, 160);
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.handle}` },
    // Preview catalogue: prices are unconfirmed, so these pages must not be indexed.
    ...(getCommerceSource() === "development-fixtures" ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `/products/${product.handle}`, images: image },
  };
}

/** Search-engine text: the description's introduction without the repeated name or Markdown markers. */
function plainSummary(product: Product): string {
  if (product.descriptionHtml) return product.description;
  return descriptionSummary(parseProductDescription(product.description, product.title)) ?? stripMarkdown(product.description);
}

/** Product schema; Offers only for the real catalogue (preview prices are unconfirmed). */
function productJsonLd(product: Product) {
  const realPrices = getCommerceSource() !== "development-fixtures";
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.seo?.description || plainSummary(product),
    image: product.images.filter((i) => !i.placeholder).map((i) => absoluteUrl(i.url)),
    url: absoluteUrl(`/products/${product.handle}`),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.productType ? { category: product.productType } : {}),
    brand: { "@type": "Brand", name: brandConfig.name },
    ...(realPrices
      ? {
          offers: product.variants.map((v) => ({
            "@type": "Offer",
            url: absoluteUrl(`/products/${product.handle}`),
            price: v.price.amount,
            priceCurrency: v.price.currencyCode,
            itemCondition: "https://schema.org/NewCondition",
            availability: v.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          })),
        }
      : {}),
    ...(product.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.value, bestRating: product.rating.scaleMax, reviewCount: product.rating.count } } : {}),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function InfoSection({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line py-4" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-xl text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
      </summary>
      <div className="pt-3 text-sm leading-relaxed text-ink/80">{children}</div>
    </details>
  );
}

async function Recommendations({ product }: { product: Product }) {
  const related = await getProductRecommendations({ id: product.id, handle: product.handle, collectionHandles: product.collectionHandles }).catch(() => []);
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="relative isolate pb-12">
      {/* A blooming garland in place of a plain rule; an arrangement peeks out behind the cards on wide screens. */}
      <FloralBorder className="mb-8" />
      <FloralCorner variant="bouquet" corner="br" size="md" desktop className="lg:-right-24 xl:-right-40" />
      <SectionHeading id="related-heading" title="You May Also Like" action={{ label: "View All", href: "/products" }} />
      <ProductGrid products={related} />
    </section>
  );
}

async function ProductDetail({ params }: { params: PageProps<"/products/[handle]">["params"] }) {
  const { handle } = await params;
  const [product, ingredients] = await Promise.all([getProduct(handle), getIngredients()]);
  if (!product) notFound();
  // Shopify sends HTML (sanitised below); the database catalogue stores the structured text parsed here.
  const parsed = parseProductDescription(product.descriptionHtml ? "" : product.description, product.title);
  const summary = descriptionSummary(parsed);
  // The first paragraph is the summary under the name; the rest of the intro goes in "About this product".
  const firstParagraph = parsed.intro.find((b) => b.type === "p");
  const about = parsed.intro.filter((b) => b !== firstParagraph);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd([{ label: "Products", href: "/products" }, { label: product.title }]) }} />
      <nav aria-label="Breadcrumb" className="pt-6">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
          <li>
            <Link href="/" className="hover:text-forest">
              Home
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden className="size-3" />
            <Link href="/products" className="hover:text-forest">
              Products
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden className="size-3" />
            <span aria-current="page" className="text-ink">
              {product.title}
            </span>
          </li>
        </ol>
      </nav>
      <div className="grid gap-8 py-8 lg:grid-cols-2 lg:gap-14 lg:py-10">
        <ProductGallery images={product.images} title={product.title} />
        <div>
          {product.productType && (
            <p className="eyebrow mb-2 flex items-center gap-2">
              <FlowerMark />
              {product.productType}
            </p>
          )}
          <h1 className="text-h2 text-ink sm:text-[2.6rem]">{product.title}</h1>
          {product.rating && <Rating rating={product.rating} className="mt-2" />}
          {summary && <p className="mt-4 max-w-xl text-[0.97rem] leading-relaxed text-ink/80">{summary}</p>}
          <div className="mt-5">
            <PurchasePanel product={product} whatsapp={await getWhatsAppOrderConfig()} />
          </div>

          <div className="mt-8 border-t border-line">
            {product.descriptionHtml ? (
              <InfoSection title="Description" open>
                <div className="space-y-3 [&_a]:text-forest [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.descriptionHtml) }} />
              </InfoSection>
            ) : (
              about.length > 0 && (
                <InfoSection title="About this product" open>
                  <DescriptionBlocks blocks={about} />
                </InfoSection>
              )
            )}
            {parsed.other.map((section) => (
              <InfoSection key={section.heading} title={section.heading}>
                <DescriptionBlocks blocks={section.blocks} />
              </InfoSection>
            ))}
            <InfoSection title="Ingredients & product information">
              <div className="space-y-3">
                {product.ingredients && <p className="whitespace-pre-line">{product.ingredients}</p>}
                {parsed.keyIngredients.length > 0 ? (
                  <p>The key ingredients are listed above. The complete ingredient list is printed on the product packaging.</p>
                ) : (
                  !product.ingredients && <p className="text-muted">The full ingredient list for this product is not published on the website yet.</p>
                )}
                {parsed.notes.map((note, i) => (
                  <p key={i} className="rounded-lg border border-line bg-sand/60 px-4 py-3 text-ink/80">
                    <InlineText text={note} />
                  </p>
                ))}
                <p className="text-muted">
                  For details, message us on{" "}
                  <a
                    href={whatsappLink(`Hello QALBI Naturals, could you share the ingredient list for ${product.title}?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest underline underline-offset-2"
                  >
                    WhatsApp
                  </a>{" "}
                  or email{" "}
                  <a href={brandConfig.emailUrl} className="text-forest underline underline-offset-2">
                    {brandConfig.email}
                  </a>
                  .
                </p>
              </div>
            </InfoSection>
            {product.directions && !parsed.howToUse.length && (
              <InfoSection title="How to Use">
                <p className="whitespace-pre-line">{product.directions}</p>
              </InfoSection>
            )}
            {product.warnings && (
              <InfoSection title="Precautions">
                <p className="whitespace-pre-line">{product.warnings}</p>
              </InfoSection>
            )}
          </div>

          <a
            href={whatsappLink(`Hello QALBI Naturals, I have a question about ${product.title}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm text-forest underline-offset-4 hover:underline"
          >
            <MessageCircle className="size-4" aria-hidden /> Questions? Chat with us on WhatsApp
          </a>
        </div>
      </div>
      <ProductStory parsed={parsed} ingredients={ingredients} />
      <Suspense
        fallback={
          <div className="border-t border-line py-12">
            <ProductGridSkeleton />
          </div>
        }
      >
        <Recommendations product={product} />
      </Suspense>
    </>
  );
}

export default function ProductPage({ params }: PageProps<"/products/[handle]">) {
  return (
    <Container>
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetail params={params} />
      </Suspense>
    </Container>
  );
}
