import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import type { Cart, Product } from "@/types/commerce";

/**
 * Cookie-backed bag used when the catalogue is not Shopify (Supabase store or
 * development fixtures). The cookie stores only product ids and quantities;
 * prices always come from the catalogue on the server.
 */
export const LOCAL_CART_COOKIE = "qalbi_dev_cart";

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export type LocalLine = { variantId: string; quantity: number };

const linesSchema = z.array(z.object({ variantId: z.string().min(1).max(200), quantity: z.number().int().min(0).max(20) })).max(30);

export async function readLocalLines(): Promise<LocalLine[]> {
  const raw = (await cookies()).get(LOCAL_CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = linesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.filter((l) => l.quantity > 0) : [];
  } catch {
    return [];
  }
}

export async function writeLocalLines(lines: LocalLine[]) {
  (await cookies()).set(LOCAL_CART_COOKIE, JSON.stringify(lines.filter((l) => l.quantity > 0)), cookieOptions);
}

export async function clearLocalCart() {
  (await cookies()).delete(LOCAL_CART_COOKIE);
}

export function buildLocalCart(lines: LocalLine[], products: Product[]): Cart {
  const resolved = lines.flatMap((line) => {
    const product = products.find((p) => p.variants.some((v) => v.id === line.variantId));
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!product || !variant) return [];
    return [
      {
        id: variant.id,
        quantity: line.quantity,
        cost: { totalAmount: { amount: variant.price.amount * line.quantity, currencyCode: variant.price.currencyCode } },
        merchandise: {
          id: variant.id,
          title: variant.title,
          selectedOptions: variant.selectedOptions,
          price: variant.price,
          product: { handle: product.handle, title: product.title, featuredImage: product.featuredImage },
        },
      },
    ];
  });
  const subtotal = resolved.reduce((sum, l) => sum + l.cost.totalAmount.amount, 0);
  return {
    id: "local-cart",
    checkoutUrl: null,
    totalQuantity: resolved.reduce((sum, l) => sum + l.quantity, 0),
    lines: resolved,
    cost: {
      subtotalAmount: { amount: subtotal, currencyCode: "INR" },
      totalAmount: { amount: subtotal, currencyCode: "INR" },
      totalTaxAmount: null,
    },
  };
}
