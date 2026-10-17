import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { z } from "zod";
import { Container } from "@/components/ui/container";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { mediaUrl } from "@/lib/assets";
import { orderToken } from "@/lib/checkout/order-access";
import { paymentMethodLabels } from "@/lib/checkout/schema";
import { orderWhatsAppMessage, whatsappUrl } from "@/lib/checkout/whatsapp";
import { getCheckoutSettings, getContactSettings } from "@/lib/store/settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

const orderSchema = z.object({
  orderNumber: z.string(),
  createdAt: z.string(),
  status: z.string(),
  paymentMethod: z.enum(["COD", "PHONE"]),
  paymentStatus: z.string(),
  customerName: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  subtotal: z.coerce.number(),
  deliveryCharge: z.coerce.number(),
  total: z.coerce.number(),
  currency: z.string(),
  items: z.array(
    z.object({
      title: z.string(),
      handle: z.string(),
      imagePath: z.string().nullable(),
      unitPrice: z.coerce.number(),
      quantity: z.number(),
      lineTotal: z.coerce.number(),
    }),
  ),
});

/** Absolute URL for an image path, suitable for a WhatsApp message (needs a public https origin). */
function absoluteImageUrl(path: string | null): string | null {
  if (!path) return null;
  const url = mediaUrl(path);
  if (url.startsWith("https://")) return url;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return site?.startsWith("https://") ? new URL(url, site).toString() : null;
}

export default async function ConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  return (
    <Container className="py-12 sm:py-16">
      <Suspense
        fallback={
          <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted">
            <LoaderCircle className="size-5 animate-spin" aria-hidden /> Loading your order…
          </p>
        }
      >
        <Confirmation params={params} />
      </Suspense>
    </Container>
  );
}

async function Confirmation({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const number = decodeURIComponent(orderNumber).slice(0, 40);
  const token = orderToken(await cookies(), number);

  let order: z.output<typeof orderSchema> | null = null;
  if (token && isSupabaseConfigured()) {
    await connection(); // private, per-customer data: only ever fetched for the real request
    const { data, error } = await createPublicClient().rpc("get_order_for_customer", { p_order_number: number, p_access_token: token });
    if (error) console.error("[confirmation] lookup failed:", error.code || error.message);
    const parsed = orderSchema.safeParse(data);
    if (parsed.success) order = parsed.data;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="font-serif text-3xl text-ink">We couldn&apos;t open this order</p>
        <p className="mt-3 text-sm text-muted">
          Order details are only shown in the browser that placed the order. If you need help with order {number}, please contact us.
        </p>
        <Link href="/contact" className="btn btn-outline mt-6">
          Contact us
        </Link>
      </div>
    );
  }

  const [contact, checkout] = await Promise.all([getContactSettings(), getCheckoutSettings()]);
  const qrPath = order.paymentMethod === "PHONE" && order.paymentStatus === "pending" ? checkout.qrImagePath : null;
  const money = (amount: number) => formatPrice({ amount, currencyCode: order.currency });
  const paymentLabel = paymentMethodLabels[order.paymentMethod];
  const message = orderWhatsAppMessage({
    orderNumber: order.orderNumber,
    items: order.items.map((i) => ({ title: i.title, quantity: i.quantity, imageUrl: absoluteImageUrl(i.imagePath) })),
    totalFormatted: money(order.total),
    paymentLabel,
  });
  const emailHref = `mailto:${contact.email}?subject=${encodeURIComponent(`Order ${order.orderNumber}`)}&body=${encodeURIComponent(message)}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-botanical" strokeWidth={1.4} aria-hidden />
        <p className="eyebrow mt-4">Order placed</p>
        <h1 className="mt-2 text-h2 text-ink">Thank you, {order.customerName.split(" ")[0]}!</h1>
        <p className="mt-3 text-sm text-muted">
          Order <strong className="font-medium text-ink">{order.orderNumber}</strong> · {formatDate(order.createdAt)}
        </p>
      </div>

      <div className="mt-8 rounded-[3px] border border-gold/30 bg-gold-pale/40 p-5 text-sm text-ink/85">
        {order.paymentMethod === "COD" ? (
          <p>
            <strong className="font-medium">Cash on Delivery.</strong> Please keep {money(order.total)} ready when your order arrives. Payment status:{" "}
            <span className="font-medium">{order.paymentStatus}</span>.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            {qrPath && (
              // eslint-disable-next-line @next/next/no-img-element -- QR must render at exact pixels, unoptimised
              <img src={mediaUrl(qrPath)} alt="QALBI Naturals UPI payment QR code" width={176} height={176} className="size-44 shrink-0 rounded-[3px] border border-line bg-white p-2" />
            )}
            <p>
              <strong className="font-medium">Pay by UPI QR.</strong> {qrPath ? <>Scan the QR code and pay {money(order.total)}, adding order number <strong className="font-medium">{order.orderNumber}</strong> as the payment note. </> : null}
              Payment status: <span className="font-medium">{order.paymentStatus}</span>. Your order is confirmed only after QALBI verifies the payment. Questions? WhatsApp{" "}
              {contact.whatsappDisplay} or {contact.email}.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a href={whatsappUrl(contact.whatsappDigits, message)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          <WhatsAppIcon className="size-4" /> Confirm Order on WhatsApp
        </a>
        <a href={emailHref} className="btn btn-outline">
          <Mail className="size-4" aria-hidden /> Email us about this order
        </a>
      </div>
      <p className="mt-2 text-center text-xs text-muted">WhatsApp opens with your order details filled in — review the message and tap send.</p>

      <section aria-label="Items" className="mt-10 rounded-[3px] border border-line bg-ivory">
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.handle + item.title} className="flex items-center gap-4 p-4">
              <span className="relative size-20 shrink-0 overflow-hidden rounded-[3px] border border-line bg-sand">
                {item.imagePath && <Image src={mediaUrl(item.imagePath)} alt={item.title} fill sizes="80px" className="object-cover" />}
              </span>
              <span className="flex-1">
                <span className="block font-medium text-ink">{item.title}</span>
                <span className="text-sm text-muted">
                  {money(item.unitPrice)} × {item.quantity}
                </span>
              </span>
              <span className="font-medium tabular-nums text-ink">{money(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-line p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{money(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="tabular-nums">{order.deliveryCharge === 0 ? "Free" : money(order.deliveryCharge)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(order.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 grid gap-6 rounded-[3px] border border-line bg-ivory p-5 text-sm sm:grid-cols-2">
        <div>
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.16em] text-gold">Delivery to</h2>
          <address className="mt-2 not-italic leading-relaxed text-ink/85">
            {order.customerName}
            <br />
            {order.addressLine1}
            {order.addressLine2 && (
              <>
                <br />
                {order.addressLine2}
              </>
            )}
            <br />
            {order.city}, {order.state} {order.postalCode}
            <br />
            {order.phone}
            {order.email && (
              <>
                <br />
                {order.email}
              </>
            )}
          </address>
        </div>
        <div>
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.16em] text-gold">Payment</h2>
          <p className="mt-2 text-ink/85">{paymentLabel}</p>
          <p className="text-muted">Status: {order.paymentStatus}</p>
          <h2 className="mt-4 font-sans text-xs font-medium uppercase tracking-[0.16em] text-gold">Order status</h2>
          <p className="mt-2 capitalize text-ink/85">{order.status}</p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link href="/products" className="text-sm font-medium text-forest underline-offset-4 hover:underline">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
