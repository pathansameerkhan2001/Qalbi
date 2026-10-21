"use client";

import Image from "next/image";
import Link from "next/link";
import { Info, LoaderCircle, Lock, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "./cart-provider";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";
import type { WhatsAppOrderConfig } from "@/lib/checkout/whatsapp";
import { deliveryChargeFor, type DeliveryTerms } from "@/lib/checkout/delivery";
import { WhatsAppOrderForm } from "./whatsapp-order-form";

export function CartView({
  checkoutOpen,
  whatsapp,
  delivery = null,
}: {
  checkoutOpen: boolean;
  whatsapp?: WhatsAppOrderConfig;
  /** Delivery terms from Store Settings (Supabase catalogue only); null = not known, shown as "to be confirmed". */
  delivery?: DeliveryTerms | null;
}) {
  const { cart, loaded, pending, error, mode, updateLine, removeLine } = useCart();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24 text-muted" aria-busy="true">
        <LoaderCircle className="size-5 animate-spin" aria-hidden /> <span className="ml-2 text-sm">Loading your bag…</span>
      </div>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-3xl text-ink">Your bag is empty</p>
        <p className="mt-2 text-sm text-muted">Discover thoughtfully crafted essentials for your ritual.</p>
        <Link href="/products" className="btn btn-primary mt-8">Shop products</Link>
      </div>
    );
  }

  const checkoutReady = Boolean(cart.checkoutUrl) && mode === "shopify";
  const subtotal = cart.cost.subtotalAmount;
  const pricesConfirmed = mode === "store" || mode === "shopify";
  const deliveryCharge = mode === "store" && delivery ? { amount: deliveryChargeFor(subtotal.amount, delivery), currencyCode: subtotal.currencyCode } : null;
  const whatsappReady = Boolean(whatsapp && /^[1-9][0-9]{9,14}$/.test(whatsapp.digits));
  const bagKey = cart.lines.map((l) => `${l.id}:${l.quantity}`).join("|");

  return (
    <div className="grid grid-cols-1 gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-label="Items in your bag">
        <ul className="divide-y divide-line border-y border-line">
          {cart.lines.map((line) => {
            const { product } = line.merchandise;
            const options = line.merchandise.selectedOptions.filter((o) => o.value !== "Default Title");
            return (
              <li key={line.id} className="flex gap-4 py-5">
                <Link href={`/products/${product.handle}`} className="relative size-20 shrink-0 overflow-hidden rounded-[3px] border border-line bg-sand sm:size-28">
                  {product.featuredImage && <Image src={product.featuredImage.url} alt={product.featuredImage.alt} fill sizes="(min-width: 640px) 112px, 80px" className="object-cover" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:justify-between">
                  <div>
                    <Link href={`/products/${product.handle}`} className="font-medium text-ink hover:text-forest">{product.title}</Link>
                    {options.length > 0 && <p className="text-xs text-muted">{options.map((o) => `${o.name}: ${o.value}`).join(" · ")}</p>}
                    <p className="mt-1 text-sm text-muted">{pricesConfirmed ? `${formatPrice(line.merchandise.price)} each` : "Price to be confirmed"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-col sm:flex-nowrap sm:items-end sm:justify-between">
                    <div className="flex h-10 items-center rounded-[3px] border border-line bg-ivory" role="group" aria-label={`Quantity for ${product.title}`}>
                      <button type="button" disabled={pending} onClick={() => updateLine(line.id, line.quantity - 1)} className="flex size-10 items-center justify-center disabled:opacity-40" aria-label={`Decrease quantity of ${product.title}`}>
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{line.quantity}</span>
                      <button type="button" disabled={pending || line.quantity >= 20} onClick={() => updateLine(line.id, line.quantity + 1)} className="flex size-10 items-center justify-center disabled:opacity-40" aria-label={`Increase quantity of ${product.title}`}>
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    {pricesConfirmed && (
                      <p className="font-medium tabular-nums text-ink">
                        <span className="sr-only">Item total: </span>
                        {formatPrice(line.cost.totalAmount)}
                      </p>
                    )}
                    <button type="button" disabled={pending} onClick={() => removeLine(line.id)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger disabled:opacity-40">
                      <Trash2 className="size-3.5" aria-hidden /> Remove<span className="sr-only"> {product.title}</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      </section>

      <aside aria-label="Order summary" className="h-fit rounded-[3px] border border-line bg-ivory p-6 lg:sticky lg:top-28">
        <h2 className="font-serif text-2xl text-ink">Order Summary</h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Subtotal ({cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"})</dt>
            <dd className="font-medium tabular-nums text-ink">{pricesConfirmed ? formatPrice(subtotal) : "To be confirmed"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{mode === "shopify" ? "Shipping & taxes" : "Delivery"}</dt>
            <dd className="text-right tabular-nums text-muted">
              {mode === "shopify" ? "Calculated at checkout" : deliveryCharge ? formatPrice(deliveryCharge) : "To be confirmed"}
              {deliveryCharge && delivery?.freeOver != null && deliveryCharge.amount > 0 && (
                <span className="block text-xs">Free over {formatPrice({ amount: delivery.freeOver, currencyCode: subtotal.currencyCode })}</span>
              )}
            </dd>
          </div>
          {deliveryCharge && (
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-base">
              <dt className="font-medium text-ink">Total</dt>
              <dd className="font-medium tabular-nums text-ink">{formatPrice({ amount: subtotal.amount + deliveryCharge.amount, currencyCode: subtotal.currencyCode })}</dd>
            </div>
          )}
        </dl>
        <div className="mt-6 space-y-4 border-t border-line pt-5">
          {mode === "store" && checkoutOpen ? (
            <Link href="/checkout" className="btn btn-primary w-full">
              <Lock className="size-4" aria-hidden /> Proceed to Checkout
            </Link>
          ) : checkoutReady ? (
            <a
              href={cart.checkoutUrl!}
              onClick={() => track({ name: "checkout_initiated", params: { item_count: cart.totalQuantity } })}
              className="btn btn-primary w-full"
            >
              <Lock className="size-4" aria-hidden /> Proceed to Checkout
            </a>
          ) : (
            <p className="flex gap-2 text-xs text-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {mode === "development"
                ? "This is a store preview: prices are not yet confirmed and online checkout is not open. You can still send us your order request on WhatsApp."
                : "Online payment is not open yet. Add your delivery details below and send us your order request on WhatsApp — we'll confirm the total and payment."}
            </p>
          )}
          {whatsapp && whatsappReady ? (
            <div className="border-t border-line pt-5">
              <WhatsAppOrderForm bagKey={bagKey} />
            </div>
          ) : whatsapp ? (
            <p role="status" className="text-xs text-muted">
              WhatsApp ordering is unavailable right now (no business WhatsApp number is set up). Please contact us by email to order.
            </p>
          ) : null}
          <Link href="/products" className="block text-center text-sm text-forest underline-offset-4 hover:underline">Continue shopping</Link>
        </div>
      </aside>
    </div>
  );
}
