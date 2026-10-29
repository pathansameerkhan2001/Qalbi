import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
 * Rose petals for the 10-second intro only (layout/floral-entrance.tsx). CSS only
 * (globals.css, “Petals”): each petal is a few compositor-only transforms (fall,
 * sway, turn) on a small fixed pool of elements, with no JavaScript. They live
 * inside the intro overlay, so they stop and are released with it (display: none)
 * when the intro ends or is skipped; nothing keeps falling over the site afterwards.
 * Decorative only: hidden from assistive technology, never takes clicks, not
 * shown with reduced motion.
 *
 * Tones: blush and dusty rose (owner-approved floral colours), champagne and
 * ivory (brand tokens), with the odd sage leaf; three depths (far = small,
 * slow, soft; near = larger, quicker, shadowed); shapes: rounded petals,
 * larger curled petals and tiny rosebuds.
 */

type Tone = "blush" | "dusty" | "champagne" | "ivory" | "leaf";
type Shape = "petal" | "curl" | "bud" | "leaf";
type Depth = "far" | "mid" | "near";

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

/** Each petal enters after its delay, so the stream gathers rather than starting all at once. */
function Petals({ petals, className, layer }: { petals: Petal[]; className?: string; layer: string }) {
  return (
    <div aria-hidden className={cn("petal-drift pointer-events-none overflow-hidden", className)} data-layer={layer}>
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal-fall"
          data-depth={p.depth}
          style={{ left: `${p.x}%`, "--fall": `${p.fall}s`, "--sway": `${p.sway}s`, "--spin": `${p.spin}s`, "--d": `${p.delay}s` } as CSSProperties}
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

/**
 * The intro's stream (layout/floral-entrance.tsx): petals join one after another
 * over the first seconds, so the flurry gathers rather than starting all at
 * once, and keeps falling until the intro has faded away.
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
  return <Petals petals={intro} layer="intro" className="fe-petals absolute inset-0" />;
}
