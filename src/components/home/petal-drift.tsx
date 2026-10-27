import type { CSSProperties } from "react";

/**
 * Petals drifting down through the hero: blush rose and ivory jasmine petals
 * and the odd sage leaf, each falling, swaying and turning at its own pace.
 * CSS only (globals.css, “Florals”) — compositor transforms, no JavaScript and
 * no images. They stay inside the hero frame (a size container, so they fall
 * its full height), never take clicks, and are not shown with reduced motion.
 * Phones get the first six.
 */
const petals: { x: number; size: number; fall: number; sway: number; spin: number; delay: number; kind: "rose" | "ivory" | "leaf" }[] = [
  { x: 6, size: 22, fall: 14, sway: 3.4, spin: 6, delay: 0, kind: "rose" },
  { x: 22, size: 15, fall: 17, sway: 4.2, spin: 7.5, delay: 5.5, kind: "ivory" },
  { x: 38, size: 19, fall: 15, sway: 3.8, spin: 5.5, delay: 9, kind: "rose" },
  { x: 57, size: 16, fall: 18, sway: 4.6, spin: 8, delay: 2.5, kind: "leaf" },
  { x: 74, size: 20, fall: 13.5, sway: 3.2, spin: 6.5, delay: 7, kind: "rose" },
  { x: 90, size: 14, fall: 16, sway: 4, spin: 7, delay: 11, kind: "ivory" },
  { x: 14, size: 16, fall: 19, sway: 4.4, spin: 9, delay: 12.5, kind: "ivory" },
  { x: 47, size: 20, fall: 16.5, sway: 3.6, spin: 6, delay: 4, kind: "rose" },
  { x: 66, size: 14, fall: 20, sway: 4.8, spin: 8.5, delay: 14, kind: "ivory" },
  { x: 83, size: 18, fall: 15.5, sway: 3.5, spin: 7, delay: 1.5, kind: "rose" },
];

const shapes = {
  rose: <path d="M10 1C15 4 18 10 16 15c-1.5 3-4 4-6 4s-4.5-1-6-4C2 10 5 4 10 1Z" fill="#ecbdbf" fillOpacity={0.9} stroke="#c4838b" strokeOpacity={0.45} strokeWidth={0.6} />,
  ivory: <path d="M10 1c4 3 6 8 5 12-1 4-3 6-5 6s-4-2-5-6C4 9 6 4 10 1Z" fill="#fffaf1" fillOpacity={0.92} stroke="#d9c7aa" strokeWidth={0.6} />,
  leaf: <path d="M2 18C3 9 9 3 18 2c-1 9-7 15-16 16Z" fill="#87977a" fillOpacity={0.8} />,
};

export function PetalDrift() {
  return (
    <div aria-hidden className="petal-drift pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal-fall"
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
