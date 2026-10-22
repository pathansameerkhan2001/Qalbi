import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getHomeCategories } from "@/lib/store/content";
import { Container } from "@/components/ui/container";
import { BotanicalIcon, SprigOrnament } from "@/components/ui/botanical-icons";

/**
 * "Shop by Category": image-led cards in a 4-column grid (two rows for eight
 * categories), two columns on tablets and phones, one column below 340 px.
 * Every image sits in the same 4:3 frame (object-cover), so mixed source photos
 * line up; a category without a photo gets a plain botanical tile rather than an
 * unrelated picture. Hover lift and zoom are CSS-only and off for reduced motion.
 */
export async function CategoryScroller() {
  const categories = await getHomeCategories();
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="categories-heading" className="relative overflow-hidden bg-cream py-12 sm:py-16">
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

        <ul className="grid grid-cols-1 gap-3 min-[340px]:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {categories.map((category) => (
            <li key={category.href}>
              <Link
                href={category.href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold-soft/45 bg-ivory shadow-soft transition duration-500 ease-out hover:-translate-y-1 hover:border-gold-soft hover:shadow-lift focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-sand">
                  {category.image ? (
                    <Image
                      src={category.image.src}
                      alt={category.image.alt}
                      fill
                      sizes="(min-width: 1024px) 300px, (min-width: 340px) 46vw, 92vw"
                      quality={85}
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,var(--color-ivory),var(--color-gold-pale))] text-botanical">
                      <BotanicalIcon name="leaf" className="size-1/3" />
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col items-center justify-between gap-2 border-t border-gold-soft/30 px-3 pb-4 pt-3.5 text-center sm:px-5 sm:pb-5 sm:pt-4">
                  <span className="font-serif text-[1.15rem] leading-tight text-forest text-balance sm:text-[1.45rem]">{category.label}</span>
                  <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-gold-deep sm:text-sm">
                    Shop Now <ArrowRight aria-hidden className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
