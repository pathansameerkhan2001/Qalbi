import Link from "next/link";
import type { Product } from "@/types/commerce";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  products: Product[];
  className?: string;
  priorityCount?: number;
  emptyMessage?: string;
}

export function ProductGrid({ products, className, priorityCount = 0, emptyMessage = "No products are available here yet." }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-[3px] border border-dashed border-line bg-ivory/60 px-6 py-14 text-center">
        <p className="font-serif text-2xl text-ink">{emptyMessage}</p>
        <p className="mt-2 text-sm text-muted">
          Explore <Link href="/products" className="text-forest underline underline-offset-4">all products</Link> or ask us about{" "}
          <Link href="/customised-skincare" className="text-forest underline underline-offset-4">customised skincare</Link>.
        </p>
      </div>
    );
  }
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard product={product} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
