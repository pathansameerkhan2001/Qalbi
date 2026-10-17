"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  desktopSrcSet: string;
  mobileSrcSet: string;
  src: string;
  width: number;
  height: number;
  alt: string;
}

const INTERVAL = 6500;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Reduced-motion preference; `false` during SSR and hydration so server and client markup match. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED_MOTION);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * Crossfading hero slideshow with a slow Ken Burns zoom. Auto-advance pauses on
 * hover / keyboard focus, stops for good once a visitor picks a slide, and never
 * runs for reduced-motion users.
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [held, setHeld] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const autoplay = !stopped && !reduceMotion && slides.length > 1;

  useEffect(() => {
    if (!autoplay || held) return;
    const id = window.setTimeout(() => setActive((i) => (i + 1) % slides.length), INTERVAL);
    return () => window.clearTimeout(id);
  }, [active, autoplay, held, slides.length]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="QALBI Naturals product range"
      className="relative w-full overflow-hidden bg-sand"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className="relative aspect-[4/5] w-full md:aspect-[160/86] md:max-h-[calc(100svh-7.5rem)]">
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            aria-hidden={i !== active}
            className={cn("absolute inset-0 transition-opacity duration-[1400ms] ease-out", i === active ? "opacity-100" : "opacity-0")}
          >
            <picture className="absolute inset-0 block">
              <source media="(min-width: 768px)" srcSet={slide.desktopSrcSet} sizes="100vw" />
              <source srcSet={slide.mobileSrcSet} sizes="100vw" />
              <img
                src={slide.src}
                width={slide.width}
                height={slide.height}
                alt={slide.alt}
                fetchPriority={i === 0 ? "high" : "low"}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className={cn("absolute inset-0 h-full w-full object-cover object-[50%_55%]", i === active && autoplay && "kenburns")}
              />
            </picture>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1 sm:bottom-5">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => {
                setActive(i);
                setStopped(true);
              }}
              aria-label={`Show slide ${i + 1} of ${slides.length}`}
              aria-current={i === active}
              className="flex h-6 w-9 items-center sm:w-12"
            >
              <span className={cn("block h-[2px] w-full rounded-full transition-colors duration-500", i === active ? "bg-ivory" : "bg-ivory/45 hover:bg-ivory/75")} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
