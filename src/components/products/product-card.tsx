import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/commerce";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "./add-to-cart-button";
import { Price } from "./price";
import { Rating } from "./rating";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  className?: string;
}

export function ProductCard({ product, priority, className }: ProductCardProps) {
  const singleVariant = product.variants.length === 1 ? product.variants[0] : null;
  const href = `/products/${product.handle}`;
  const hasRange = product.priceRange.min.amount !== product.priceRange.max.amount;
  const compareAt = singleVariant?.compareAtPrice ?? null;
  const hoverImage = product.images.find((img) => img.url !== product.featuredImage?.url) ?? null;

  return (
    <article className={cn("group flex h-full flex-col overflow-hidden rounded-[3px] border border-line bg-ivory transition duration-500 hover:-translate-y-1 hover:border-gold-soft/60 hover:shadow-lift", className)}>
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden bg-sand" tabIndex={-1} aria-hidden>
        {product.featuredImage && (
          <Image
            src={product.featuredImage.url}
            alt=""
            fill
            preload={priority}
            sizes="(min-width: 1280px) 240px, (min-width: 1024px) 23vw, (min-width: 640px) 45vw, 48vw"
            className={cn("object-cover transition duration-700 group-hover:scale-[1.04]", hoverImage && "group-hover:opacity-0")}
          />
        )}
        {hoverImage && (
          <Image
            src={hoverImage.url}
            alt=""
            fill
            loading="lazy"
            sizes="(min-width: 1280px) 240px, (min-width: 1024px) 23vw, (min-width: 640px) 45vw, 48vw"
            className="scale-[1.04] object-cover opacity-0 transition duration-700 group-hover:scale-100 group-hover:opacity-100"
          />
        )}
        {!product.availableForSale && (
          <span className="absolute left-2 top-2 rounded-[2px] bg-ink/80 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-ivory">
            Sold out
          </span>
        )}
        {compareAt && singleVariant && compareAt.amount > singleVariant.price.amount && (
          <span className="absolute left-2 top-2 rounded-[2px] bg-gold px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-ivory">
            Sale
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3.5">
        <h3 className="font-sans text-[0.8rem] font-medium leading-snug text-ink sm:text-sm">
          <Link href={href} className="line-clamp-2 min-h-[2.5em] hover:text-forest">
            {product.title}
          </Link>
        </h3>
        {product.rating && <Rating rating={product.rating} />}
        <Price price={product.priceRange.min} compareAt={compareAt} from={hasRange} />
        <div className="mt-auto pt-1.5">
          {singleVariant ? (
            <AddToCartButton
              variantId={singleVariant.id}
              available={singleVariant.availableForSale}
              product={{ handle: product.handle, title: product.title }}
            />
          ) : (
            <Link href={href} className="btn btn-outline btn-sm w-full px-2 text-[0.78rem]">
              Choose Options
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
