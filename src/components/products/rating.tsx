import { Star } from "lucide-react";
import type { ProductRating } from "@/types/commerce";
import { cn } from "@/lib/utils";

/** Renders a genuine store rating. Never render without real data. */
export function Rating({ rating, className }: { rating: ProductRating; className?: string }) {
  const normalized = (rating.value / rating.scaleMax) * 5;
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="sr-only">
        Rated {rating.value.toFixed(1)} out of {rating.scaleMax} from {rating.count} reviews
      </span>
      <span aria-hidden className="flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn("size-3.5", i < Math.round(normalized) ? "fill-gold text-gold" : "text-gold/40")}
            strokeWidth={1.5}
          />
        ))}
      </span>
      <span aria-hidden className="text-xs text-muted">({rating.count})</span>
    </div>
  );
}
