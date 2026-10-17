"use client";

import { useRouter } from "next/navigation";
import type { ProductSortKey } from "@/types/commerce";
import { sortOptions } from "@/lib/sort";

export function SortSelect({ value, basePath }: { value: ProductSortKey; basePath: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-xs uppercase tracking-[0.15em] text-muted">
        Sort
      </label>
      <select
        id="sort"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          router.push(next === "featured" ? basePath : `${basePath}?sort=${next}`, { scroll: false });
        }}
        className="field min-h-10 w-auto py-1.5 pr-8 text-sm"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
