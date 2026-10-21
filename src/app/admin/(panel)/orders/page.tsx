import type { Metadata } from "next";
import Link from "next/link";
import { listOrders, orderStatuses } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { paymentMethodLabels } from "@/lib/checkout/schema";
import { AdminHeading, Card, dateTime, inr, SetupNotice, StatusBadge } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status = null } = await searchParams;
  let orders: Awaited<ReturnType<typeof listOrders>>;
  try {
    orders = await listOrders(status);
  } catch (error) {
    return (
      <>
        <AdminHeading title="Orders" />
        <SetupNotice error={error} migration="store" />
      </>
    );
  }

  return (
    <>
      <AdminHeading title="Orders" description="Cash on Delivery and pay-by-phone orders placed on the website." />
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2 text-sm">
        {[null, ...orderStatuses].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/orders?status=${s}` : "/admin/orders"}
            aria-current={status === s ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1 capitalize", status === s ? "border-forest bg-forest text-ivory" : "border-line bg-ivory hover:border-sage")}
          >
            {s ?? "All"}
          </Link>
        ))}
      </nav>
      <Card className="overflow-x-auto">
        {orders.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">No orders{status ? ` with status “${status}”` : ""} yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-sand/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-forest hover:underline">
                      {o.order_number}
                    </Link>
                    <span className="block text-xs text-muted">{dateTime(o.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {o.customer_name}
                    <span className="block text-xs text-muted">{o.phone}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{(o.order_items as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className="px-4 py-3 tabular-nums">{inr(o.total, o.currency)}</td>
                  <td className="px-4 py-3">
                    <span className="block text-xs">{paymentMethodLabels[o.payment_method as "COD" | "PHONE"]}</span>
                    <StatusBadge value={o.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
