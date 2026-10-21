"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Product } from "@/types/commerce";
import { track } from "@/lib/analytics";
import { cn, formatPrice } from "@/lib/utils";
import { publicImageUrl, type WhatsAppOrderConfig } from "@/lib/checkout/whatsapp";
import { WhatsAppOrderButton } from "./whatsapp-order-button";
import { AddToCartButton } from "./add-to-cart-button";
import { Price } from "./price";

export function PurchasePanel({ product, whatsapp }: { product: Product; whatsapp?: WhatsAppOrderConfig }) {
  const realOptions = product.options.filter((o) => !(o.values.length === 1 && o.values[0] === "Default Title"));
  const firstAvailable = product.variants.find((v) => v.availableForSale) ?? product.variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(firstAvailable?.selectedOptions.map((o) => [o.name, o.value]) ?? []),
  );
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    track({ name: "product_viewed", params: { product_handle: product.handle } });
  }, [product.handle]);

  const variant = useMemo(
    () => product.variants.find((v) => v.selectedOptions.every((o) => selected[o.name] === o.value)) ?? null,
    [product.variants, selected],
  );

  const maxQty = Math.min(20, variant?.quantityAvailable && variant.quantityAvailable > 0 ? variant.quantityAvailable : 20);
  const available = Boolean(variant?.availableForSale);

  return (
    <div className="space-y-6">
      <Price price={variant?.price ?? product.priceRange.min} compareAt={variant?.compareAtPrice} size="lg" />

      {realOptions.map((option) => (
        <fieldset key={option.name}>
          <legend className="label">
            {option.name}: <span className="font-normal text-muted">{selected[option.name]}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selected[option.name] === value;
              const candidate = product.variants.find((v) =>
                v.selectedOptions.every((o) => (o.name === option.name ? o.value === value : selected[o.name] === o.value)),
              );
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected((s) => ({ ...s, [option.name]: value }))}
                  className={cn(
                    "min-h-10 rounded-[3px] border px-4 text-sm transition",
                    isSelected ? "border-forest bg-forest text-ivory" : "border-line bg-ivory text-ink hover:border-sage",
                    !candidate?.availableForSale && "line-through decoration-muted/70",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p className={cn("text-sm", available ? "text-botanical" : "text-danger")} role="status">
        {!variant
          ? "This combination is unavailable."
          : !available
            ? "Currently sold out."
            : variant.quantityAvailable !== null && variant.quantityAvailable > 0 && variant.quantityAvailable <= 5
              ? `In stock — only ${variant.quantityAvailable} left.`
              : "In stock"}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-12 w-full items-center justify-between rounded-[3px] border border-line bg-ivory sm:w-36" role="group" aria-label="Quantity">
          <button type="button" className="flex size-12 items-center justify-center text-ink disabled:opacity-40" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">
            <Minus className="size-4" aria-hidden />
          </button>
          <output aria-live="polite" className="w-8 text-center tabular-nums">{quantity}</output>
          <button type="button" className="flex size-12 items-center justify-center text-ink disabled:opacity-40" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} aria-label="Increase quantity">
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <AddToCartButton
          variantId={variant?.id ?? ""}
          available={available}
          quantity={quantity}
          product={{ handle: product.handle, title: product.title }}
          size="md"
          className="[&>button]:h-12"
        />
      </div>

      {whatsapp && variant && (
        <WhatsAppOrderButton
          digits={whatsapp.digits}
          label={available ? "Order on WhatsApp" : "Ask about availability on WhatsApp"}
          estimatedTotal={whatsapp.priceConfirmed ? formatPrice({ amount: variant.price.amount * quantity, currencyCode: variant.price.currencyCode }) : null}
          items={[
            {
              title: product.title,
              quantity,
              unitPrice: whatsapp.priceConfirmed ? formatPrice(variant.price) : null,
              url: whatsapp.siteOrigin ? `${whatsapp.siteOrigin}/products/${product.handle}` : null,
              imageUrl: publicImageUrl((variant.image ?? product.featuredImage)?.url, whatsapp.siteOrigin),
              details: product.description,
            },
          ]}
        />
      )}
    </div>
  );
}
