import Image from "next/image";
import Link from "next/link";
import { getHomeCategories } from "@/lib/store/content";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { BotanicalIcon } from "@/components/ui/botanical-icons";

/**
 * "Shop by Category": arch-framed cards (the same arch as the ingredient cards).
 * Phones and tablets swipe one row; desktops show up to seven per row, centred.
 * Every card has the same 5:6 frame so mixed source photos line up; a category
 * without a photo gets a plain botanical tile rather than an unrelated picture.
 */
export async function CategoryScroller() {
  const homeCategories = await getHomeCategories();
  if (homeCategories.length === 0) return null;
  return (
    <section aria-labelledby="categories-heading" className="pb-8 pt-10 sm:pb-12 sm:pt-14">
      <Container>
        <SectionHeading id="categories-heading" eyebrow="Explore the range" title="Shop by Category" action={{ label: "View all products", href: "/products" }} className="mb-6 flex-row items-end justify-between sm:mb-8" />
        <ul className="scroll-row -mx-4 scroll-px-4 gap-3 px-4 pb-3 pt-1 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:mx-0 lg:flex-wrap lg:justify-center lg:gap-5 lg:overflow-visible lg:px-0">
          {homeCategories.map((category, i) => (
            <li key={category.href} className="w-[40vw] max-w-[11rem] shrink-0 sm:w-[10.5rem] lg:w-[min(11.5rem,calc((100%-7.5rem)/7))] lg:max-w-none">
              <Link href={category.href} className="group block rounded-t-full focus-visible:outline-offset-4">
                <span className="relative block aspect-[5/6] rounded-t-full rounded-b-2xl border border-gold-soft/50 bg-ivory p-1.5 shadow-soft transition duration-500 ease-out group-hover:-translate-y-1 group-hover:border-gold-soft group-hover:shadow-lift">
                  <span className="relative block size-full overflow-hidden rounded-t-full rounded-b-xl bg-sand">
                    {category.image ? (
                      <Image
                        src={category.image.src}
                        alt=""
                        fill
                        // The first cards are visible without scrolling on every screen size.
                        loading={i < 4 ? "eager" : "lazy"}
                        sizes="(min-width: 1024px) 184px, (min-width: 640px) 168px, 40vw"
                        quality={85}
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                      />
                    ) : (
                      <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_38%,var(--color-ivory),var(--color-gold-pale))] text-botanical">
                        <BotanicalIcon name="leaf" className="size-1/3" />
                      </span>
                    )}
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-forest-deep/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </span>
                </span>
                <span className="mt-3 block text-center font-serif text-[1.08rem] leading-tight text-forest transition-colors group-hover:text-gold sm:text-[1.2rem]">{category.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
