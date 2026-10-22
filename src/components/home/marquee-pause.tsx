"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * Pause / play for the benefits marquee (WCAG 2.2.2). It sets data-paused on
 * the enclosing [data-benefits] section; the CSS shows it only while the strip moves.
 */
export function MarqueePause() {
  const [paused, setPaused] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        const next = !paused;
        e.currentTarget.closest("[data-benefits]")?.toggleAttribute("data-paused", next);
        setPaused(next);
      }}
      aria-label={paused ? "Play moving benefits" : "Pause moving benefits"}
      aria-pressed={paused}
      className="benefits-pause absolute right-2 top-1/2 size-8 -translate-y-1/2 items-center justify-center rounded-full border border-gold-soft/60 bg-ivory text-forest shadow-soft transition hover:border-gold hover:text-gold"
    >
      {paused ? <Play className="size-3 translate-x-px" fill="currentColor" aria-hidden /> : <Pause className="size-3" fill="currentColor" aria-hidden />}
    </button>
  );
}
