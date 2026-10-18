import { cn, formatPrice } from "@/lib/utils";

export function AdminHeading({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

const tone: Record<string, string> = {
  pending: "bg-gold-pale text-[#7a5418]",
  confirmed: "bg-sage/20 text-forest",
  shipped: "bg-sky-100 text-sky-800",
  delivered: "bg-botanical/15 text-forest",
  cancelled: "bg-danger/10 text-danger",
  paid: "bg-botanical/15 text-forest",
  failed: "bg-danger/10 text-danger",
  refunded: "bg-line text-muted",
};

export function StatusBadge({ value }: { value: string }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[0.7rem] font-medium capitalize", tone[value] ?? "bg-line text-muted")}>{value}</span>;
}

export function Card({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("rounded-[3px] border border-line bg-ivory", className)}>
      {children}
    </section>
  );
}

export const inr = (amount: number | string, currencyCode = "INR") => formatPrice({ amount: Number(amount), currencyCode });

export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export function SetupNotice({ error }: { error: unknown }) {
  return (
    <Card className="p-6 text-sm">
      <p className="font-medium text-danger">The admin data could not be loaded.</p>
      <p className="mt-1 text-muted">{error instanceof Error ? error.message : "Please try again."}</p>
      <p className="mt-3 text-muted">
        If this persists, check that the migrations in <code className="rounded bg-sand px-1">supabase/migrations/</code> have been applied in the Supabase SQL Editor.
      </p>
    </Card>
  );
}
