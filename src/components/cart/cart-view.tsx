"use client";

import Image from "next/image";
import Link from "next/link";
import { Info, LoaderCircle, Lock, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "./cart-provider";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";
import { publicImageUrl, type WhatsAppOrderConfig } from "@/lib/checkout/whatsapp";
import { WhatsAppOrderButton } from "@/components/products/whatsapp-order-button";

export function CartView({ checkoutOpen, whatsapp }: { checkoutOpen: boolean; whatsapp?: WhatsAppOrderConfig }) {
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

  return (
    <div className="grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
      <section aria-label="Items in your bag">
        <ul className="divide-y divide-line border-y border-line">
          {cart.lines.map((line) => {
            const { product } = line.merchandise;
            const options = line.merchandise.selectedOptions.filter((o) => o.value !== "Default Title");
            return (
              <li key={line.id} className="flex gap-4 py-5">
                <Link href={`/products/${product.handle}`} className="relative size-24 shrink-0 overflow-hidden rounded-[3px] border border-line bg-sand sm:size-28">
                  {product.featuredImage && <Image src={product.featuredImage.url} alt={product.featuredImage.alt} fill sizes="112px" className="object-cover" />}
                </Link>
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-between">
                  <div>
                    <Link href={`/products/${product.handle}`} className="font-medium text-ink hover:text-forest">{product.title}</Link>
                    {options.length > 0 && <p className="text-xs text-muted">{options.map((o) => `${o.name}: ${o.value}`).join(" · ")}</p>}
                    <p className="mt-1 text-sm text-muted">{formatPrice(line.merchandise.price)} each</p>
                  </div>
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:justify-between">
                    <div className="flex h-10 items-center rounded-[3px] border border-line bg-ivory" role="group" aria-label={`Quantity for ${product.title}`}>
                      <button type="button" disabled={pending} onClick={() => updateLine(line.id, line.quantity - 1)} className="flex size-10 items-center justify-center disabled:opacity-40" aria-label={`Decrease quantity of ${product.title}`}>
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{line.quantity}</span>
                      <button type="button" disabled={pending || line.quantity >= 20} onClick={() => updateLine(line.id, line.quantity + 1)} className="flex size-10 items-center justify-center disabled:opacity-40" aria-label={`Increase quantity of ${product.title}`}>
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <p className="font-medium tabular-nums text-ink">{formatPrice(line.cost.totalAmount)}</p>
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
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal ({cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"})</dt>
            <dd className="font-medium tabular-nums text-ink">{formatPrice(cart.cost.subtotalAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{mode === "store" ? "Delivery" : "Shipping & taxes"}</dt>
            <dd className="text-right text-muted">Calculated at checkout</dd>
          </div>
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
                ? "This is a store preview: prices are not yet confirmed and online checkout is not open. You can still send us your order on WhatsApp."
                : "Online checkout is not open yet. Send us your order on WhatsApp and we'll confirm the total and payment."}
            </p>
          )}
          {whatsapp && (
            <WhatsAppOrderButton
              digits={whatsapp.digits}
              estimatedTotal={whatsapp.priceConfirmed ? formatPrice(cart.cost.subtotalAmount) : null}
              items={cart.lines.map((line) => ({
                title: line.merchandise.product.title,
                quantity: line.quantity,
                unitPrice: whatsapp.priceConfirmed ? formatPrice(line.merchandise.price) : null,
                url: whatsapp.siteOrigin ? `${whatsapp.siteOrigin}/products/${line.merchandise.product.handle}` : null,
                imageUrl: publicImageUrl(line.merchandise.product.featuredImage?.url, whatsapp.siteOrigin),
              }))}
            />
          )}
          <Link href="/products" className="block text-center text-sm text-forest underline-offset-4 hover:underline">Continue shopping</Link>
        </div>
      </aside>
    </div>
  );
}
