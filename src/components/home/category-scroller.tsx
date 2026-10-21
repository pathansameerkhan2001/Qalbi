import Image from "next/image";
import Link from "next/link";
import { getHomeCategories } from "@/lib/store/content";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export async function CategoryScroller() {
  const homeCategories = await getHomeCategories();
  if (homeCategories.length === 0) return null;
  return (
    <section aria-labelledby="categories-heading" className="pb-6 pt-8 sm:pt-10">
      <Container>
        <SectionHeading
          id="categories-heading"
          title="Shop by Category"
          action={{ label: "View All", href: "/products" }}
          className="mb-5 flex-row items-end justify-between sm:mb-6 lg:sr-only"
        />
        <ul className="scroll-row -mx-4 gap-4 px-4 pb-2 sm:gap-6 lg:mx-0 lg:flex-wrap lg:justify-center lg:gap-x-8 lg:gap-y-6 lg:overflow-visible lg:px-0">
          {homeCategories.map((category) => (
            <li key={category.href} className="w-[5.5rem] shrink-0 sm:w-28 lg:w-36">
              <Link href={category.href} className="group flex flex-col items-center gap-3 text-center">
                <span className="relative block aspect-square w-full overflow-hidden rounded-full border border-line bg-ivory shadow-soft transition group-hover:border-gold-soft lg:mx-auto lg:max-w-[8.5rem]">
                  <Image
                    src={category.image.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 136px, 112px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="text-[0.78rem] font-medium leading-tight text-ink group-hover:text-forest sm:text-sm">{category.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
