"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollRowProps {
  children: React.ReactNode;
  label: string;
  className?: string;
  /** Classes for the scrolling list itself (gap, padding). */
  listClassName?: string;
  /** Hide arrows on touch-sized screens. */
  arrowsFrom?: "sm" | "md" | "lg";
}

/** Horizontally scrolling list with touch scrolling and accessible desktop arrows. */
export function ScrollRow({ children, label, className, listClassName, arrowsFrom = "md" }: ScrollRowProps) {
  const ref = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduced ? "auto" : "smooth" });
  };

  const arrowVisibility = { sm: "sm:flex", md: "md:flex", lg: "lg:flex" }[arrowsFrom];
  const arrowClass = cn(
    "absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ivory text-forest shadow-soft transition hover:bg-forest hover:text-ivory disabled:pointer-events-none disabled:opacity-0",
    arrowVisibility,
  );

  return (
    <div className={cn("relative", className)} role="region" aria-label={label}>
      <button type="button" className={cn(arrowClass, "-left-4 lg:-left-5")} onClick={() => scroll(-1)} disabled={!canPrev} aria-label={`Scroll ${label} left`}>
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <ul ref={ref} onScroll={update} className={cn("scroll-row", listClassName)}>
        {children}
      </ul>
      <button type="button" className={cn(arrowClass, "-right-4 lg:-right-5")} onClick={() => scroll(1)} disabled={!canNext} aria-label={`Scroll ${label} right`}>
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
