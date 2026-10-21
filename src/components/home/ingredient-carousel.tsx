"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Ingredient } from "@/types/content";
import { BotanicalIcon } from "@/components/ui/botanical-icons";
import { cn } from "@/lib/utils";

export type CarouselItem = Pick<Ingredient, "slug" | "name" | "description" | "image" | "icon">;

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Single-row ingredient carousel. Native horizontal scrolling with snap points
 * does the work (touch swipe, trackpads, keyboard arrows on the focused track);
 * the arrow buttons and dots only call scrollTo. Controls are hidden when every
 * card already fits, and scrolling is instant for reduced-motion visitors.
 */
export function IngredientCarousel({ items }: { items: CarouselItem[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ atStart: true, atEnd: false, overflow: false, active: 0 });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const cards = Array.from(el.children) as HTMLElement[];
    const start = el.getBoundingClientRect().left;
    // Active card = first card whose left edge is inside the track (within half a card).
    const active = Math.max(
      0,
      cards.findIndex((c) => c.getBoundingClientRect().left - start > -c.offsetWidth / 2),
    );
    setState({ atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= max - 2, overflow: max > 2, active: el.scrollLeft >= max - 2 && max > 2 ? cards.length - 1 : active });
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

  const scrollToCard = (index: number) => {
    const el = track.current;
    const first = el?.children[0] as HTMLElement | undefined;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !first || !card) return;
    el.scrollTo({ left: card.offsetLeft - first.offsetLeft, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

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

  const arrow = "absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-gold-soft/60 bg-ivory text-forest shadow-soft transition hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-0 md:flex";

  return (
    <div className="relative">
      <ul
        ref={track}
        tabIndex={0}
        aria-label="Ingredients — scroll sideways to see all"
        className="scroll-row -mx-4 scroll-px-4 gap-3 px-4 pb-3 pt-1 focus-visible:outline-offset-[-2px] sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
      >
        {items.map((item, i) => (
          <li
            key={item.slug}
            className="@container w-[clamp(9.75rem,41vw,12.5rem)] shrink-0 sm:w-[calc((100%-3*1rem)/3.35)] md:w-[calc((100%-4*1rem)/4.4)] lg:w-[calc((100%-4*1rem)/5)] xl:w-[calc((100%-5*1rem)/6)] 2xl:w-[calc((100%-6*1rem)/7)]"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${items.length}: ${item.name}`}
          >
            <IngredientSlide item={item} />
          </li>
        ))}
      </ul>

      {state.overflow && (
        <>
          <button type="button" onClick={() => page(-1)} disabled={state.atStart} aria-label="Previous ingredients" className={cn(arrow, "-left-1 lg:-left-6")}>
            <ChevronLeft className="size-5" strokeWidth={1.6} aria-hidden />
          </button>
          <button type="button" onClick={() => page(1)} disabled={state.atEnd} aria-label="Next ingredients" className={cn(arrow, "-right-1 lg:-right-6")}>
            <ChevronRight className="size-5" strokeWidth={1.6} aria-hidden />
          </button>
          <div className="mt-5 flex justify-center gap-1.5" role="group" aria-label="Choose ingredient">
            {items.map((item, i) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => scrollToCard(i)}
                aria-label={`Show ${item.name}`}
                aria-current={state.active === i ? "true" : undefined}
                className="flex h-6 items-center px-0.5"
              >
                <span className={cn("block h-1.5 rounded-full transition-all duration-300", state.active === i ? "w-5 bg-gold" : "w-1.5 bg-gold-soft/45 hover:bg-gold-soft")} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function IngredientSlide({ item }: { item: CarouselItem }) {
  return (
    <Link
      href={`/ingredients#${item.slug}`}
      className="group flex h-full flex-col items-center rounded-t-[50cqw] rounded-b-2xl border border-gold-soft/45 bg-ivory/80 px-2.5 pb-6 pt-2.5 text-center shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-gold-soft hover:shadow-lift focus-visible:border-gold"
    >
      <div className="relative w-full">
        <div className="relative aspect-square w-full overflow-hidden rounded-full bg-sand ring-1 ring-gold-soft/70 ring-offset-2 ring-offset-ivory">
          {item.image ? (
            <Image
              src={item.image.src}
              alt={item.image.alt}
              fill
              sizes="(min-width: 1280px) 170px, (min-width: 768px) 190px, 200px"
              quality={85}
              className="object-cover transition duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,var(--color-ivory),var(--color-gold-pale))] text-botanical">
              <BotanicalIcon name={item.icon} className="size-[46%]" />
            </span>
          )}
        </div>
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 left-1/2 flex size-11 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-gold-soft/70 bg-ivory text-gold shadow-soft sm:size-12",
            !item.image && "invisible",
          )}
        >
          <BotanicalIcon name={item.icon} className="size-6 sm:size-7" />
        </span>
      </div>
      <h3 className="mt-8 font-serif text-[1.35rem] leading-tight text-forest sm:text-[1.45rem]">{item.name}</h3>
      <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted">{item.description}</p>
    </Link>
  );
}
