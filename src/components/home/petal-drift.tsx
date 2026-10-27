import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
 * Drifting petals in three depths: far ones small, slow and softly blurred;
 * near ones larger, quicker and with a soft shadow. Blush rose and ivory
 * jasmine petals with the odd sage leaf, each falling, swaying and turning at
 * its own pace. CSS only (globals.css, “Petals”): compositor transforms, no
 * JavaScript and no images; never take clicks; not shown with reduced motion.
 */

type Depth = "far" | "mid" | "near";
type Kind = "rose" | "ivory" | "leaf";
interface Petal {
  x: number;
  size: number;
  fall: number;
  sway: number;
  spin: number;
  delay: number;
  kind: Kind;
  depth: Depth;
}

const shapes: Record<Kind, React.ReactNode> = {
  rose: <path d="M10 1C15 4 18 10 16 15c-1.5 3-4 4-6 4s-4.5-1-6-4C2 10 5 4 10 1Z" fill="#ecbdbf" stroke="#c4838b" strokeOpacity={0.45} strokeWidth={0.6} />,
  ivory: <path d="M10 1c4 3 6 8 5 12-1 4-3 6-5 6s-4-2-5-6C4 9 6 4 10 1Z" fill="#fffaf1" stroke="#d9c7aa" strokeWidth={0.6} />,
  leaf: <path d="M2 18C3 9 9 3 18 2c-1 9-7 15-16 16Z" fill="#87977a" />,
};

function Petals({ petals, className }: { petals: Petal[]; className?: string }) {
  return (
    <div aria-hidden className={cn("petal-drift pointer-events-none overflow-hidden", className)}>
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal-fall"
          data-depth={p.depth}
          style={{ left: `${p.x}%`, "--fall": `${p.fall}s`, "--sway": `${p.sway}s`, "--spin": `${p.spin}s`, "--d": `-${p.delay}s` } as CSSProperties}
        >
          <span className="petal-sway">
            <svg viewBox="0 0 20 20" className="petal-spin block" style={{ width: p.size, height: p.size }}>
              {shapes[p.kind]}
            </svg>
          </span>
        </span>
      ))}
    </div>
  );
}

/** Hero petals: 14 across three depths (phones get the first eight). Inside the hero frame (a size container). */
const hero: Petal[] = [
  { x: 6, size: 30, fall: 11, sway: 3.2, spin: 5.5, delay: 0, kind: "rose", depth: "near" },
  { x: 24, size: 16, fall: 18, sway: 4.4, spin: 8, delay: 5.5, kind: "ivory", depth: "far" },
  { x: 41, size: 24, fall: 14, sway: 3.8, spin: 6, delay: 9, kind: "rose", depth: "mid" },
  { x: 58, size: 20, fall: 16, sway: 4.6, spin: 8, delay: 2.5, kind: "leaf", depth: "mid" },
  { x: 76, size: 34, fall: 10.5, sway: 3, spin: 5, delay: 6.5, kind: "rose", depth: "near" },
  { x: 91, size: 15, fall: 19, sway: 4, spin: 7, delay: 11, kind: "ivory", depth: "far" },
  { x: 15, size: 22, fall: 15, sway: 4.2, spin: 7.5, delay: 12, kind: "ivory", depth: "mid" },
  { x: 50, size: 14, fall: 20, sway: 3.6, spin: 9, delay: 3.5, kind: "rose", depth: "far" },
  { x: 67, size: 28, fall: 12, sway: 3.4, spin: 6, delay: 13.5, kind: "rose", depth: "near" },
  { x: 84, size: 18, fall: 17, sway: 4.8, spin: 8.5, delay: 1.5, kind: "ivory", depth: "mid" },
  { x: 33, size: 13, fall: 21, sway: 4, spin: 9.5, delay: 8, kind: "rose", depth: "far" },
  { x: 96, size: 24, fall: 13, sway: 3.6, spin: 6.5, delay: 10, kind: "rose", depth: "mid" },
  { x: 2, size: 16, fall: 18.5, sway: 4.4, spin: 8, delay: 15, kind: "leaf", depth: "far" },
  { x: 46, size: 32, fall: 11.5, sway: 3.2, spin: 5.5, delay: 4.5, kind: "ivory", depth: "near" },
];

export function PetalDrift() {
  return <Petals petals={hero} className="petal-drift--hero absolute inset-0 z-[5]" />;
}

/**
 * Site-wide petals in the page margins of wide screens (≥ 1400 px), where they
 * pass beside the content, never over products, prices or text. Fixed to the
 * viewport, below the header and dialogs.
 */
const lanes: Petal[] = [
  { x: 1.2, size: 26, fall: 16, sway: 3.6, spin: 6.5, delay: 0, kind: "rose", depth: "near" },
  { x: 3.6, size: 16, fall: 22, sway: 4.6, spin: 8.5, delay: 7, kind: "ivory", depth: "far" },
  { x: 2.2, size: 20, fall: 19, sway: 4, spin: 7.5, delay: 13, kind: "leaf", depth: "mid" },
  { x: 95.6, size: 24, fall: 17, sway: 3.8, spin: 6, delay: 3, kind: "rose", depth: "near" },
  { x: 97.8, size: 15, fall: 23, sway: 4.4, spin: 9, delay: 10, kind: "ivory", depth: "far" },
  { x: 96.4, size: 19, fall: 20, sway: 4.2, spin: 7, delay: 16, kind: "rose", depth: "mid" },
];

export function SitePetals() {
  return <Petals petals={lanes} className="site-petals fixed inset-0 z-30 hidden" />;
}
