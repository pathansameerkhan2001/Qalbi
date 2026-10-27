import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
 * QALBI's floral artwork: hand-built SVG flowers in the brand palette —
 * champagne roses (ivory to gold-pale, gold-edged), white jasmine with gold
 * centres, sage and botanical-green leaves. Every colour comes from the
 * floral tokens in globals.css (--fl-*), which are defined from the site's
 * own design tokens, so the flowers always match the theme. Petals and leaves
 * are shaded with shared gradients (<FloralDefs>, rendered once by the site
 * frame); each fill falls back to a plain token colour without them.
 *
 * Every part carries a CSS class from globals.css (“Florals”) that opens it from
 * its base — petals unfold, leaves grow, stems draw — after `--d`. Resting
 * state is fully open, so reduced-motion visitors see still, open flowers.
 * Purely decorative: server-rendered markup, no JavaScript of its own.
 */

/** Start offset for the opening animation. */
const delay = (d: number) => ({ "--d": `${d.toFixed(2)}s` }) as CSSProperties;

// Colours are CSS (custom properties can't be used in SVG presentation attributes), so they go in `style`.
const paint = {
  roseOuter: "url(#fl-rose-outer) var(--fl-petal)",
  roseMid: "url(#fl-rose-mid) var(--fl-petal-mid)",
  roseInner: "url(#fl-rose-inner) var(--fl-petal-deep)",
  roseLine: "var(--fl-petal-line)",
  jasmine: "url(#fl-jasmine) var(--fl-bloom)",
  jasmineLine: "var(--fl-bloom-line)",
  gold: "url(#fl-gold) var(--fl-centre)",
  leaf: "url(#fl-leaf) var(--fl-leaf)",
  leafDeep: "url(#fl-leaf-deep) var(--fl-leaf-deep)",
  stem: "var(--fl-stem)",
};
const tint = (fill: string, stroke?: string, d?: number): CSSProperties => ({ ...(d === undefined ? {} : delay(d)), fill, ...(stroke ? { stroke } : {}) });
const stop = (offset: string, color: string) => <stop offset={offset} style={{ stopColor: color }} />;

/** Shared gradients for all floral artwork. Rendered once (site frame); 0×0 and out of the layout. */
export function FloralDefs() {
  return (
    <svg aria-hidden focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {/* Petals: light at the base where they catch the light, deeper champagne at the rim. */}
        <radialGradient id="fl-rose-outer" cx="50%" cy="100%" r="110%">
          {stop("0", "var(--fl-petal-light)")}
          {stop("0.55", "var(--fl-petal)")}
          {stop("1", "var(--fl-petal-mid)")}
        </radialGradient>
        <radialGradient id="fl-rose-mid" cx="50%" cy="100%" r="110%">
          {stop("0", "var(--fl-petal)")}
          {stop("0.6", "var(--fl-petal-mid)")}
          {stop("1", "var(--fl-petal-deep)")}
        </radialGradient>
        <radialGradient id="fl-rose-inner" cx="50%" cy="100%" r="110%">
          {stop("0", "var(--fl-petal-mid)")}
          {stop("1", "var(--fl-petal-line)")}
        </radialGradient>
        <radialGradient id="fl-jasmine" cx="50%" cy="100%" r="110%">
          {stop("0", "var(--fl-petal)")}
          {stop("0.35", "var(--fl-petal-light)")}
          {stop("1", "var(--fl-bloom)")}
        </radialGradient>
        <radialGradient id="fl-gold" cx="40%" cy="35%" r="70%">
          {stop("0", "var(--fl-petal-mid)")}
          {stop("1", "var(--fl-centre)")}
        </radialGradient>
        <linearGradient id="fl-leaf" x1="0" y1="0" x2="1" y2="0">
          {stop("0", "var(--fl-leaf-deep)")}
          {stop("1", "var(--fl-leaf)")}
        </linearGradient>
        <linearGradient id="fl-leaf-deep" x1="0" y1="0" x2="1" y2="0">
          {stop("0", "var(--fl-stem)")}
          {stop("1", "var(--fl-leaf-deep)")}
        </linearGradient>
      </defs>
    </svg>
  );
}

// Shapes drawn from their base at (0, 0) so they can open from it.
// A broad rose petal with a rounded, slightly scalloped top, and a smaller cupped one for the heart.
const ROSE_PETAL = "M0 0C-11-3-17-15-13-25C-10-31-4-32 0-29C4-32 10-31 13-25C17-15 11-3 0 0Z";
const ROSE_CUP = "M0 0C-9-2-14-12-10-19C-7-24 7-24 10-19C14-12 9-2 0 0Z";
const JASMINE_PETAL = "M0 0C-5-4-7-15-3-22C-1-25 1-25 3-22C7-15 5-4 0 0Z";
const LEAF = "M0 0C8-8 24-9 36 0C24 9 8 8 0 0Z";
const BUD = "M0 0C-7-4-8-15-2-22C0-24 1-24 2-22C8-15 7-4 0 0Z";
const SEPAL = "M0 0C3-3 8-4 12-2C8 1 3 1 0 0Z";

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
      // The rotation sits on a wrapper: an animated CSS transform would replace the path's own transform attribute.
      <g key={i} transform={`rotate(${offset + (360 / count) * i}) scale(${scale})`}>
        <path className="fl-petal" style={tint(fill, paint.roseLine, start + i * 0.04)} d={path} strokeWidth={0.6 / scale} strokeOpacity={0.55} />
      </g>
    ));
  return (
    <g transform={place(p)}>
      {ring(6, ROSE_PETAL, 1, 0, paint.roseOuter, d + 0.3)}
      {ring(5, ROSE_PETAL, 0.74, 34, paint.roseMid, d + 0.16)}
      {ring(4, ROSE_CUP, 0.62, 20, paint.roseInner, d + 0.04)}
      <circle className="fl-fade" style={tint(paint.roseInner, paint.roseLine, d)} r={5.5} strokeWidth={0.6} strokeOpacity={0.6} />
      <path className="fl-fade" style={tint("none", paint.roseLine, d + 0.1)} d="M-2.5 1.5c-1.5-3 1.5-5.5 4-4s1.5 5-1.5 5.5" strokeWidth={0.9} strokeLinecap="round" />
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
          <path className="fl-petal" style={tint(paint.jasmine, paint.jasmineLine, d + i * 0.05)} d={JASMINE_PETAL} strokeWidth={0.7} />
        </g>
      ))}
      <circle className="fl-fade" style={tint(paint.gold, undefined, d + 0.3)} r={3.4} />
    </g>
  );
}

/** A closed rose bud with two sepals. */
export function Bud(p: Placed) {
  const d = p.d ?? 0;
  return (
    <g transform={place(p)}>
      <path className="fl-petal" style={tint(paint.roseMid, paint.roseLine, d)} d={BUD} strokeWidth={0.6} strokeOpacity={0.6} />
      <g transform="rotate(-70)">
        <path className="fl-leaf" style={tint(paint.leaf, undefined, d + 0.1)} d={SEPAL} />
      </g>
      <g transform="rotate(-110) scale(1 -1)">
        <path className="fl-leaf" style={tint(paint.leaf, undefined, d + 0.1)} d={SEPAL} />
      </g>
    </g>
  );
}

/** A leaf with its midrib, growing from its stalk at (0, 0) along +x. */
export function Leaf(p: Placed & { deep?: boolean }) {
  return (
    <g transform={place(p)}>
      <path className="fl-leaf" style={tint(p.deep ? paint.leafDeep : paint.leaf, paint.stem, p.d ?? 0)} d={LEAF} strokeWidth={0.5} strokeOpacity={0.35} />
      <path className="fl-leaf" style={tint("none", "var(--fl-petal-light)", (p.d ?? 0) + 0.1)} d="M2 0H32" strokeOpacity={0.5} strokeWidth={0.6} />
    </g>
  );
}

/** A stem that draws itself along its path. */
export function Stem({ d, delay: start = 0, width = 1.4 }: { d: string; delay?: number; width?: number }) {
  return <path className="fl-stem" style={tint("none", paint.stem, start)} d={d} pathLength={1} strokeWidth={width} strokeLinecap="round" />;
}

export type SprigVariant = "rose" | "jasmine" | "leaf" | "bouquet";

/**
 * Arrangements drawn into a 300 × 300 box, rooted in its bottom-right corner
 * (FloralCorner mirrors them into the other corners). Each is a different
 * composition, so sections don't repeat one picture.
 */
const arrangements: Record<SprigVariant, React.ReactNode> = {
  // Two roses on an arching stem, buds and broad leaves.
  rose: (
    <>
      <Stem d="M300 300C262 248 210 190 140 120" />
      <Stem d="M228 214C238 176 230 140 204 104" delay={0.15} width={1.1} />
      <Stem d="M268 262C284 238 292 212 286 182" delay={0.2} width={1} />
      <Leaf x={254} y={246} r={-150} s={1.3} d={0.3} />
      <Leaf x={250} y={240} r={-78} s={1.05} d={0.35} deep />
      <Leaf x={206} y={178} r={-30} s={1.15} d={0.4} deep />
      <Leaf x={176} y={152} r={-158} s={1.1} d={0.5} />
      <Leaf x={232} y={170} r={-82} s={0.9} d={0.45} />
      <Bud x={286} y={182} r={8} s={1.1} d={0.65} />
      <Bud x={204} y={104} r={-16} s={1.05} d={0.6} />
      <Rose x={140} y={120} s={1.5} d={0.5} />
      <Rose x={190} y={218} s={0.9} r={20} d={0.65} />
    </>
  ),
  // A long cascade of jasmine with buds and paired leaves.
  jasmine: (
    <>
      <Stem d="M300 280C236 270 150 236 50 160" />
      <Stem d="M196 252C184 226 174 206 160 188" delay={0.2} width={1} />
      <Stem d="M126 214C118 192 106 178 90 168" delay={0.25} width={1} />
      <Leaf x={250} y={270} r={-170} s={1.1} d={0.3} />
      <Leaf x={234} y={264} r={-112} s={0.95} d={0.35} deep />
      <Leaf x={160} y={230} r={-150} s={1.05} d={0.45} />
      <Leaf x={150} y={226} r={-96} s={0.85} d={0.5} deep />
      <Leaf x={92} y={190} r={-140} s={0.9} d={0.55} deep />
      <Jasmine x={160} y={186} s={1.35} r={8} d={0.5} />
      <Jasmine x={90} y={166} s={1.15} r={-20} d={0.6} />
      <Jasmine x={50} y={158} s={0.95} r={30} d={0.7} />
      <Jasmine x={214} y={226} s={0.9} r={-8} d={0.62} />
      <Bud x={276} y={232} r={-30} s={0.95} d={0.55} />
      <Bud x={118} y={146} r={-50} s={0.75} d={0.75} />
    </>
  ),
  // A leafy arch of sage and botanical green with jasmine and a small rose.
  leaf: (
    <>
      <Stem d="M300 290C246 256 196 200 160 110" />
      <Stem d="M222 240C190 238 160 226 134 204" delay={0.2} width={1} />
      <Leaf x={270} y={268} r={-150} s={1.25} d={0.25} />
      <Leaf x={258} y={260} r={-92} s={1.1} d={0.3} deep />
      <Leaf x={222} y={232} r={-162} s={1.2} d={0.35} />
      <Leaf x={212} y={220} r={-82} s={1.05} d={0.4} deep />
      <Leaf x={186} y={180} r={-150} s={1.1} d={0.45} />
      <Leaf x={178} y={166} r={-72} s={0.95} d={0.5} deep />
      <Leaf x={164} y={130} r={-120} s={0.85} d={0.55} />
      <Leaf x={150} y={208} r={-170} s={0.9} d={0.5} deep />
      <Jasmine x={160} y={108} s={1.2} d={0.6} />
      <Jasmine x={132} y={202} s={0.95} r={20} d={0.65} />
      <Rose x={230} y={200} s={0.8} d={0.7} />
    </>
  ),
  // The fullest arrangement: three roses, jasmine sprays, buds and leaves.
  bouquet: (
    <>
      <Stem d="M300 300C256 256 206 206 150 140" />
      <Stem d="M246 246C252 200 238 150 214 92" delay={0.12} width={1.2} />
      <Stem d="M226 228C190 232 146 226 104 206" delay={0.15} width={1.2} />
      <Stem d="M272 272C292 246 298 214 292 176" delay={0.2} width={1} />
      <Stem d="M196 196C170 176 136 158 92 150" delay={0.25} width={0.9} />
      <Leaf x={270} y={268} r={-145} s={1.3} d={0.3} />
      <Leaf x={262} y={258} r={-85} s={1.1} d={0.32} deep />
      <Leaf x={232} y={210} r={-28} s={1.15} d={0.4} deep />
      <Leaf x={178} y={170} r={-160} s={1.1} d={0.45} />
      <Leaf x={150} y={222} r={-175} s={1.05} d={0.45} deep />
      <Leaf x={240} y={130} r={-110} s={0.95} d={0.5} />
      <Leaf x={126} y={160} r={-150} s={0.85} d={0.55} deep />
      <Bud x={292} y={176} r={6} s={1.05} d={0.6} />
      <Jasmine x={92} y={150} s={1.15} r={14} d={0.6} />
      <Jasmine x={104} y={206} s={1.05} r={-22} d={0.65} />
      <Jasmine x={262} y={86} s={0.9} r={18} d={0.7} />
      <Rose x={214} y={92} s={1.05} r={12} d={0.55} />
      <Rose x={186} y={244} s={0.95} r={-18} d={0.6} />
      <Rose x={150} y={140} s={1.55} d={0.45} />
    </>
  ),
};

/** One arrangement as a standalone SVG (300 × 300, rooted bottom-right). `onView`: opens as it scrolls into view and sways while on screen. */
export function FloralArt({ variant, className, onView = true }: { variant: SprigVariant; className?: string; onView?: boolean }) {
  return (
    <svg viewBox="0 0 300 300" overflow="visible" aria-hidden focusable="false" className={cn("fl-art pointer-events-none select-none", onView && "fl-onview fl-sway", className)}>
      {arrangements[variant]}
    </svg>
  );
}

const corners = {
  br: "-bottom-3 -right-3",
  bl: "-bottom-3 -left-3 -scale-x-100",
  tr: "-right-3 -top-3 -scale-y-100",
  tl: "-left-3 -top-3 -scale-100",
};

const sizes = {
  sm: "w-24 sm:w-32 lg:w-44",
  md: "w-28 sm:w-44 lg:w-60 xl:w-72",
  lg: "w-32 sm:w-52 lg:w-72 xl:w-[22rem]",
};

/**
 * An arrangement in a corner of the nearest `relative isolate` box, behind its
 * content (z-index -10 inside that stacking context, above its background):
 * cards, photos and text always cover it. Opens as it scrolls into view.
 * `desktop`: full size from 1024 px; below that a compact corner accent (96–112 px)
 * rather than none, so phones and tablets keep the floral thread too.
 */
export function FloralCorner({
  variant,
  corner = "br",
  size = "md",
  desktop = false,
  className,
}: {
  variant: SprigVariant;
  corner?: keyof typeof corners;
  size?: keyof typeof sizes;
  desktop?: boolean;
  className?: string;
}) {
  return <FloralArt variant={variant} className={cn("absolute -z-10", corners[corner], sizes[size], desktop && "w-24 sm:w-28", className)} />;
}

/**
 * A garland border: a stem waving across the width with roses and jasmine in
 * turn, opening left to right as it scrolls into view. Fixed height; on narrow
 * screens the sides are cropped rather than the flowers shrunk.
 */
export function FloralBorder({ className }: { className?: string }) {
  const blooms = Array.from({ length: 8 }, (_, i) => {
    const x = 75 + i * 150;
    const y = i % 2 ? 46 : 30;
    const d = 0.1 + i * 0.12;
    return (
      <g key={i}>
        <Leaf x={x - 8} y={y + 6} r={150 + (i % 2) * 20} s={0.75} d={d} deep={i % 2 === 0} />
        <Leaf x={x + 8} y={y + 6} r={20 - (i % 2) * 20} s={0.75} d={d + 0.05} deep={i % 2 === 1} />
        {i % 2 ? <Jasmine x={x} y={y} s={0.85} r={i * 13} d={d + 0.1} /> : <Rose x={x} y={y} s={0.62} r={i * 9} d={d + 0.1} />}
      </g>
    );
  });
  return (
    <svg viewBox="0 0 1200 76" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false" className={cn("fl-art fl-onview pointer-events-none block h-12 w-full select-none sm:h-16", className)}>
      <Stem d="M0 44C75 24 150 24 225 40S375 56 450 40S600 24 675 40S825 56 900 40S1050 24 1200 40" width={1.2} />
      {blooms}
    </svg>
  );
}

/** A small symmetrical spray (rose, jasmine and leaves) above centred section headings. */
export function HeadingSpray({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 48" aria-hidden focusable="false" className={cn("fl-art fl-onview pointer-events-none mx-auto block h-9 w-auto select-none sm:h-11", className)}>
      <Stem d="M90 30C70 34 46 36 14 32" delay={0.05} width={1} />
      <Stem d="M90 30C110 34 134 36 166 32" delay={0.05} width={1} />
      <Leaf x={70} y={33} r={170} s={0.7} d={0.25} />
      <Leaf x={110} y={33} r={10} s={0.7} d={0.25} deep />
      <Leaf x={40} y={35} r={190} s={0.55} d={0.35} deep />
      <Leaf x={140} y={35} r={-10} s={0.55} d={0.35} />
      <Jasmine x={58} y={26} s={0.62} r={12} d={0.35} />
      <Jasmine x={122} y={26} s={0.62} r={-8} d={0.4} />
      <Bud x={16} y={32} r={-70} s={0.6} d={0.45} />
      <Bud x={164} y={32} r={70} s={0.6} d={0.45} />
      <Rose x={90} y={24} s={0.62} d={0.2} />
    </svg>
  );
}

/** Tiny five-petal flower for eyebrow labels. */
export function FlowerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" aria-hidden focusable="false" className={cn("size-3 shrink-0 text-gold", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} transform={`rotate(${i * 72})`} d="M0 -1.5C-3 -3.5 -3.2 -8.5 0 -10.5C3.2 -8.5 3 -3.5 0 -1.5Z" fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth={0.9} />
      ))}
      <circle r={1.6} style={{ fill: "var(--fl-centre)" }} />
    </svg>
  );
}
