import type { Money } from "@/types/commerce";
import { cn, formatPrice } from "@/lib/utils";

interface PriceProps {
  price: Money;
  compareAt?: Money | null;
  /** Shows "From" when variants have different prices. */
  from?: boolean;
  className?: string;
  size?: "sm" | "lg";
}

export function Price({ price, compareAt, from, className, size = "sm" }: PriceProps) {
  const onSale = compareAt && compareAt.amount > price.amount;
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      {from && <span className="text-xs text-muted">From</span>}
      <span className={cn("font-medium text-ink tabular-nums", size === "lg" ? "text-2xl" : "text-[0.95rem] sm:text-base")}>
        {onSale && <span className="sr-only">Sale price </span>}
        {formatPrice(price)}
      </span>
      {onSale && (
        <s className={cn("text-muted tabular-nums", size === "lg" ? "text-base" : "text-xs")}>
          <span className="sr-only">Regular price </span>
          {formatPrice(compareAt)}
        </s>
      )}
    </p>
  );
}
