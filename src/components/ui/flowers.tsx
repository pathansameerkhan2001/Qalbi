import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
 * QALBI's floral artwork: hand-built SVG flowers in the brand palette (blush
 * rose, white jasmine, sage leaves, gold centres). Every part carries a CSS
 * class from globals.css (“Florals”) that opens it from its base — petals
 * unfold, leaves grow, stems draw — with a delay in `--d`. Static at their
 * final, fully open state for reduced-motion visitors. Purely decorative:
 * server-rendered markup, no JavaScript.
 */

/** Start offset: `--d` in time (page-load animations), `--o` as a share of the scroll range (scroll-in sprigs). */
const delay = (d: number) => ({ "--d": `${d.toFixed(2)}s`, "--o": `${Math.round(d * 40)}%` }) as CSSProperties;

const palette = {
  roseOuter: "#e7b3b6",
  roseMid: "#eec4c3",
  roseInner: "#f6dcd8",
  roseLine: "#c4838b",
  jasmine: "#fffaf1",
  jasmineLine: "#d9c7aa",
  gold: "#c9a96a",
  leaf: "#87977a",
  leafDeep: "#526b49",
  stem: "#7d8f6f",
};

// Shapes drawn from their base at (0, 0) so they can open from it.
// A broad rose petal with a rounded, slightly scalloped top, and a smaller cupped one for the heart of the rose.
const ROSE_PETAL = "M0 0C-11-3-17-15-13-25C-10-31-4-32 0-29C4-32 10-31 13-25C17-15 11-3 0 0Z";
const ROSE_CUP = "M0 0C-9-2-14-12-10-19C-7-24 7-24 10-19C14-12 9-2 0 0Z";
const JASMINE_PETAL = "M0 0C-6-4-7-18 0-24C7-18 6-4 0 0Z";
const LEAF = "M0 0C8-7 22-8 34 0C22 8 8 7 0 0Z";
const BUD = "M0 0C-7-4-7-16 0-22C7-16 7-4 0 0Z";

interface Placed {
  x: number;
  y: number;
  /** Scale. */
  s?: number;
  /** Rotation in degrees. */
  r?: number;
  /** Seconds before it starts to open. */
  d?: number;
}

const place = ({ x, y, s = 1, r = 0 }: Placed) => `translate(${x} ${y}) rotate(${r}) scale(${s})`;

/** A rose seen from above: rings of broad, rounded petals (six, five, then four cupped), opening from the centre outwards. */
export function Rose(p: Placed) {
  const d = p.d ?? 0;
  const ring = (count: number, path: string, scale: number, offset: number, fill: string, start: number) =>
    Array.from({ length: count }, (_, i) => (
      <g key={i} transform={`rotate(${offset + (360 / count) * i}) scale(${scale})`}>
        <path className="fl-petal" style={delay(start + i * 0.04)} d={path} fill={fill} stroke={palette.roseLine} strokeWidth={0.7 / scale} strokeOpacity={0.5} />
      </g>
    ));
  return (
    <g transform={place(p)}>
      {ring(6, ROSE_PETAL, 1, 0, palette.roseOuter, d + 0.3)}
      {ring(5, ROSE_PETAL, 0.74, 34, palette.roseMid, d + 0.16)}
      {ring(4, ROSE_CUP, 0.62, 20, palette.roseInner, d + 0.04)}
      <circle className="fl-fade" style={delay(d)} r={5.5} fill={palette.roseMid} stroke={palette.roseLine} strokeWidth={0.6} strokeOpacity={0.6} />
      <path className="fl-fade" style={delay(d + 0.1)} d="M-2.5 1.5c-1.5-3 1.5-5.5 4-4s1.5 5-1.5 5.5" fill="none" stroke={palette.roseLine} strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}

/** A five-petal white jasmine with a gold centre. */
export function Jasmine(p: Placed) {
  const d = p.d ?? 0;
  return (
    <g transform={place(p)}>
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 72})`}>
          <path className="fl-petal" style={delay(d + i * 0.06)} d={JASMINE_PETAL} fill={palette.jasmine} stroke={palette.jasmineLine} strokeWidth={0.8} />
        </g>
      ))}
      <circle className="fl-fade" style={delay(d + 0.3)} r={3.2} fill={palette.gold} />
    </g>
  );
}

/** A closed rose bud with two sepals. */
export function Bud(p: Placed) {
  const d = p.d ?? 0;
  return (
    <g transform={place(p)}>
      <path className="fl-petal" style={delay(d)} d={BUD} fill={palette.roseOuter} stroke={palette.roseLine} strokeWidth={0.7} strokeOpacity={0.6} />
      {/* The rotation sits on a wrapper: an animated CSS transform would replace the path's own transform attribute. */}
      <g transform="rotate(-70)">
        <path className="fl-leaf" style={delay(d + 0.1)} d="M0 0C3-3 8-4 12-2C8 1 3 1 0 0Z" fill={palette.leaf} />
      </g>
      <g transform="rotate(-110) scale(1 -1)">
        <path className="fl-leaf" style={delay(d + 0.1)} d="M0 0C3-3 8-4 12-2C8 1 3 1 0 0Z" fill={palette.leaf} />
      </g>
    </g>
  );
}

/** A sage leaf with its midrib, growing from its stalk at (0, 0) along +x. */
export function Leaf(p: Placed & { deep?: boolean }) {
  return (
    <g transform={place(p)}>
      <path className="fl-leaf" style={delay(p.d ?? 0)} d={LEAF} fill={p.deep ? palette.leafDeep : palette.leaf} fillOpacity={0.62} stroke={palette.leafDeep} strokeWidth={0.6} strokeOpacity={0.5} />
      <path className="fl-leaf" style={delay((p.d ?? 0) + 0.1)} d="M2 0H30" stroke="#fffdf8" strokeOpacity={0.55} strokeWidth={0.6} />
    </g>
  );
}

/** A stem that draws itself along its path. */
export function Stem({ d, delay: start = 0, width = 1.3 }: { d: string; delay?: number; width?: number }) {
  return <path className="fl-stem" style={delay(start)} d={d} pathLength={1} fill="none" stroke={palette.stem} strokeWidth={width} strokeLinecap="round" />;
}

/** The entrance garland: a rose between two jasmines, on stems that arc out to buds. */
export function GarlandArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 150" className={className} aria-hidden focusable="false" overflow="visible">
      <Stem d="M160 100C128 104 94 108 52 122" delay={0.05} />
      <Stem d="M160 100C192 104 226 108 268 122" delay={0.05} />
      <Stem d="M120 106C112 96 110 88 116 80" delay={0.2} width={1} />
      <Stem d="M200 106C208 96 210 88 204 80" delay={0.2} width={1} />
      <Leaf x={138} y={103} r={160} s={0.85} d={0.35} />
      <Leaf x={182} y={103} r={20} s={0.85} d={0.35} deep />
      <Leaf x={96} y={110} r={-160} s={0.75} d={0.45} deep />
      <Leaf x={224} y={110} r={-20} s={0.75} d={0.45} />
      <Leaf x={76} y={115} r={200} s={0.6} d={0.55} />
      <Leaf x={244} y={115} r={-20} s={0.6} d={0.55} deep />
      <Bud x={52} y={122} r={-62} s={0.85} d={0.6} />
      <Bud x={268} y={122} r={62} s={0.85} d={0.6} />
      <Jasmine x={116} y={80} s={0.95} r={10} d={0.55} />
      <Jasmine x={204} y={80} s={0.95} r={-14} d={0.62} />
      <Jasmine x={86} y={98} s={0.6} r={30} d={0.75} />
      <Jasmine x={234} y={98} s={0.6} r={-8} d={0.8} />
      <Rose x={160} y={78} s={1.15} d={0.45} />
    </svg>
  );
}

export type SprigVariant = "rose" | "jasmine" | "leaf";

/**
 * Corner arrangements for page and section edges, drawn to sit in a bottom
 * right corner (mirror with -scale-x-100 for the left). Each variant is a
 * different arrangement, so pages don't repeat one picture.
 */
const sprigs: Record<SprigVariant, React.ReactNode> = {
  rose: (
    <>
      <Stem d="M220 220C190 180 150 130 96 78" />
      <Stem d="M168 150C176 120 170 92 150 60" delay={0.15} width={1} />
      <Stem d="M196 186C208 168 214 150 210 128" delay={0.2} width={0.9} />
      <Leaf x={186} y={176} r={-150} s={0.95} d={0.3} />
      <Leaf x={150} y={128} r={-30} s={0.85} d={0.4} deep />
      <Leaf x={128} y={108} r={-155} s={0.8} d={0.5} />
      <Leaf x={172} y={124} r={-75} s={0.7} d={0.45} deep />
      <Bud x={150} y={60} r={-18} d={0.6} />
      <Bud x={210} y={128} r={8} s={0.8} d={0.65} />
      <Rose x={96} y={78} s={0.95} d={0.5} />
    </>
  ),
  jasmine: (
    <>
      <Stem d="M220 205C170 196 110 170 44 118" />
      <Stem d="M150 186C140 166 132 150 124 136" delay={0.2} width={0.9} />
      <Stem d="M100 160C94 142 86 132 74 124" delay={0.25} width={0.9} />
      <Leaf x={184} y={198} r={-170} s={0.8} d={0.3} />
      <Leaf x={168} y={194} r={-115} s={0.7} d={0.35} deep />
      <Leaf x={118} y={170} r={-150} s={0.75} d={0.45} />
      <Leaf x={70} y={140} r={-140} s={0.65} d={0.55} deep />
      <Jasmine x={124} y={134} s={0.95} r={8} d={0.5} />
      <Jasmine x={74} y={122} s={0.8} r={-20} d={0.6} />
      <Jasmine x={44} y={116} s={0.65} r={30} d={0.7} />
      <Bud x={210} y={170} r={-30} s={0.65} d={0.55} />
    </>
  ),
  leaf: (
    <>
      <Stem d="M220 214C180 190 140 150 110 90" />
      <Leaf x={196} y={198} r={-150} s={0.95} d={0.25} />
      <Leaf x={186} y={192} r={-95} s={0.85} d={0.3} deep />
      <Leaf x={160} y={170} r={-160} s={0.9} d={0.35} />
      <Leaf x={150} y={160} r={-80} s={0.8} d={0.4} deep />
      <Leaf x={134} y={134} r={-150} s={0.8} d={0.45} />
      <Leaf x={126} y={124} r={-70} s={0.7} d={0.5} deep />
      <Jasmine x={110} y={90} s={0.85} d={0.6} />
    </>
  ),
};

/**
 * A corner arrangement that opens as it scrolls into view (where the browser
 * supports scroll-driven animations; elsewhere when the page loads) and then
 * sways very slightly. Always decorative and click-through.
 */
export function FloralSprig({ variant, className }: { variant: SprigVariant; className?: string }) {
  return (
    <svg viewBox="0 0 220 220" overflow="visible" aria-hidden focusable="false" className={cn("fl-onview fl-sway pointer-events-none select-none", className)}>
      {sprigs[variant]}
    </svg>
  );
}

/** Tiny five-petal flower for eyebrow labels. */
export function FlowerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" aria-hidden focusable="false" className={cn("size-3 shrink-0 text-[#c4838b]", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} transform={`rotate(${i * 72})`} d="M0 -1.5C-3 -3.5 -3.2 -8.5 0 -10.5C3.2 -8.5 3 -3.5 0 -1.5Z" fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth={0.9} />
      ))}
      <circle r={1.6} fill={palette.gold} />
    </svg>
  );
}
