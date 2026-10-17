"use client";

import { useState } from "react";
import { LoaderCircle, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  variantId: string;
  available: boolean;
  quantity?: number;
  product: { handle: string; title: string };
  className?: string;
  size?: "sm" | "md";
}

export function AddToCartButton({ variantId, available, quantity = 1, product, className, size = "sm" }: AddToCartButtonProps) {
  const { addItem, mode } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = !available || busy || mode === "unavailable";

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const ok = await addItem(variantId, quantity, product);
          if (!ok) setError("Couldn't add to bag. Please try again.");
          setBusy(false);
        }}
        className={cn("btn btn-primary w-full", size === "sm" && "btn-sm px-2 text-[0.78rem] sm:px-3")}
        aria-label={available ? `Add ${product.title} to cart` : `${product.title} is sold out`}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ShoppingBag className="size-4 shrink-0" aria-hidden strokeWidth={1.6} />}
        {available ? "Add to Cart" : "Sold Out"}
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
