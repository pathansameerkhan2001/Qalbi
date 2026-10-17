import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { getOrder } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { mediaUrl } from "@/lib/assets";
import { paymentMethodLabels } from "@/lib/checkout/schema";
import { whatsappUrl } from "@/lib/checkout/whatsapp";
import { AdminHeading, Card, dateTime, inr, StatusBadge } from "@/components/admin/ui";
import { OrderStatusForm } from "./order-status-form";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const order = await getOrder(id);
  if (!order) notFound();

  const phoneDigits = order.phone.replace(/\D/g, "");
  const customerWhatsApp = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-forest">
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>
      <AdminHeading title={`Order ${order.order_number}`} description={`Placed ${dateTime(order.created_at)}`}>
        <div className="flex gap-2">
          <StatusBadge value={order.status} />
          <StatusBadge value={order.payment_status} />
        </div>
      </AdminHeading>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <h2 className="border-b border-line px-5 py-3 font-serif text-xl">Items</h2>
            <ul className="divide-y divide-line">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-[3px] border border-line bg-sand">
                    {item.image_path && <Image src={mediaUrl(item.image_path)} alt={item.title} fill sizes="64px" className="object-cover" />}
                  </span>
                  <span className="flex-1 text-sm">
                    <span className="block font-medium">{item.title}</span>
                    <span className="text-muted">
                      {inr(item.unit_price, order.currency)} × {item.quantity}
                    </span>
                  </span>
                  <span className="text-sm font-medium tabular-nums">{inr(item.line_total, order.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{inr(order.subtotal, order.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">{inr(order.delivery_charge, order.currency)}</dd>
              </div>
              <div className="flex justify-between text-base font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{inr(order.total, order.currency)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="grid gap-6 p-5 text-sm sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-gold">Customer</h2>
              <p className="mt-2 font-medium">{order.customer_name}</p>
              <p>
                <a href={`tel:${order.phone.replace(/\s/g, "")}`} className="text-forest hover:underline">
                  {order.phone}
                </a>
                {" · "}
                <a href={whatsappUrl(customerWhatsApp, `Hello ${order.customer_name}, this is QALBI Naturals about your order ${order.order_number}.`)} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline">
                  WhatsApp
                </a>
              </p>
              {order.email && (
                <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Your QALBI order ${order.order_number}`)}`} className="text-forest hover:underline">
                  {order.email}
                </a>
              )}
            </div>
            <div>
              <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-gold">Delivery address</h2>
              <address className="mt-2 not-italic leading-relaxed">
                {order.address_line1}
                {order.address_line2 && (
                  <>
                    <br />
                    {order.address_line2}
                  </>
                )}
                <br />
                {order.city}, {order.state} {order.postal_code}
              </address>
            </div>
            {order.notes && (
              <div className="sm:col-span-2">
                <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-gold">Customer notes</h2>
                <p className="mt-2 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h2 className="font-serif text-xl">Update order</h2>
          <p className="mt-1 text-sm text-muted">Payment: {paymentMethodLabels[order.payment_method]}</p>
          <OrderStatusForm id={order.id} status={order.status} paymentStatus={order.payment_status} paymentMethod={order.payment_method} />
        </Card>
      </div>
    </>
  );
}
