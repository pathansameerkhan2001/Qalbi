"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CircleCheck, X } from "lucide-react";
import type { Cart } from "@/types/commerce";
import {
  addToCartAction,
  getCartAction,
  removeCartLineAction,
  updateCartLineAction,
  type CartResult,
} from "@/lib/cart/actions";
import { track } from "@/lib/analytics";

interface CartContextValue {
  cart: Cart | null;
  mode: CartResult["mode"];
  loaded: boolean;
  pending: boolean;
  error: string | null;
  addItem: (variantId: string, quantity: number, meta: { handle: string; title: string }) => Promise<boolean>;
  updateLine: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [mode, setMode] = useState<CartResult["mode"]>("unavailable");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    getCartAction().then((result) => {
      if (!active) return;
      setCart(result.cart);
      setMode(result.mode);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const apply = useCallback((result: CartResult) => {
    setMode(result.mode);
    setError(result.error);
    if (result.cart || !result.error) setCart(result.cart);
    return !result.error;
  }, []);

  const addItem = useCallback<CartContextValue["addItem"]>(
    (variantId, quantity, meta) =>
      new Promise((resolve) => {
        startTransition(async () => {
          const ok = apply(await addToCartAction(variantId, quantity));
          if (ok) {
            setToast(`${meta.title} was added to your bag.`);
            track({ name: "add_to_cart", params: { product_handle: meta.handle, quantity } });
          }
          resolve(ok);
        });
      }),
    [apply],
  );

  const updateLine = useCallback<CartContextValue["updateLine"]>(
    (lineId, quantity) =>
      new Promise((resolve) => {
        startTransition(async () => {
          const result = await updateCartLineAction(lineId, quantity);
          apply(result);
          track({ name: "cart_updated", params: { quantity: result.cart?.totalQuantity ?? 0 } });
          resolve();
        });
      }),
    [apply],
  );

  const removeLine = useCallback<CartContextValue["removeLine"]>(
    (lineId) =>
      new Promise((resolve) => {
        startTransition(async () => {
          const result = await removeCartLineAction(lineId);
          apply(result);
          track({ name: "cart_updated", params: { quantity: result.cart?.totalQuantity ?? 0 } });
          resolve();
        });
      }),
    [apply],
  );

  const value = useMemo(
    () => ({ cart, mode, loaded, pending, error, addItem, updateLine, removeLine }),
    [cart, mode, loaded, pending, error, addItem, updateLine, removeLine],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center px-4 sm:top-24 sm:justify-end sm:px-6">
        {toast && (
          <div className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-[3px] border border-line bg-ivory p-4 shadow-lift">
            <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-botanical" />
            <div className="flex-1 text-sm">
              <p className="text-ink">{toast}</p>
              <Link href="/cart" className="mt-1 inline-block font-medium text-forest underline underline-offset-4" onClick={() => setToast(null)}>
                View bag
              </Link>
            </div>
            <button type="button" onClick={() => setToast(null)} className="text-muted hover:text-ink" aria-label="Dismiss notification">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
