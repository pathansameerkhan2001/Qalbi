"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Review cards. Phones: one card at a time in a swipeable, snapping row with
 * Previous / Next buttons and position dots. From 640 px: a wrapping grid —
 * two cards per row, three from 1024 px — with any last-row cards centred.
 */
export function ReviewCarousel({ label, children }: { label: string; children: ReactNode }) {
  const items = Children.toArray(children);
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  const sync = useCallback(() => {
    const el = list.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return;
    const step = first.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 0);
    setActive(Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
  }, [items.length]);

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    return () => el.removeEventListener("scroll", sync);
  }, [sync]);

  const go = (i: number) => {
    const el = list.current;
    const target = el?.children[i] as HTMLElement | undefined;
    if (!el || !target) return;
    // Centre the card, matching snap-center.
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft - (el.clientWidth - target.offsetWidth) / 2, behavior: reducedMotion() ? "auto" : "smooth" });
    setActive(i);
  };

  const arrow = "flex size-11 items-center justify-center rounded-full border border-gold-soft/60 bg-ivory text-forest transition hover:border-gold disabled:opacity-35";

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label}>
      <ul
        ref={list}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <li key={i} aria-roledescription="slide" aria-label={`${i + 1} of ${items.length}`} className="w-[86%] shrink-0 snap-center sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]">
            {item}
          </li>
        ))}
      </ul>

      {items.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 sm:hidden">
          <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous review" className={arrow}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <div className="flex items-center">
            {items.map((_, i) => (
              <button key={i} type="button" onClick={() => go(i)} aria-label={`Show review ${i + 1} of ${items.length}`} aria-current={i === active ? "true" : undefined} className="flex size-7 items-center justify-center">
                <span className={cn("block rounded-full transition-all duration-300", i === active ? "h-1.5 w-5 bg-gold" : "size-1.5 bg-gold/35")} />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => go(active + 1)} disabled={active === items.length - 1} aria-label="Next review" className={arrow}>
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
