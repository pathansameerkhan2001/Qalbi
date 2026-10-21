import Link from "next/link";
import { ArrowRight, CircleCheck, CircleDashed, ShieldAlert } from "lucide-react";
import { getDashboard } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { getCommerceSource } from "@/lib/shopify";
import { AdminHeading, Card, sectionMigrations, SetupNotice } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type Counts = Awaited<ReturnType<typeof getDashboard>>["counts"];

/** A count, or "Setup needed" when the section's table does not exist yet. */
function Value({ n }: { n: number | null }) {
  return n === null ? <span className="text-base text-danger">Setup needed</span> : <>{n}</>;
}

function checklist(c: Counts, source: ReturnType<typeof getCommerceSource>) {
  return [
    {
      done: c.heroLive !== null && c.reelsLive !== null && c.postsLive !== null,
      title: "Hero, Reels and Blog tables",
      detail: (
        <>
          Run <code className="rounded bg-sand px-1">supabase/migrations/{sectionMigrations.content}</code> in Supabase → SQL Editor.
        </>
      ),
    },
    {
      done: c.ingredientsLive !== null,
      title: "Ingredients table",
      detail: (
        <>
          Run <code className="rounded bg-sand px-1">supabase/migrations/{sectionMigrations.ingredients}</code> after the one above.
        </>
      ),
    },
    {
      done: (c.published ?? 0) > 0,
      title: "Real products published",
      detail: (
        <>
          Add or review products in{" "}
          <Link href="/admin/products" className="text-forest underline">
            Products
          </Link>{" "}
          with confirmed prices and photos, then tick “Published”.
        </>
      ),
    },
    {
      done: source === "supabase" || source === "shopify",
      title: "Website reads this catalogue",
      detail: (
        <>
          Set <code className="rounded bg-sand px-1">COMMERCE_SOURCE=supabase</code> in Vercel (and <code className="rounded bg-sand px-1">.env.local</code>) once the products above are ready, then redeploy.
        </>
      ),
    },
  ];
}

export default async function AdminDashboard() {
  await requireAdmin();
  let data: Awaited<ReturnType<typeof getDashboard>>;
  try {
    data = await getDashboard();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Dashboard" />
        <SetupNotice error={error} migration="store" />
      </>
    );
  }
  const source = getCommerceSource();
  const c = data.counts;
  const steps = checklist(c, source);
  const stats = [
    { label: "Products on sale", value: c.published === null ? null : c.published - (c.outOfStock ?? 0), sub: c.products === null ? "" : `${c.products} in total`, href: "/admin/products" },
    { label: "Hero slides live", value: c.heroLive, sub: "Homepage banner", href: "/admin/hero" },
    { label: "Reels live", value: c.reelsLive, sub: "Instagram section", href: "/admin/reels" },
    { label: "Blog posts live", value: c.postsLive, sub: c.postsDraft ? `${c.postsDraft} draft${c.postsDraft === 1 ? "" : "s"}` : "The QALBI Journal", href: "/admin/blog" },
    { label: "Ingredients live", value: c.ingredientsLive, sub: c.ingredientsLive === 0 ? "Built-in list shown" : "Carousel", href: "/admin/ingredients" },
    { label: "Active categories", value: c.categories, sub: "Shop menu", href: "/admin/categories" },
  ];

  return (
    <>
      <AdminHeading title="Dashboard" description="Live figures from your QALBI database." />

      {steps.some((s) => !s.done) && (
        <Card className="mb-6 p-5">
          <h2 className="font-serif text-xl">Setup checklist</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {steps.map((s) => (
              <li key={s.title} className="flex gap-3">
                {s.done ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-botanical" aria-hidden /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />}
                <span>
                  <span className={cn("block font-medium", s.done ? "text-muted line-through decoration-line" : "text-ink")}>
                    {s.title}
                    <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
                  </span>
                  {!s.done && <span className="block text-muted">{s.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group rounded-[3px] border border-line bg-ivory p-5 transition hover:border-gold-soft hover:shadow-soft">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{s.label}</p>
            <p className="mt-2 font-serif text-4xl text-ink tabular-nums">
              <Value n={s.value} />
            </p>
            <p className="mt-1 flex items-center justify-between text-xs text-muted">
              {s.sub}
              <ArrowRight className="size-3.5 text-forest opacity-0 transition group-hover:opacity-100" aria-hidden />
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
