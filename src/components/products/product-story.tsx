import Image from "next/image";
import Link from "next/link";
import { Leaf } from "lucide-react";
import type { Ingredient } from "@/types/content";
import { namesIngredient, type ParsedDescription } from "@/lib/content/product-description";
import { BotanicalIcon } from "@/components/ui/botanical-icons";
import { InlineText } from "./rich-text";

/**
 * The structured part of a product page: Key Benefits, Key Ingredients, How to Use
 * and Suitable For — each shown only when the product's own description has it.
 * Ingredient photos are matched to ingredient names the product itself lists.
 */
/** The product's own wording for an ingredient, when it differs from the botanical's name. */
function listedAs(keyIngredients: string[], name: string): string | null {
  const listed = keyIngredients.filter((k) => namesIngredient([k], name) && k.toLowerCase() !== name.toLowerCase());
  return listed.length ? listed.join(", ") : null;
}

export function ProductStory({ parsed, ingredients }: { parsed: ParsedDescription; ingredients: Ingredient[] }) {
  const { benefits, keyIngredients, howToUse, suitableFor } = parsed;
  if (!benefits.length && !keyIngredients.length && !howToUse.length && !suitableFor) return null;

  const featured = ingredients.filter((i) => namesIngredient(keyIngredients, i.name));
  const featuredNames = keyIngredients.filter((k) => featured.some((i) => namesIngredient([k], i.name)));
  const others = keyIngredients.filter((k) => !featuredNames.includes(k));

  return (
    <section aria-label="Product details" className="mb-12 overflow-hidden rounded-2xl border border-line bg-ivory shadow-soft">
      {(benefits.length > 0 || howToUse.length > 0 || suitableFor) && (
        <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {benefits.length > 0 && (
            <div className="p-6 sm:p-9">
              <p className="eyebrow mb-2">Why it&apos;s in your ritual</p>
              <h2 className="font-serif text-3xl text-forest">Key Benefits</h2>
              <ul className="mt-5 space-y-3">
                {benefits.map((b, i) => (
                  <li key={i} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink/85">
                    <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sand text-botanical">
                      <Leaf className="size-3.5" />
                    </span>
                    <span>
                      <InlineText text={b} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(howToUse.length > 0 || suitableFor) && (
            <div className="p-6 sm:p-9">
              {howToUse.length > 0 && (
                <>
                  <p className="eyebrow mb-2">Directions</p>
                  <h2 className="font-serif text-3xl text-forest">How to Use</h2>
                  <ol className="mt-5 space-y-4">
                    {howToUse.map((step, i) => (
                      <li key={i} className="flex gap-4 text-[0.95rem] leading-relaxed text-ink/85">
                        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold-soft/70 font-serif text-lg text-gold-deep">
                          {i + 1}
                        </span>
                        <span className="pt-1">
                          <InlineText text={step} />
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
              {suitableFor && (
                <div className={howToUse.length ? "mt-8 border-t border-line pt-6" : undefined}>
                  <h2 className="font-serif text-2xl text-forest">Suitable For</h2>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/85">
                    <InlineText text={suitableFor} />
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {keyIngredients.length > 0 && (
        <div className="border-t border-line bg-sand/60 p-6 sm:p-9">
          <p className="eyebrow mb-2">From nature</p>
          <h2 className="font-serif text-3xl text-forest">Key Ingredients</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">The key ingredients QALBI lists for this product. This is not the complete ingredient list — see the packaging for that.</p>
          {featured.length > 0 && (
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featured.map((ingredient) => (
                <li key={ingredient.slug}>
                  <Link href={`/ingredients#${ingredient.slug}`} className="group flex h-full flex-col items-center rounded-xl border border-gold-soft/40 bg-ivory px-3 pb-5 pt-4 text-center transition hover:border-gold-soft">
                    <span className="relative block aspect-square w-full max-w-[8.5rem] overflow-hidden rounded-full bg-sand ring-1 ring-gold-soft/60 ring-offset-2 ring-offset-ivory">
                      {ingredient.image ? (
                        <Image src={ingredient.image.src} alt={ingredient.image.alt} fill sizes="136px" className="object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-botanical">
                          <BotanicalIcon name={ingredient.icon} className="size-[46%]" />
                        </span>
                      )}
                    </span>
                    <span className="mt-4 font-serif text-xl text-forest">{ingredient.name}</span>
                    {listedAs(keyIngredients, ingredient.name) && <span className="mt-0.5 text-[0.7rem] uppercase tracking-[0.12em] text-gold-deep">Listed as {listedAs(keyIngredients, ingredient.name)}</span>}
                    <span className="mt-1.5 text-xs leading-relaxed text-muted">{ingredient.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {others.length > 0 && (
            <div className="mt-6">
              {featured.length > 0 && <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">Also in the key ingredients</h3>}
              <ul className="flex flex-wrap gap-2">
                {others.map((name) => (
                  <li key={name} className="rounded-full border border-line bg-ivory px-3.5 py-1.5 text-sm text-ink/85">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
