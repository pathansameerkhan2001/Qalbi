import Image from "next/image";
import Link from "next/link";
import type { Ingredient } from "@/types/content";
import type { Product } from "@/types/commerce";

export function IngredientCard({ ingredient, products = [] }: { ingredient: Ingredient; products?: Pick<Product, "handle" | "title">[] }) {
  const linked = products.filter((p) => ingredient.productHandles.includes(p.handle));
  return (
    <article id={ingredient.slug} className="flex h-full scroll-mt-32 flex-col overflow-hidden rounded-[3px] border border-line bg-ivory">
      <div className="relative aspect-square bg-sand">
        <Image src={ingredient.image.src} alt={ingredient.image.alt} fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" loading="lazy" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 text-center sm:p-4">
        <h3 className="font-serif text-xl text-ink">{ingredient.name}</h3>
        <p className="text-xs leading-relaxed text-muted">{ingredient.description}</p>
        {linked.length > 0 && (
          <p className="mt-2 text-xs text-ink">
            Found in:{" "}
            {linked.map((p, i) => (
              <span key={p.handle}>
                {i > 0 && ", "}
                <Link href={`/products/${p.handle}`} className="text-forest underline underline-offset-2">
                  {p.title}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}
