import { getHomeCategories } from "@/lib/store/content";
import { Container } from "@/components/ui/container";
import { BotanicalIcon, SprigOrnament } from "@/components/ui/botanical-icons";
import { CategoryCarousel } from "@/components/home/category-carousel";
import { FloralCorner } from "@/components/ui/flowers";

/**
 * "Shop by Category": the visible categories from /admin/categories, in their
 * saved order, as a single-row carousel (see CategoryCarousel). The heading and
 * data load stay on the server; only the scrolling track is a client component.
 */
export async function CategoryScroller() {
  const categories = await getHomeCategories();
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="categories-heading" className="relative isolate overflow-hidden bg-cream py-12 sm:py-16">
      <FloralCorner variant="bouquet" corner="bl" size="lg" desktop />
      <FloralCorner variant="jasmine" corner="br" size="md" desktop />
      {/* Faint botanical corners, as in the approved design. Decorative only. */}
      <BotanicalIcon name="leaf" className="pointer-events-none absolute -left-6 -top-4 size-36 -rotate-12 text-botanical/15 sm:size-48" />
      <BotanicalIcon name="leaf" className="pointer-events-none absolute -right-8 -top-6 size-40 rotate-[100deg] text-botanical/10 sm:size-52" />
      <Container className="relative">
        <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
          <h2 id="categories-heading" className="font-serif text-[2.4rem] leading-[1.05] text-forest sm:text-[3.25rem]">
            Shop by Category
          </h2>
          <SprigOrnament className="mt-3 text-gold" />
          <p className="mt-3 text-[0.95rem] text-muted sm:text-base">Explore our naturally crafted collections</p>
        </div>

        <CategoryCarousel categories={categories} />
      </Container>
    </section>
  );
}
