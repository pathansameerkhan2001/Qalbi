import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
 * Rose petals drifting through the site. CSS only (globals.css, “Petals”):
 * every petal is a few compositor-only transforms (fall, sway, turn) on a fixed,
 * bounded pool of elements — no JavaScript, no per-frame React work, nothing is
 * ever added or removed, so route changes never restart or burst them (the
 * site layer lives in the persistent site frame). Each starts part-way through
 * its fall (negative delay), so the stream is already flowing on arrival.
 * Decorative only: hidden from assistive technology, never takes clicks, not
 * shown with reduced motion, paused while the tab is hidden.
 *
 * Tones: blush and dusty rose (owner-approved floral colours), champagne and
 * ivory (brand tokens), with the odd sage leaf; three depths (far = small,
 * slow, soft; near = larger, quicker, shadowed); shapes: rounded petals,
 * larger curled petals and tiny rosebuds.
 */

type Tone = "blush" | "dusty" | "champagne" | "ivory" | "leaf";
type Shape = "petal" | "curl" | "bud" | "leaf";
type Depth = "far" | "mid" | "near";
/** Where a petal of the site layer appears: every screen, from tablets, or desktops only. */
type Reach = "all" | "md" | "lg";

interface Petal {
  /** Horizontal start, % of the layer width. */
  x: number;
  size: number;
  /** Seconds for one fall, one sway (left↔right) and one full turn. */
  fall: number;
  sway: number;
  spin: number;
  /** How far into its fall it starts (s), so nothing begins at once. */
  delay: number;
  tone: Tone;
  shape: Shape;
  depth: Depth;
  reach?: Reach;
}

// 24 × 24 shapes: a body, a soft shade at the base and a light vein, coloured by the tone's custom properties.
const shapes: Record<Shape, React.ReactNode> = {
  petal: (
    <>
      <path d="M12 2C17.5 5 21 11 18.5 17c-1.6 3.6-4.2 5-6.5 5s-4.9-1.4-6.5-5C3 11 6.5 5 12 2Z" className="pt-body" />
      <path d="M5.6 15.5c1.5 3.7 4 5.3 6.4 5.3s4.9-1.6 6.4-5.3c-2 1.4-4.2 2.1-6.4 2.1s-4.4-.7-6.4-2.1Z" className="pt-shade" />
      <path d="M12 5.5c2.6 2.4 3.8 5.6 3 8.8" className="pt-vein" />
    </>
  ),
  curl: (
    <>
      <path d="M3 14C4 7 10 3 17 3c3 0 4.5 1.3 4 3.3-1 4.6-6.4 6-9.6 6.2 2.8.8 4.6 2.5 4.6 4.8 0 3.2-3.8 4.9-7.7 4.6C5.3 21.6 2.6 18.6 3 14Z" className="pt-body" />
      <path d="M11.4 12.5c2.8.8 4.6 2.5 4.6 4.8 0 3.2-3.8 4.9-7.7 4.6 3.4-1 5.4-3.6 3.1-9.4Z" className="pt-shade" />
      <path d="M6 15c2.5-4.5 6.5-7.5 12-9" className="pt-vein" />
    </>
  ),
  bud: (
    <>
      <circle cx="12" cy="12" r="8" className="pt-body" />
      <path d="M12 6.5c3 0 5 2.2 5 4.7 0 2.8-2.4 4.6-5 4.6-2.2 0-3.8-1.5-3.8-3.4 0-1.8 1.4-3 3-3 1.3 0 2.2.9 2.2 2" className="pt-vein pt-vein--deep" />
      <path d="M4.8 15c1.6 3 4.2 4.8 7.2 4.8s5.6-1.8 7.2-4.8c-2.2 1.4-4.6 2-7.2 2s-5-.6-7.2-2Z" className="pt-shade" />
    </>
  ),
  leaf: <path d="M3 21C4 11 11 4 21 3c-1 10-8 17-18 18Z" className="pt-body" />,
};

/** `appear`: each petal enters after its delay (the intro's gathering stream); otherwise it is already mid-fall. */
function Petals({ petals, className, layer, appear = false }: { petals: Petal[]; className?: string; layer: string; appear?: boolean }) {
  return (
    <div aria-hidden className={cn("petal-drift pointer-events-none overflow-hidden", className)} data-layer={layer}>
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal-fall"
          data-depth={p.depth}
          data-reach={p.reach ?? "all"}
          style={{ left: `${p.x}%`, "--fall": `${p.fall}s`, "--sway": `${p.sway}s`, "--spin": `${p.spin}s`, "--d": `${appear ? "" : "-"}${p.delay}s` } as CSSProperties}
        >
          <span className="petal-sway">
            <svg viewBox="0 0 24 24" className={`petal-spin pt-${p.tone} block`} style={{ width: p.size, height: p.size }}>
              {shapes[p.shape]}
            </svg>
          </span>
        </span>
      ))}
    </div>
  );
}

/** Hero petals: the strongest stream, 18 across three depths (phones get the first ten). Inside the hero frame (a size container). */
const hero: Petal[] = [
  { x: 6, size: 30, fall: 11, sway: 3.2, spin: 5.5, delay: 0, tone: "blush", shape: "petal", depth: "near" },
  { x: 24, size: 16, fall: 18, sway: 4.4, spin: 8, delay: 5.5, tone: "ivory", shape: "petal", depth: "far" },
  { x: 41, size: 26, fall: 14, sway: 3.8, spin: 6, delay: 9, tone: "champagne", shape: "curl", depth: "mid" },
  { x: 58, size: 18, fall: 16, sway: 4.6, spin: 8, delay: 2.5, tone: "leaf", shape: "leaf", depth: "mid" },
  { x: 76, size: 36, fall: 10.5, sway: 3, spin: 5, delay: 6.5, tone: "dusty", shape: "curl", depth: "near" },
  { x: 91, size: 15, fall: 19, sway: 4, spin: 7, delay: 11, tone: "blush", shape: "petal", depth: "far" },
  { x: 15, size: 22, fall: 15, sway: 4.2, spin: 7.5, delay: 12, tone: "champagne", shape: "petal", depth: "mid" },
  { x: 50, size: 14, fall: 20, sway: 3.6, spin: 9, delay: 3.5, tone: "dusty", shape: "bud", depth: "far" },
  { x: 67, size: 28, fall: 12, sway: 3.4, spin: 6, delay: 13.5, tone: "blush", shape: "petal", depth: "near" },
  { x: 84, size: 20, fall: 17, sway: 4.8, spin: 8.5, delay: 1.5, tone: "ivory", shape: "curl", depth: "mid" },
  { x: 33, size: 13, fall: 21, sway: 4, spin: 9.5, delay: 8, tone: "blush", shape: "petal", depth: "far" },
  { x: 96, size: 24, fall: 13, sway: 3.6, spin: 6.5, delay: 10, tone: "champagne", shape: "petal", depth: "mid" },
  { x: 2, size: 16, fall: 18.5, sway: 4.4, spin: 8, delay: 15, tone: "leaf", shape: "leaf", depth: "far" },
  { x: 46, size: 34, fall: 11.5, sway: 3.2, spin: 5.5, delay: 4.5, tone: "blush", shape: "curl", depth: "near" },
  { x: 29, size: 18, fall: 16.5, sway: 4.1, spin: 7, delay: 7.5, tone: "dusty", shape: "petal", depth: "mid" },
  { x: 62, size: 12, fall: 22, sway: 4.6, spin: 10, delay: 14.5, tone: "ivory", shape: "bud", depth: "far" },
  { x: 88, size: 26, fall: 12.5, sway: 3.3, spin: 6, delay: 16.5, tone: "blush", shape: "petal", depth: "near" },
  { x: 11, size: 20, fall: 14.5, sway: 3.9, spin: 7, delay: 18, tone: "champagne", shape: "curl", depth: "mid" },
];

export function PetalDrift() {
  return <Petals petals={hero} layer="hero" className="petal-drift--hero absolute inset-0 z-[5]" />;
}

/**
 * The site-wide stream, fixed to the viewport for the whole visit (layout/site-chrome.tsx),
 * above the page content and below the header, menus and dialogs. Composition by screen:
 *  - phones: 8 petals, mostly along the left and right edges, clear of the text column;
 *  - tablets (md, 768 px): + 8 more, a gentle stream across the page;
 *  - desktops (lg, 1024 px): + 12 more, including the outer margins.
 * Petals crossing the middle of the page are smaller and softer than those along the edges.
 */
const site: Petal[] = [
  // Edges — every screen.
  { x: 1, size: 22, fall: 15, sway: 3.6, spin: 6.5, delay: 0, tone: "blush", shape: "petal", depth: "near" },
  { x: 6, size: 14, fall: 21, sway: 4.4, spin: 8.5, delay: 7, tone: "ivory", shape: "petal", depth: "far" },
  { x: 3, size: 18, fall: 18, sway: 4, spin: 7.5, delay: 12.5, tone: "dusty", shape: "curl", depth: "mid" },
  { x: 92, size: 20, fall: 16, sway: 3.8, spin: 6, delay: 3, tone: "champagne", shape: "petal", depth: "near" },
  { x: 96, size: 14, fall: 22, sway: 4.4, spin: 9, delay: 10, tone: "blush", shape: "bud", depth: "far" },
  { x: 89, size: 17, fall: 19, sway: 4.2, spin: 7, delay: 16, tone: "blush", shape: "petal", depth: "mid" },
  { x: 48, size: 12, fall: 24, sway: 4.8, spin: 9.5, delay: 5, tone: "champagne", shape: "petal", depth: "far" },
  { x: 97, size: 15, fall: 20, sway: 4, spin: 8, delay: 19, tone: "leaf", shape: "leaf", depth: "mid" },
  // Streams across the page — from tablets.
  { x: 14, size: 18, fall: 17, sway: 3.9, spin: 7, delay: 2, tone: "blush", shape: "petal", depth: "mid", reach: "md" },
  { x: 27, size: 13, fall: 23, sway: 4.6, spin: 9, delay: 9.5, tone: "ivory", shape: "petal", depth: "far", reach: "md" },
  { x: 38, size: 20, fall: 16, sway: 3.6, spin: 6.5, delay: 14, tone: "dusty", shape: "curl", depth: "mid", reach: "md" },
  { x: 56, size: 14, fall: 21, sway: 4.2, spin: 8, delay: 1, tone: "champagne", shape: "bud", depth: "far", reach: "md" },
  { x: 66, size: 19, fall: 17.5, sway: 3.8, spin: 7, delay: 11, tone: "blush", shape: "petal", depth: "mid", reach: "md" },
  { x: 77, size: 13, fall: 22.5, sway: 4.5, spin: 9, delay: 6, tone: "ivory", shape: "curl", depth: "far", reach: "md" },
  { x: 84, size: 24, fall: 14, sway: 3.4, spin: 6, delay: 17.5, tone: "dusty", shape: "petal", depth: "near", reach: "md" },
  { x: 20, size: 15, fall: 20, sway: 4.1, spin: 8, delay: 20.5, tone: "leaf", shape: "leaf", depth: "mid", reach: "md" },
  // Richer desktops: more petals, larger curled ones in the outer margins.
  { x: 2.5, size: 30, fall: 13, sway: 3.3, spin: 5.5, delay: 8.5, tone: "blush", shape: "curl", depth: "near", reach: "lg" },
  { x: 95.5, size: 32, fall: 13.5, sway: 3.2, spin: 5.5, delay: 1.5, tone: "dusty", shape: "curl", depth: "near", reach: "lg" },
  { x: 9, size: 16, fall: 19.5, sway: 4.3, spin: 8, delay: 15, tone: "champagne", shape: "petal", depth: "mid", reach: "lg" },
  { x: 33, size: 12, fall: 25, sway: 4.8, spin: 10, delay: 4, tone: "blush", shape: "bud", depth: "far", reach: "lg" },
  { x: 44, size: 16, fall: 19, sway: 4, spin: 7.5, delay: 18.5, tone: "ivory", shape: "petal", depth: "mid", reach: "lg" },
  { x: 52, size: 22, fall: 15.5, sway: 3.7, spin: 6.5, delay: 10.5, tone: "blush", shape: "petal", depth: "near", reach: "lg" },
  { x: 61, size: 13, fall: 24, sway: 4.6, spin: 9.5, delay: 22, tone: "dusty", shape: "petal", depth: "far", reach: "lg" },
  { x: 72, size: 17, fall: 18.5, sway: 4, spin: 7.5, delay: 13, tone: "champagne", shape: "curl", depth: "mid", reach: "lg" },
  { x: 80, size: 12, fall: 23.5, sway: 4.4, spin: 9, delay: 2.5, tone: "blush", shape: "petal", depth: "far", reach: "lg" },
  { x: 91, size: 18, fall: 18, sway: 3.9, spin: 7, delay: 21, tone: "ivory", shape: "petal", depth: "mid", reach: "lg" },
  { x: 99, size: 16, fall: 20.5, sway: 4.2, spin: 8, delay: 6.5, tone: "blush", shape: "petal", depth: "mid", reach: "lg" },
  { x: 24, size: 26, fall: 14.5, sway: 3.4, spin: 6, delay: 23, tone: "champagne", shape: "curl", depth: "near", reach: "lg" },
];

export function SitePetals() {
  return <Petals petals={site} layer="site" className="site-petals fixed inset-0 z-30" />;
}

/** A light breeze of petals across the announcement bar (its own overflow-hidden band, never over the links). */
const breeze: Petal[] = [
  { x: -4, size: 12, fall: 16, sway: 2.6, spin: 6, delay: 0, tone: "blush", shape: "petal", depth: "mid" },
  { x: -4, size: 10, fall: 21, sway: 3, spin: 7, delay: 8, tone: "champagne", shape: "petal", depth: "far" },
  { x: -4, size: 11, fall: 18, sway: 2.8, spin: 6.5, delay: 13, tone: "dusty", shape: "curl", depth: "mid" },
];

export function PetalBreeze() {
  return <Petals petals={breeze} layer="breeze" className="petal-breeze absolute inset-0" />;
}

/**
 * The intro's stream (layout/floral-entrance.tsx): petals join one after another
 * over the first seconds, so the flurry gathers rather than starting all at
 * once, and keeps falling while the intro fades into the site's own stream.
 */
const intro: Petal[] = [
  { x: 4, size: 22, fall: 8, sway: 3.2, spin: 5.5, delay: 0.2, tone: "blush", shape: "petal", depth: "near" },
  { x: 93, size: 18, fall: 9, sway: 3.6, spin: 6.5, delay: 0.6, tone: "champagne", shape: "petal", depth: "mid" },
  { x: 16, size: 14, fall: 10, sway: 4, spin: 7.5, delay: 1.2, tone: "ivory", shape: "petal", depth: "far" },
  { x: 82, size: 26, fall: 8.5, sway: 3.3, spin: 5.5, delay: 1.6, tone: "dusty", shape: "curl", depth: "near" },
  { x: 30, size: 18, fall: 9, sway: 3.8, spin: 6.5, delay: 2, tone: "blush", shape: "petal", depth: "mid" },
  { x: 66, size: 14, fall: 10.5, sway: 4.2, spin: 8, delay: 2.3, tone: "champagne", shape: "bud", depth: "far" },
  { x: 48, size: 24, fall: 8, sway: 3.4, spin: 6, delay: 2.7, tone: "blush", shape: "curl", depth: "near" },
  { x: 9, size: 16, fall: 9.5, sway: 4, spin: 7, delay: 3, tone: "dusty", shape: "petal", depth: "mid" },
  { x: 74, size: 20, fall: 9, sway: 3.7, spin: 6.5, delay: 3.3, tone: "ivory", shape: "curl", depth: "mid" },
  { x: 39, size: 13, fall: 11, sway: 4.4, spin: 8.5, delay: 3.6, tone: "blush", shape: "petal", depth: "far" },
  { x: 58, size: 28, fall: 7.5, sway: 3.1, spin: 5, delay: 3.9, tone: "blush", shape: "petal", depth: "near" },
  { x: 22, size: 20, fall: 8.5, sway: 3.6, spin: 6, delay: 4.2, tone: "champagne", shape: "curl", depth: "mid" },
  { x: 88, size: 15, fall: 10, sway: 4.1, spin: 7.5, delay: 4.5, tone: "blush", shape: "bud", depth: "far" },
  { x: 2, size: 18, fall: 9, sway: 3.9, spin: 7, delay: 4.8, tone: "leaf", shape: "leaf", depth: "mid" },
  { x: 53, size: 16, fall: 9.5, sway: 4, spin: 7, delay: 5.1, tone: "dusty", shape: "petal", depth: "mid" },
  { x: 97, size: 24, fall: 8, sway: 3.3, spin: 5.5, delay: 5.4, tone: "blush", shape: "curl", depth: "near" },
];

export function IntroPetals() {
  return <Petals petals={intro} layer="intro" appear className="fe-petals absolute inset-0" />;
}
