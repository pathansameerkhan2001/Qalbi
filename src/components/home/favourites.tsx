import { getFavouriteProducts } from "@/lib/shopify";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductGrid } from "@/components/products/product-grid";
import { FloralCorner } from "@/components/ui/flowers";

export async function Favourites() {
  let products: Awaited<ReturnType<typeof getFavouriteProducts>>;
  try {
    products = await getFavouriteProducts(10);
  } catch {
    // Keep the homepage usable; the shop pages show the full error with a retry.
    return (
      <section aria-labelledby="favourites-heading" className="py-10 sm:py-14">
        <Container>
          <SectionHeading id="favourites-heading" title="The QALBI Favourites" />
          <p role="status" className="rounded-[3px] border border-dashed border-line bg-ivory/60 px-6 py-10 text-center text-sm text-muted">
            Our products couldn&apos;t be loaded just now. Please refresh the page in a moment.
          </p>
        </Container>
      </section>
    );
  }
  return (
    <section aria-labelledby="favourites-heading" className="relative isolate overflow-hidden py-10 sm:py-14">
      <FloralCorner variant="rose" corner="bl" size="md" desktop />
      <Container>
        <SectionHeading
          id="favourites-heading"
          title="The QALBI Favourites"
          description="Our best-loved skincare essentials, chosen by our community."
          action={{ label: "View All", href: "/products" }}
        />
        <ProductGrid products={products} emptyMessage="Our favourites are coming soon." />
      </Container>
    </section>
  );
}
