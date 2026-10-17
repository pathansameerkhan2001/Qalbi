"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import type { Cart, Product } from "@/types/commerce";
import { devProducts } from "@/data/dev-products";
import { getStoreProducts, isSupabaseCommerce } from "@/lib/store/catalog";
import { buildLocalCart, cookieOptions, readLocalLines, writeLocalLines, type LocalLine } from "./local";
import { shopifyFetch } from "@/lib/shopify/client";
import { allowDevelopmentFixtures, isShopifyConfigured } from "@/lib/shopify/config";
import { toCart } from "@/lib/shopify/mappers";
import {
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_QUERY,
} from "@/lib/shopify/queries";
import type { ShopifyCart, ShopifyUserError } from "@/lib/shopify/types";

export interface CartResult {
  cart: Cart | null;
  error: string | null;
  /** "store" = Supabase catalogue with on-site checkout; "development" = preview fixtures (no checkout). */
  mode: "shopify" | "store" | "development" | "unavailable";
}

const CART_COOKIE = "qalbi_cart_id";

const idSchema = z.string().min(1).max(200);
const quantitySchema = z.number().int().min(0).max(20);

const mode = (): CartResult["mode"] =>
  isShopifyConfigured() ? "shopify" : isSupabaseCommerce(false) ? "store" : allowDevelopmentFixtures() ? "development" : "unavailable";

// ---------------------------------------------------------------------------
// Local cart (Supabase store or development fixtures) — see lib/cart/local.ts
// ---------------------------------------------------------------------------

const isLocal = (m: CartResult["mode"]) => m === "store" || m === "development";

async function localCatalog(m: CartResult["mode"]): Promise<Product[]> {
  return m === "store" ? getStoreProducts() : devProducts;
}

async function localCart(m: CartResult["mode"], lines: LocalLine[]): Promise<Cart> {
  return buildLocalCart(lines, await localCatalog(m));
}

// ---------------------------------------------------------------------------
// Shopify cart
// ---------------------------------------------------------------------------

async function runCartMutation(
  query: string,
  variables: Record<string, unknown>,
  key: "cartCreate" | "cartLinesAdd" | "cartLinesUpdate" | "cartLinesRemove",
): Promise<CartResult> {
  const data = await shopifyFetch<Record<string, { cart: ShopifyCart | null; userErrors: ShopifyUserError[] }>>(query, variables);
  const payload = data[key];
  if (payload.userErrors.length) {
    return { cart: payload.cart ? toCart(payload.cart) : null, error: payload.userErrors[0].message, mode: "shopify" };
  }
  if (payload.cart) {
    (await cookies()).set(CART_COOKIE, payload.cart.id, cookieOptions);
  }
  return { cart: payload.cart ? toCart(payload.cart) : null, error: null, mode: "shopify" };
}

async function currentCartId(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

function failure(error: unknown): CartResult {
  console.error("[cart]", error instanceof Error ? error.message : "Unknown cart error");
  return { cart: null, error: "We couldn't update your bag. Please try again.", mode: mode() };
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

export async function getCartAction(): Promise<CartResult> {
  try {
    const m = mode();
    if (isLocal(m)) return { cart: await localCart(m, await readLocalLines()), error: null, mode: m };
    if (m === "unavailable") return { cart: null, error: null, mode: m };
    const cartId = await currentCartId();
    if (!cartId) return { cart: null, error: null, mode: m };
    const data = await shopifyFetch<{ cart: ShopifyCart | null }>(CART_QUERY, { cartId });
    return { cart: data.cart ? toCart(data.cart) : null, error: null, mode: m };
  } catch (error) {
    return failure(error);
  }
}

export async function addToCartAction(variantId: string, quantity = 1): Promise<CartResult> {
  const parsed = z.object({ variantId: idSchema, quantity: quantitySchema.min(1) }).safeParse({ variantId, quantity });
  if (!parsed.success) return { cart: null, error: "Invalid product selection.", mode: mode() };

  try {
    const m = mode();
    if (m === "unavailable") return { cart: null, error: "The shop is not available right now.", mode: m };
    if (isLocal(m)) {
      const product = (await localCatalog(m)).find((p) => p.variants.some((v) => v.id === variantId));
      if (!product) return { cart: null, error: "Product not found.", mode: m };
      if (!product.availableForSale) return { cart: null, error: "This product is currently unavailable.", mode: m };
      const lines = await readLocalLines();
      const existing = lines.find((l) => l.variantId === variantId);
      if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
      else if (lines.length >= 30) return { cart: await localCart(m, lines), error: "Your bag is full.", mode: m };
      else lines.push({ variantId, quantity });
      await writeLocalLines(lines);
      return { cart: await localCart(m, lines), error: null, mode: m };
    }

    const lines = [{ merchandiseId: variantId, quantity }];
    const cartId = await currentCartId();
    if (cartId) {
      const result = await runCartMutation(CART_LINES_ADD_MUTATION, { cartId, lines }, "cartLinesAdd");
      if (result.cart) return result;
    }
    return runCartMutation(CART_CREATE_MUTATION, { lines }, "cartCreate");
  } catch (error) {
    return failure(error);
  }
}

export async function updateCartLineAction(lineId: string, quantity: number): Promise<CartResult> {
  const parsed = z.object({ lineId: idSchema, quantity: quantitySchema }).safeParse({ lineId, quantity });
  if (!parsed.success) return { cart: null, error: "Invalid quantity.", mode: mode() };

  try {
    const m = mode();
    if (m === "unavailable") return { cart: null, error: "The shop is not available right now.", mode: m };
    if (isLocal(m)) {
      const lines = (await readLocalLines()).map((l) => (l.variantId === lineId ? { ...l, quantity } : l));
      await writeLocalLines(lines);
      return { cart: await localCart(m, lines.filter((l) => l.quantity > 0)), error: null, mode: m };
    }
    const cartId = await currentCartId();
    if (!cartId) return { cart: null, error: "Your bag has expired. Please add items again.", mode: m };
    if (quantity === 0) {
      return runCartMutation(CART_LINES_REMOVE_MUTATION, { cartId, lineIds: [lineId] }, "cartLinesRemove");
    }
    return runCartMutation(CART_LINES_UPDATE_MUTATION, { cartId, lines: [{ id: lineId, quantity }] }, "cartLinesUpdate");
  } catch (error) {
    return failure(error);
  }
}

export async function removeCartLineAction(lineId: string): Promise<CartResult> {
  return updateCartLineAction(lineId, 0);
}
