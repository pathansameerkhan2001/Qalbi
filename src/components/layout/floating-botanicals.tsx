import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sparkle } from "./logo";

/* Line-art botanicals drawn to match the QALBI ingredient story. */
const icons: Record<string, ReactNode> = {
  leaf: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M8 40C8 20 20 8 42 6c-1 22-13 34-34 34Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M8 40 30 18M18 30h8M14 34l1-7M23 25h6M21 27l1-6" />
    </svg>
  ),
  saffron: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M24 28c-6-2-10-9-8-18 5 2 8 7 8 12 0-5 3-10 8-12 2 9-2 16-8 18Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M24 28c-8 1-14-3-16-9 6-1 11 1 16 9Zm0 0c8 1 14-3 16-9-6-1-11 1-16 9Z" />
      <path d="M24 28v16M24 22l-3-9M24 22l3-9M24 22v-11" strokeWidth="1" />
    </svg>
  ),
  petal: (
    <svg viewBox="0 0 48 48" fill="currentColor">
      <path d="M24 4c10 8 14 18 10 28-3 7-10 10-10 12 0-2-7-5-10-12C10 22 14 12 24 4Z" opacity="0.55" />
      <path d="M24 10v30" stroke="#fffdf8" strokeOpacity="0.5" strokeWidth="0.8" fill="none" />
    </svg>
  ),
  drop: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M24 5c7 10 13 17 13 25a13 13 0 0 1-26 0c0-8 6-15 13-25Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M18 31a6 6 0 0 0 6 6" strokeLinecap="round" />
    </svg>
  ),
  lotus: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M24 36c-5-5-6-14 0-24 6 10 5 19 0 24Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M24 36c-7-1-13-7-14-17 8 1 12 7 14 17Zm0 0c7-1 13-7 14-17-8 1-12 7-14 17Z" />
      <path d="M24 36c-8 2-16 0-20-6 7-2 14 1 20 6Zm0 0c8 2 16 0 20-6-7-2-14 1-20 6Z" />
    </svg>
  ),
};

type Icon = keyof typeof icons | "sparkle";

interface Floater {
  icon: Icon;
  /** Horizontal anchor: percent from the left edge. */
  x: number;
  /** Vertical anchor: percent of viewport height. */
  y: number;
  size: number;
  color: "gold" | "sage" | "rose";
  opacity: number;
  dur: number;
  delay: number;
  rot?: number;
  /** Extra scroll-parallax travel (px) in browsers with scroll-driven animations. */
  parallax?: number;
}

/**
 * Small, subtle accents in the outer margins. The layer sits behind the page
 * content, so section backgrounds, cards, the header and the hero all cover it.
 */
const floaters: Floater[] = [
  { icon: "leaf", x: 2.5, y: 30, size: 30, color: "sage", opacity: 0.4, dur: 11, delay: 0, rot: -20, parallax: -120 },
  { icon: "saffron", x: 97, y: 38, size: 32, color: "gold", opacity: 0.4, dur: 13, delay: 1.5, rot: 12, parallax: -160 },
  { icon: "sparkle", x: 4, y: 52, size: 10, color: "gold", opacity: 0.7, dur: 4.5, delay: 0.8 },
  { icon: "lotus", x: 2.5, y: 74, size: 26, color: "rose", opacity: 0.35, dur: 12, delay: 2, rot: 25, parallax: -180 },
  { icon: "sparkle", x: 96, y: 62, size: 9, color: "gold", opacity: 0.7, dur: 5.5, delay: 2.2 },
  { icon: "drop", x: 97.5, y: 84, size: 22, color: "gold", opacity: 0.35, dur: 9, delay: 0.5, parallax: -90 },
];

// "rose" accents use the champagne of the brand palette (no colours outside the design tokens).
const tone = { gold: "text-gold", sage: "text-botanical", rose: "text-gold-soft" };

function Glyph({ icon }: { icon: Icon }) {
  return icon === "sparkle" ? <Sparkle className="size-full" /> : <span className="block size-full [&>svg]:size-full">{icons[icon]}</span>;
}

/** Decorative, non-interactive layer of softly floating botanical icons. */
export function FloatingBotanicals() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden lg:block">
      {floaters.map((f, i) => (
        <span
          key={i}
          className="float-parallax absolute"
          style={{ left: `${f.x}%`, top: `${f.y}%`, "--parallax": `${f.parallax ?? -80}px` } as CSSProperties}
        >
          <span
            className={cn("block -translate-x-1/2", f.icon === "sparkle" ? "float-twinkle" : "float-icon", tone[f.color])}
            style={
              {
                width: f.size,
                height: f.size,
                opacity: f.opacity,
                "--dur": `${f.dur}s`,
                "--delay": `-${f.delay}s`,
                "--rot": `${f.rot ?? 0}deg`,
                "--dx": `${i % 2 ? -12 : 12}px`,
                "--dy": `${-16 - (i % 3) * 8}px`,
              } as CSSProperties
            }
          >
            <Glyph icon={f.icon} />
          </span>
        </span>
      ))}
    </div>
  );
}
