"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Category } from "@/types/content";
import { BotanicalIcon } from "@/components/ui/botanical-icons";
import { cn } from "@/lib/utils";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One-row "Shop by Category" track: about 1.2 cards on phones (the next card
 * peeks in as a swipe hint), 2–3 on tablets and four from 1200 px. Native
 * horizontal scrolling with snap points handles touch, trackpads and keyboard
 * focus; the desktop arrows only call scrollBy, are disabled at either end and
 * hidden when every card already fits. Nothing moves on its own.
 */
export function CategoryCarousel({ categories }: { categories: Category[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ atStart: true, atEnd: false, overflow: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setState({ atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= max - 2, overflow: max > 2 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const resize = new ResizeObserver(onScroll);
    resize.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      resize.disconnect();
    };
  }, [measure]);

  const page = (direction: 1 | -1) => {
    const el = track.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = first.offsetWidth + gap;
    // Move by the number of fully visible cards (at least one).
    const visible = Math.max(1, Math.floor((el.clientWidth + gap) / step));
    el.scrollBy({ left: direction * step * visible, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const arrow =
    "absolute top-[40%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-gold-soft/60 bg-ivory text-forest shadow-soft transition hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none md:flex motion-reduce:transition-none";

  return (
    <div className="relative">
      <ul
        ref={track}
        aria-label="Shop categories — scroll sideways to see all"
        className="scroll-row -mx-4 scroll-px-4 gap-3 px-4 pb-4 pt-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:gap-5 lg:px-0 min-[75rem]:gap-6"
      >
        {categories.map((category, i) => (
          <li
            key={category.href}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${categories.length}: ${category.label}`}
            className="w-[calc((100%-0.75rem)/1.2)] shrink-0 sm:w-[calc((100%-2*1rem)/2.3)] md:w-[calc((100%-2*1rem)/2.6)] lg:w-[calc((100%-3*1.25rem)/3.3)] min-[75rem]:w-[calc((100%-3*1.5rem)/4)]"
          >
            <CategoryCard category={category} />
          </li>
        ))}
      </ul>

      {state.overflow && (
        <>
          <button type="button" onClick={() => page(-1)} disabled={state.atStart} aria-label="Previous categories" className={cn(arrow, "-left-1 lg:-left-6")}>
            <ChevronLeft className="size-5" strokeWidth={1.6} aria-hidden />
          </button>
          <button type="button" onClick={() => page(1)} disabled={state.atEnd} aria-label="Next categories" className={cn(arrow, "-right-1 lg:-right-6")}>
            <ChevronRight className="size-5" strokeWidth={1.6} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

/** Every image sits in the same 4:3 frame (object-cover); a category without a photo gets a plain botanical tile. */
function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={category.href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold-soft/45 bg-ivory shadow-soft transition duration-500 ease-out hover:-translate-y-1 hover:border-gold-soft hover:shadow-lift focus-visible:outline-offset-[-3px] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="relative block aspect-[4/3] overflow-hidden bg-sand">
        {category.image ? (
          <Image
            src={category.image.src}
            alt={category.image.alt}
            fill
            sizes="(min-width: 1200px) 300px, (min-width: 1024px) 30vw, (min-width: 768px) 37vw, (min-width: 640px) 42vw, 82vw"
            quality={85}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,var(--color-ivory),var(--color-gold-pale))] text-botanical">
            <BotanicalIcon name="leaf" className="size-1/3" />
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col items-center justify-between gap-2 border-t border-gold-soft/30 px-3 pb-4 pt-3.5 text-center sm:px-5 sm:pb-5 sm:pt-4">
        <span className="font-serif text-[1.25rem] leading-tight text-forest text-balance sm:text-[1.4rem]">{category.label}</span>
        <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-gold-deep sm:text-sm">
          Shop Now <ArrowRight aria-hidden className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </span>
    </Link>
  );
}
