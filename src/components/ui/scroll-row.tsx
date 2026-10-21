"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollRowProps {
  children: React.ReactNode;
  label: string;
  className?: string;
  /** Classes for the scrolling list itself (gap, padding). */
  listClassName?: string;
  /** Hide arrows on touch-sized screens. */
  arrowsFrom?: "sm" | "md" | "lg";
  /**
   * Milliseconds between gentle one-card advances. Off by default. Never runs for
   * reduced-motion visitors, pauses while the row is hovered, focused, touched,
   * off-screen or in a background tab, and shows a pause / play button.
   */
  autoAdvance?: number;
  /** Colour of the pause button: "dark" for rows on a dark section. */
  tone?: "light" | "dark";
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Card width + gap: one "step" of the row. */
function stepOf(el: HTMLElement): number {
  const first = el.children[0] as HTMLElement | undefined;
  return first ? first.offsetWidth + (parseFloat(getComputedStyle(el).columnGap) || 0) : 0;
}

/** Horizontally scrolling list with touch scrolling and accessible desktop arrows. */
export function ScrollRow({ children, label, className, listClassName, arrowsFrom = "md", autoAdvance, tone = "light" }: ScrollRowProps) {
  const ref = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [autoAllowed, setAutoAllowed] = useState(false);
  const [stopped, setStopped] = useState(false);
  // Temporary pauses (hover, focus, recent touch) don't re-render; the timer reads them.
  const hold = useRef({ hover: false, focus: false, touchedAt: 0, visible: false });

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

  useEffect(() => {
    const el = ref.current;
    if (!autoAdvance || !el) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoAllowed(!motion.matches && el.scrollWidth > el.clientWidth + 4);
    sync();
    motion.addEventListener("change", sync);
    const resize = new ResizeObserver(sync);
    resize.observe(el);
    const visibility = new IntersectionObserver(([entry]) => (hold.current.visible = entry.isIntersecting), { threshold: 0.5 });
    visibility.observe(el);
    return () => {
      motion.removeEventListener("change", sync);
      resize.disconnect();
      visibility.disconnect();
    };
  }, [autoAdvance]);

  useEffect(() => {
    const el = ref.current;
    if (!autoAdvance || !autoAllowed || stopped || !el) return;
    const timer = window.setInterval(() => {
      const h = hold.current;
      if (document.hidden || !h.visible || h.hover || h.focus || Date.now() - h.touchedAt < 6000) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + stepOf(el), behavior: "smooth" });
    }, autoAdvance);
    return () => window.clearInterval(timer);
  }, [autoAdvance, autoAllowed, stopped]);

  const scroll = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // Page by the cards that fit fully, so a card is never left half-scrolled.
    const s = stepOf(el) || el.clientWidth * 0.85;
    const visible = Math.max(1, Math.floor((el.clientWidth + 1) / s));
    el.scrollBy({ left: direction * s * visible, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const arrowVisibility = { sm: "sm:flex", md: "md:flex", lg: "lg:flex" }[arrowsFrom];
  const arrowClass = cn(
    "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ivory text-forest shadow-soft transition hover:bg-forest hover:text-ivory disabled:pointer-events-none disabled:opacity-0",
    arrowVisibility,
  );

  return (
    <div
      className={cn("relative", className)}
      role="region"
      aria-roledescription={autoAdvance ? "carousel" : undefined}
      aria-label={label}
      onPointerEnter={(e) => e.pointerType === "mouse" && (hold.current.hover = true)}
      onPointerLeave={() => (hold.current.hover = false)}
      onFocus={() => (hold.current.focus = true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && (hold.current.focus = false)}
      onTouchStart={() => (hold.current.touchedAt = Date.now())}
    >
      <button type="button" className={cn(arrowClass, "-left-4 lg:-left-5")} onClick={() => scroll(-1)} disabled={!canPrev} aria-label={`Scroll ${label} left`}>
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <ul ref={ref} onScroll={update} className={cn("scroll-row", listClassName)}>
        {children}
      </ul>
      <button type="button" className={cn(arrowClass, "-right-4 lg:-right-5")} onClick={() => scroll(1)} disabled={!canNext} aria-label={`Scroll ${label} right`}>
        <ChevronRight className="size-4" aria-hidden />
      </button>
      {autoAdvance && autoAllowed && (
        <button
          type="button"
          onClick={() => setStopped((s) => !s)}
          aria-pressed={stopped}
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.14em] transition",
            tone === "dark" ? "text-ivory/70 hover:bg-ivory/10 hover:text-ivory" : "text-muted hover:bg-sand hover:text-forest",
          )}
        >
          {stopped ? <Play className="size-3" aria-hidden /> : <Pause className="size-3" aria-hidden />}
          {stopped ? "Play" : "Pause"} <span className="sr-only">automatic scrolling of {label}</span>
        </button>
      )}
    </div>
  );
}
