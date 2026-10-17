"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { checkoutSchema } from "@/lib/checkout/schema";
import { clearLocalCart, readLocalLines } from "@/lib/cart/local";
import { rateLimit } from "@/lib/server/rate-limit";
import { isSupabaseCommerce, STORE_TAG } from "@/lib/store/catalog";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { clientKey, createServerWriteClient, isServerWriteConfigured } from "@/lib/supabase/server";
import { rememberOrder } from "@/lib/checkout/order-access";

export interface PlaceOrderState {
  ok: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

const friendly: Record<string, string> = {
  payment_method_disabled: "That payment option is not available right now. Please choose another.",
  product_unavailable: "An item in your bag is no longer available. Please review your bag.",
  insufficient_stock: "We don't have enough stock for an item in your bag. Please reduce the quantity.",
  invalid_request: "Please check your details and try again.",
  rate_limited: "We've received several orders from you recently. Please wait a little or contact us on WhatsApp to complete your order.",
};

/**
 * Places a Cash on Delivery or pay-by-phone order.
 * Trust boundary: the bag comes from the httpOnly cookie, and the database
 * function place_order() prices every line, checks availability/stock and the
 * enabled payment methods. Nothing price-related is accepted from the browser.
 */
export async function placeOrderAction(input: unknown): Promise<PlaceOrderState> {
  if (isShopifyConfigured() || !isSupabaseCommerce(false) || !isServerWriteConfigured()) {
    return { ok: false, message: "Online ordering is not available right now. Please contact us on WhatsApp." };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(`checkout:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.allowed) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  const lines = await readLocalLines();
  if (lines.length === 0) return { ok: false, message: "Your bag is empty." };

  // Only the website server can create orders: place_order_checked() is executable
  // with the server key alone and enforces database rate limits.
  const { data: rows, error } = await createServerWriteClient().rpc("place_order_checked", {
    p_client: await clientKey(),
    payload: {
      idempotencyKey: data.idempotencyKey,
      paymentMethod: data.paymentMethod,
      customer: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        notes: data.notes,
      },
      items: lines.map((l) => ({ productId: l.variantId, quantity: l.quantity })),
    },
  });

  if (error) {
    const code = Object.keys(friendly).find((k) => error.message.startsWith(k));
    if (!code) console.error("[checkout] place_order failed:", error.code);
    return { ok: false, message: code ? friendly[code] : "We couldn't place your order. Please try again or contact us on WhatsApp." };
  }

  const order = (rows as { order_number: string; access_token: string }[] | null)?.[0];
  if (!order) return { ok: false, message: "We couldn't place your order. Please try again." };

  await rememberOrder(await cookies(), order.order_number, order.access_token);
  await clearLocalCart();
  updateTag(STORE_TAG); // stock may have changed
  redirect(`/checkout/confirmation/${encodeURIComponent(order.order_number)}`);
}
