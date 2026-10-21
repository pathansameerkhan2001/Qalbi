import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getIngredients } from "@/lib/store/content";
import { SprigOrnament } from "@/components/ui/botanical-icons";
import { IngredientCarousel } from "./ingredient-carousel";

/** Fine gold line sprig for the section corners (decorative). */
function CornerBotanical({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 260" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" aria-hidden focusable="false" className={className}>
      <path d="M8 252C40 200 78 150 132 104 160 80 186 58 212 40" />
      <path d="M58 186c-18-6-30-22-32-44 20 6 32 22 32 44ZM58 186c18-14 40-16 58-6-18 14-40 16-58 6Z" />
      <path d="M96 140c-14-10-20-28-16-48 16 10 22 28 16 48ZM96 140c20-8 42-4 56 10-20 8-42 4-56-10Z" />
      <path d="M140 98c-8-14-6-32 6-48 8 16 6 32-6 48ZM140 98c20-2 38 8 46 24-20 2-38-8-46-24Z" />
      <path d="M186 58c-2-14 6-28 18-36 2 14-6 28-18 36Z" />
    </svg>
  );
}

export async function IngredientsPreview() {
  const ingredients = await getIngredients();
  if (ingredients.length === 0) return null;
  return (
    <section aria-labelledby="ingredients-heading" className="relative overflow-hidden py-14 sm:py-20">
      <CornerBotanical className="pointer-events-none absolute -left-6 top-6 hidden w-48 text-gold-soft/45 lg:block xl:w-56" />
      <CornerBotanical className="pointer-events-none absolute -right-6 top-6 hidden w-48 -scale-x-100 text-gold-soft/45 lg:block xl:w-56" />

      <div className="relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-14">
        <header className="mx-auto mb-9 max-w-2xl text-center sm:mb-12">
          <p className="eyebrow flex items-center justify-center gap-3 tracking-[0.32em] text-muted">
            <span aria-hidden className="h-px w-8 bg-gold-soft sm:w-14" />
            Our Ingredients
            <span aria-hidden className="h-px w-8 bg-gold-soft sm:w-14" />
          </p>
          <h2 id="ingredients-heading" className="mt-3 text-[clamp(2rem,1.4rem+2.4vw,3.4rem)] leading-[1.08] text-forest">
            Nature&rsquo;s Finest, <span className="italic text-gold">In Every Formula</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-[0.95rem]">
            We handpick the ingredients that reflect our approach to natural skincare and traditional botanical care.
          </p>
          <SprigOrnament className="mt-4 justify-center" />
        </header>

        <IngredientCarousel items={ingredients.map(({ slug, name, description, image, icon }) => ({ slug, name, description, image, icon }))} />

        <p className="mt-6 text-center">
          <Link href="/ingredients" className="inline-flex items-center gap-1.5 text-sm font-medium text-forest underline-offset-4 hover:text-gold hover:underline">
            Explore all ingredients <ArrowRight aria-hidden className="size-4" />
          </Link>
        </p>
      </div>
    </section>
  );
}
