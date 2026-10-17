"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";

export function CartButton() {
  const { cart, loaded } = useCart();
  const count = cart?.totalQuantity ?? 0;
  return (
    <Link
      href="/cart"
      className="relative inline-flex size-10 items-center justify-center text-ink transition hover:text-forest"
      aria-label={loaded ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Shopping bag"}
    >
      <ShoppingBag className="size-[1.3rem]" strokeWidth={1.6} aria-hidden />
      <span
        aria-hidden
        className="absolute right-0.5 top-0.5 flex size-[1.1rem] items-center justify-center rounded-full bg-gold text-[0.62rem] font-semibold text-ivory tabular-nums"
      >
        {count}
      </span>
    </Link>
  );
}
