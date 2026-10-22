import Image from "next/image";
import Link from "next/link";
import type { Ingredient } from "@/types/content";
import type { Product } from "@/types/commerce";
import { BotanicalIcon } from "@/components/ui/botanical-icons";
import { productsWithIngredient } from "@/lib/content/product-description";

/** Ingredient card for the /ingredients page: same circle-and-badge styling as the homepage carousel. */
export function IngredientCard({ ingredient, products = [] }: { ingredient: Ingredient; products?: Pick<Product, "handle" | "title" | "description">[] }) {
  const linked = productsWithIngredient(ingredient, products);
  return (
    <article id={ingredient.slug} className="flex h-full scroll-mt-32 flex-col items-center rounded-t-[50cqw] rounded-b-2xl border border-gold-soft/45 bg-ivory/80 px-3 pb-6 pt-3 text-center shadow-soft">
      <div className="relative w-full max-w-[13rem]">
        <div className="relative aspect-square w-full overflow-hidden rounded-full bg-sand ring-1 ring-gold-soft/70 ring-offset-2 ring-offset-ivory">
          {ingredient.image ? (
            <Image src={ingredient.image.src} alt={ingredient.image.alt} fill sizes="(min-width: 1024px) 208px, 42vw" quality={85} className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,var(--color-ivory),var(--color-gold-pale))] text-botanical">
              <BotanicalIcon name={ingredient.icon} className="size-[46%]" />
            </span>
          )}
        </div>
        {ingredient.image && (
          <span aria-hidden className="absolute bottom-0 left-1/2 flex size-11 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-gold-soft/70 bg-ivory text-gold shadow-soft">
            <BotanicalIcon name={ingredient.icon} className="size-6" />
          </span>
        )}
      </div>
      <h3 className="mt-8 font-serif text-2xl text-forest">{ingredient.name}</h3>
      <p className="mt-1.5 max-w-[16rem] text-[0.82rem] leading-relaxed text-muted">{ingredient.description}</p>
      {linked.length > 0 && (
        <p className="mt-3 text-xs text-ink">
          Found in:{" "}
          {linked.map((p, i) => (
            <span key={p.handle}>
              {i > 0 && ", "}
              <Link href={`/products/${p.handle}`} className="text-forest underline underline-offset-2 hover:text-gold">
                {p.title}
              </Link>
            </span>
          ))}
        </p>
      )}
    </article>
  );
}
