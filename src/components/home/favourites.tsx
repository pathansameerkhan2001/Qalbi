import { getFavouriteProducts } from "@/lib/shopify";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductGrid } from "@/components/products/product-grid";

export async function Favourites() {
  const products = await getFavouriteProducts(10);
  return (
    <section aria-labelledby="favourites-heading" className="py-10 sm:py-14">
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
