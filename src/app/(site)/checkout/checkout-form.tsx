"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, LoaderCircle, Lock, Phone, TriangleAlert } from "lucide-react";
import type { ProductImage } from "@/types/commerce";
import { checkoutSchema, indianStates, paymentMethodLabels, type CheckoutData, type CheckoutInput, type PaymentMethod } from "@/lib/checkout/schema";
import { Field, FormStatus } from "@/components/forms/field";
import { track } from "@/lib/analytics";
import { cn, formatPrice } from "@/lib/utils";
import { placeOrderAction } from "./actions";

export interface CheckoutSummary {
  lines: { id: string; title: string; quantity: number; unitPrice: number; lineTotal: number; image: ProductImage | null }[];
  subtotal: number;
  delivery: number;
  total: number;
  freeDeliveryOver: number | null;
  methods: Record<PaymentMethod, boolean>;
  contact: { whatsappDisplay: string; email: string };
  unavailableTitles: string[];
}

const inr = (amount: number) => formatPrice({ amount, currencyCode: "INR" });

export function CheckoutForm({ summary }: { summary: CheckoutSummary }) {
  // One key per checkout attempt: retries and double-clicks can't create duplicate orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const enabled = (Object.keys(summary.methods) as PaymentMethod[]).filter((m) => summary.methods[m]);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<CheckoutInput, unknown, CheckoutData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postalCode: "",
      notes: "",
      paymentMethod: enabled[0],
      idempotencyKey,
    },
  });
  const selected = useWatch({ control, name: "paymentMethod" });
  const describe = (name: string) => ({ "aria-describedby": `checkout-${name}-desc` });

  const onSubmit = async (values: CheckoutData) => {
    setStatus(null);
    track({ name: "checkout_initiated", params: { item_count: summary.lines.reduce((n, l) => n + l.quantity, 0) } });
    const result = await placeOrderAction({ ...values, idempotencyKey });
    // On success the action redirects to the confirmation page and never returns.
    if (result && !result.ok) {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) setError(field as keyof CheckoutInput, { message });
      setStatus({ ok: false, message: result.message });
    }
  };

  const busy = isSubmitting || (isSubmitSuccessful && !status);
  const blocked = enabled.length === 0 || summary.unavailableTitles.length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <div className="space-y-8">
        <fieldset className="space-y-4">
          <legend className="mb-2 font-serif text-2xl text-ink">Delivery details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="checkout-name" label="Full name" error={errors.name?.message}>
              <input id="checkout-name" autoComplete="name" className="field" aria-invalid={errors.name ? true : undefined} {...describe("name")} {...register("name")} />
            </Field>
            <Field id="checkout-phone" label="Mobile number" error={errors.phone?.message} hint="We'll call or WhatsApp you about delivery.">
              <input id="checkout-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91" className="field" aria-invalid={errors.phone ? true : undefined} {...describe("phone")} {...register("phone")} />
            </Field>
          </div>
          <Field id="checkout-email" label="Email" optional error={errors.email?.message} hint="For your order confirmation.">
            <input id="checkout-email" type="email" autoComplete="email" className="field" aria-invalid={errors.email ? true : undefined} {...describe("email")} {...register("email")} />
          </Field>
          <Field id="checkout-addressLine1" label="House / flat, street" error={errors.addressLine1?.message}>
            <input id="checkout-addressLine1" autoComplete="address-line1" className="field" aria-invalid={errors.addressLine1 ? true : undefined} {...describe("addressLine1")} {...register("addressLine1")} />
          </Field>
          <Field id="checkout-addressLine2" label="Area, landmark" optional error={errors.addressLine2?.message}>
            <input id="checkout-addressLine2" autoComplete="address-line2" className="field" {...describe("addressLine2")} {...register("addressLine2")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="checkout-city" label="City" error={errors.city?.message}>
              <input id="checkout-city" autoComplete="address-level2" className="field" aria-invalid={errors.city ? true : undefined} {...describe("city")} {...register("city")} />
            </Field>
            <Field id="checkout-state" label="State" error={errors.state?.message}>
              <select id="checkout-state" autoComplete="address-level1" className="field" defaultValue="" aria-invalid={errors.state ? true : undefined} {...describe("state")} {...register("state")}>
                <option value="" disabled>
                  Select state
                </option>
                {indianStates.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field id="checkout-postalCode" label="PIN code" error={errors.postalCode?.message}>
              <input id="checkout-postalCode" autoComplete="postal-code" inputMode="numeric" maxLength={6} className="field" aria-invalid={errors.postalCode ? true : undefined} {...describe("postalCode")} {...register("postalCode")} />
            </Field>
          </div>
          <Field id="checkout-notes" label="Order notes" optional error={errors.notes?.message}>
            <textarea id="checkout-notes" rows={3} className="field min-h-[5.5rem] resize-y" placeholder="Delivery instructions, preferred time…" {...describe("notes")} {...register("notes")} />
          </Field>
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-serif text-2xl text-ink">Payment</legend>
          {enabled.length === 0 ? (
            <p className="rounded-[3px] border border-line bg-ivory p-4 text-sm text-muted">Online ordering is paused. Please contact us on WhatsApp {summary.contact.whatsappDisplay}.</p>
          ) : (
            <div className="space-y-3">
              {enabled.map((method) => {
                const Icon = method === "COD" ? Banknote : Phone;
                return (
                  <label
                    key={method}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-[3px] border bg-ivory p-4 transition",
                      selected === method ? "border-forest ring-1 ring-forest" : "border-line hover:border-sage",
                    )}
                  >
                    <input type="radio" value={method} className="mt-1 accent-[var(--color-forest)]" {...register("paymentMethod")} />
                    <span>
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <Icon className="size-4 text-gold" aria-hidden /> {paymentMethodLabels[method]}
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {method === "COD"
                          ? "Pay in cash when your order is delivered."
                          : `After you place your order you'll see QALBI's UPI QR code with the amount and your order number. Your order is confirmed only once QALBI has verified the payment. Questions? WhatsApp ${summary.contact.whatsappDisplay} or ${summary.contact.email}.`}
                      </span>
                    </span>
                  </label>
                );
              })}
              {errors.paymentMethod && (
                <p role="alert" className="text-xs text-danger">
                  {errors.paymentMethod.message}
                </p>
              )}
            </div>
          )}
        </fieldset>
      </div>

      <aside aria-label="Order summary" className="h-fit rounded-[3px] border border-line bg-ivory p-6 lg:sticky lg:top-28">
        <h2 className="font-serif text-2xl text-ink">Order summary</h2>
        <ul className="mt-5 divide-y divide-line">
          {summary.lines.map((line) => (
            <li key={line.id} className="flex items-center gap-3 py-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-[3px] border border-line bg-sand">
                {line.image && <Image src={line.image.url} alt={line.image.alt} fill sizes="64px" className="object-cover" />}
                <span className="absolute -right-0 -top-0 flex size-5 items-center justify-center rounded-bl-[3px] bg-forest text-[0.65rem] font-medium text-ivory">{line.quantity}</span>
              </span>
              <span className="flex-1 text-sm text-ink">
                {line.title}
                <span className="block text-xs text-muted">
                  {inr(line.unitPrice)} × {line.quantity}
                </span>
              </span>
              <span className="text-sm font-medium tabular-nums text-ink">{inr(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums text-ink">{inr(summary.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="tabular-nums text-ink">{summary.delivery === 0 ? "Free" : inr(summary.delivery)}</dd>
          </div>
          {summary.freeDeliveryOver !== null && summary.delivery > 0 && <p className="text-xs text-muted">Free delivery on orders over {inr(summary.freeDeliveryOver)}.</p>}
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt className="font-medium text-ink">Total</dt>
            <dd className="font-medium tabular-nums text-ink">{inr(summary.total)}</dd>
          </div>
        </dl>

        {summary.unavailableTitles.length > 0 && (
          <p role="alert" className="mt-4 flex gap-2 text-sm text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {summary.unavailableTitles.join(", ")} {summary.unavailableTitles.length === 1 ? "is" : "are"} no longer available. Please update your bag.
          </p>
        )}

        <div className="mt-5 space-y-3">
          <FormStatus status={status} />
          <button type="submit" disabled={busy || blocked} className="btn btn-primary w-full">
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
            {busy ? "Placing your order…" : `Place order · ${inr(summary.total)}`}
          </button>
          <p className="text-center text-xs text-muted">The final total is confirmed on our server when you place the order.</p>
          <Link href="/cart" className="block text-center text-sm text-forest underline-offset-4 hover:underline">
            Back to bag
          </Link>
        </div>
      </aside>
    </form>
  );
}
