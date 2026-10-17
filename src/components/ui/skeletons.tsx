export function ProductGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-[3px] border border-line bg-ivory">
          <div className="aspect-[4/5] animate-pulse bg-sand" />
          <div className="space-y-2 p-3.5">
            <div className="h-3 w-4/5 animate-pulse rounded bg-sand" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-sand" />
            <div className="h-9 animate-pulse rounded bg-sand" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 py-10 lg:grid-cols-2 lg:gap-14" aria-busy="true" aria-label="Loading product">
      <div className="aspect-[4/5] animate-pulse rounded-[3px] bg-sand" />
      <div className="space-y-4">
        <div className="h-10 w-3/4 animate-pulse rounded bg-sand" />
        <div className="h-6 w-1/4 animate-pulse rounded bg-sand" />
        <div className="h-24 animate-pulse rounded bg-sand" />
        <div className="h-12 animate-pulse rounded bg-sand" />
      </div>
    </div>
  );
}
