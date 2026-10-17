import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { getDashboard } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { getCommerceSource } from "@/lib/shopify";
import { AdminHeading, Card, dateTime, inr, SetupNotice, StatusBadge } from "@/components/admin/ui";

export default async function AdminDashboard() {
  await requireAdmin();
  let data: Awaited<ReturnType<typeof getDashboard>>;
  try {
    data = await getDashboard();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Dashboard" />
        <SetupNotice error={error} />
      </>
    );
  }
  const source = getCommerceSource();
  const stats = [
    { label: "Total orders", value: data.counts.total, href: "/admin/orders" },
    { label: "Pending orders", value: data.counts.pending, href: "/admin/orders?status=pending" },
    { label: "Completed orders", value: data.counts.completed, href: "/admin/orders?status=delivered" },
    { label: "Products", value: data.counts.products, href: "/admin/products" },
  ];

  return (
    <>
      <AdminHeading title="Dashboard" description="Live figures from your QALBI store database." />

      {source !== "supabase" && (
        <Card className="mb-6 border-gold/40 bg-gold-pale/40 p-4 text-sm">
          The website is currently showing the {source === "shopify" ? "Shopify catalogue" : "preview catalogue"}. Set <code className="rounded bg-ivory px-1">COMMERCE_SOURCE=supabase</code> to sell the products
          managed here, with Cash on Delivery and pay-by-phone checkout.
        </Card>
      )}
      {!data.claimsVerified && (
        <Card className="mb-6 flex gap-3 border-gold/40 bg-gold-pale/40 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
          <p>
            <strong className="font-medium">Brand claims awaiting documentation.</strong> The About page states the ingredients are natural, vegan, halal and cruelty-free and free from
            parabens, lead, silicones and formaldehyde releasers. Keep supporting evidence on file, then mark the claims as verified in{" "}
            <Link href="/admin/settings#brand-claims" className="text-forest underline">
              Settings
            </Link>
            .
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-[3px] border border-line bg-ivory p-5 transition hover:border-gold-soft hover:shadow-soft">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{s.label}</p>
            <p className="mt-2 font-serif text-4xl text-ink tabular-nums">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-serif text-xl">Recent orders</h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-medium text-forest">
              All orders <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-sand/50">
                    <span>
                      <span className="font-medium">{o.order_number}</span> · {o.customer_name}
                      <span className="block text-xs text-muted">{dateTime(o.created_at)}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="tabular-nums">{inr(o.total, o.currency)}</span>
                      <StatusBadge value={o.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-serif text-xl">Recent enquiries</h2>
            <Link href="/admin/enquiries" className="inline-flex items-center gap-1 text-xs font-medium text-forest">
              All enquiries <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          {data.recentEnquiries.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No enquiries yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentEnquiries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    <span className="font-medium">{e.name}</span> · {e.kind === "custom-skincare" ? "Customised skincare" : (e.subject ?? "Contact")}
                    <span className="block text-xs text-muted">{dateTime(e.created_at)}</span>
                  </span>
                  {!e.handled && <StatusBadge value="pending" />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
