import type { Metadata } from "next";
import Image from "next/image";
import { Download, Mail } from "lucide-react";
import { getIngredients } from "@/lib/store/content";
import { productsWithIngredient } from "@/lib/content/product-description";
import { images } from "@/data/images";
import { brandConfig, ingredientsPdfUrl } from "@/data/brand";
import { getProducts } from "@/lib/shopify";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { IngredientCard } from "@/components/home/ingredient-cards";
import { ProductGrid } from "@/components/products/product-grid";
import { FloralSprig, FlowerMark } from "@/components/ui/flowers";

export const metadata: Metadata = {
  alternates: { canonical: "/ingredients" },
  title: "Ingredients",
  description: "Know what goes on your skin — explore the botanicals behind QALBI Naturals.",
};

export default async function IngredientsPage() {
  const [products, ingredients] = await Promise.all([getProducts("featured", 10).catch(() => []), getIngredients()]);
  const linkedHandles = new Set(ingredients.flatMap((i) => productsWithIngredient(i, products).map((p) => p.handle)));
  const related = linkedHandles.size ? products.filter((p) => linkedHandles.has(p.handle)) : products.slice(0, 5);

  return (
    <>
      <section aria-labelledby="ingredients-page-heading" className="overflow-hidden bg-sand">
        <div className="grid lg:grid-cols-2">
          <div className="relative isolate flex flex-col justify-center px-4 py-10 sm:px-8 sm:py-14 lg:py-20 lg:pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))] lg:pr-12">
            <FloralSprig variant="leaf" className="absolute -bottom-6 -left-4 -z-10 hidden w-44 -scale-x-100 opacity-70 md:block lg:w-52" />
            <p className="eyebrow mb-3 flex items-center gap-2">
              <FlowerMark />
              Ingredients
            </p>
            <h1 id="ingredients-page-heading" className="text-display text-ink">Know What Goes on Your Skin</h1>
            <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-ink/75">
              We believe in transparency. Explore the botanicals that inspire the QALBI ritual, and ask us anything about what&apos;s inside each product.
            </p>
            {ingredientsPdfUrl ? (
              <a href={ingredientsPdfUrl} download className="btn btn-primary mt-7 self-start">
                <Download className="size-4" aria-hidden /> Download Ingredients List (PDF)
              </a>
            ) : (
              <a
                href={`${brandConfig.emailUrl}?subject=${encodeURIComponent("Ingredients list request")}`}
                className="btn btn-primary mt-7 self-start"
              >
                <Mail className="size-4" aria-hidden /> Request the Full Ingredients List
              </a>
            )}
          </div>
          <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[480px]">
            <Image src={images.ingredients.src} alt={images.ingredients.alt} fill preload sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section aria-labelledby="botanicals-heading" className="py-12 sm:py-16">
        <Container>
          <SectionHeading id="botanicals-heading" title="Featured Botanicals" description="Short notes on the botanicals that inspire QALBI. Product-specific ingredient lists are shown on each product page." />
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
            {ingredients.map((ingredient) => (
              <li key={ingredient.slug} className="@container">
                <IngredientCard ingredient={ingredient} products={products} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="ingredient-products-heading" className="border-t border-line py-12 sm:py-16">
          <Container>
            <SectionHeading id="ingredient-products-heading" title="Explore Our Products" action={{ label: "View All", href: "/products" }} />
            <ProductGrid products={related} />
          </Container>
        </section>
      )}
    </>
  );
}
