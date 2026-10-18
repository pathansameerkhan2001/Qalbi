import { LoaderCircle } from "lucide-react";

/** Shown inside the admin frame while a page's data loads. */
export default function AdminLoading() {
  return (
    <div role="status" className="space-y-6">
      <div className="h-9 w-56 animate-pulse rounded bg-sand" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-[3px] border border-line bg-ivory" />
        ))}
      </div>
      <p className="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading…
      </p>
    </div>
  );
}
