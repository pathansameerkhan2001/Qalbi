import type { CSSProperties } from "react";
import { PetalShowerGuard } from "./petal-shower-guard";

/*
 * Site-wide rose-petal shower: about 20 seconds from the visitor's first page
 * of the browser session, over the intro and then over every storefront page.
 *
 * It is NOT part of the intro (layout/floral-entrance.tsx): it is mounted once
 * in layout/site-chrome.tsx, which the (site) layout keeps mounted across
 * route changes, so navigating never restarts or removes it. One layer, one
 * clock:
 *  - PETAL_CLOCK (inline, runs while the page is parsed — before React) reads
 *    the start time from sessionStorage, or stores now on the first visit.
 *    Petals continue from where they were on a reload within the 20 s
 *    (--ps-el shifts every delay back by the elapsed time), and nothing shows
 *    once the 20 s are over. Without storage (some private modes) each page
 *    load gets its own 20 s.
 *  - At 18.4 s it sets html[data-petals="ending"] (the layer fades out), at
 *    20 s "done": the layer goes display: none, so every petal animation stops
 *    and is released. Its two timers have then both fired; nothing is left.
 *  - Skipping the intro doesn't touch it: the shower keeps its own clock.
 *
 * CSS only for the motion (globals.css, “Petal shower”): compositor-only
 * transforms and opacity on a fixed pool of elements, no React state.
 * Decorative: aria-hidden, pointer-events: none, never takes clicks. Above
 * page content but below the WhatsApp button, header, menus and dialogs; above
 * the intro only while the intro is showing. Not shown with reduced motion.
 */

/** Length of the shower from the first visit (ms). */
export const PETAL_SHOWER_MS = 20_000;

const PETAL_CLOCK = `(function(){var h=document.documentElement;if(h.hasAttribute("data-petals"))return;var D=${PETAL_SHOWER_MS},n=Date.now(),s=n,l=document.querySelector(".petal-shower");try{var v=+sessionStorage.getItem("qalbi-petals");if(v>0&&v<=n)s=v;else sessionStorage.setItem("qalbi-petals",String(n))}catch(e){}var el=n-s;if(el>=D||!l||matchMedia("(prefers-reduced-motion: reduce)").matches){h.setAttribute("data-petals","done");return}h.setAttribute("data-petals","on");l.style.setProperty("--ps-el",(el/1000)+"s");setTimeout(function(){h.setAttribute("data-petals","ending")},Math.max(0,D-el-1600));setTimeout(function(){h.setAttribute("data-petals","done")},D-el)})()`;

type Tone = "blush" | "dusty" | "champagne" | "ivory";
type Shape = "petal" | "curl" | "bud";
type Depth = "far" | "mid" | "near";
/** Smallest screen a petal shows on: all = phones up, tab = 640 px up, desk = 1024 px up. */
type From = "all" | "tab" | "desk";

interface Petal {
  /** Horizontal start, % of the viewport width. */
  x: number;
  /** Base size (px): phones ×1.05, tablets ×1.15, desktops ×1.3 (globals.css). */
  size: number;
  /** Seconds for one fall, one sway (left↔right) and one full turn. */
  fall: number;
  sway: number;
  spin: number;
  /** When it first enters (s): the shower gathers rather than starting all at once. */
  delay: number;
  tone: Tone;
  shape: Shape;
  depth: Depth;
  from: From;
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
};

/*
 * The pool. Phones get the 12 "all" petals spread across the width; tablets add
 * 4, desktops 6 more (22) for a richer shower. Starts are spread over the first
 * 6 s, and with 9–13 s falls on a loop the screen stays filled top to bottom
 * until the end.
 */
const petals: Petal[] = [
  { x: 3, size: 24, fall: 10, sway: 3.4, spin: 6, delay: 0.1, tone: "blush", shape: "petal", depth: "near", from: "all" },
  { x: 91, size: 20, fall: 11, sway: 3.8, spin: 7, delay: 0.5, tone: "champagne", shape: "petal", depth: "mid", from: "all" },
  { x: 22, size: 17, fall: 12.5, sway: 4.2, spin: 8, delay: 1, tone: "ivory", shape: "curl", depth: "far", from: "all" },
  { x: 74, size: 27, fall: 9.5, sway: 3.3, spin: 5.5, delay: 1.4, tone: "dusty", shape: "curl", depth: "near", from: "all" },
  { x: 46, size: 21, fall: 11, sway: 3.9, spin: 6.5, delay: 1.9, tone: "blush", shape: "petal", depth: "mid", from: "all" },
  { x: 60, size: 16, fall: 12.5, sway: 4.4, spin: 8.5, delay: 2.4, tone: "champagne", shape: "bud", depth: "far", from: "all" },
  { x: 12, size: 22, fall: 10.5, sway: 3.6, spin: 6, delay: 2.9, tone: "dusty", shape: "petal", depth: "mid", from: "all" },
  { x: 84, size: 25, fall: 10, sway: 3.5, spin: 5.8, delay: 3.4, tone: "blush", shape: "curl", depth: "near", from: "all" },
  { x: 34, size: 18, fall: 12, sway: 4.1, spin: 7.5, delay: 3.9, tone: "ivory", shape: "petal", depth: "far", from: "all" },
  { x: 54, size: 26, fall: 9.5, sway: 3.2, spin: 5.2, delay: 4.4, tone: "blush", shape: "petal", depth: "near", from: "all" },
  { x: 97, size: 18, fall: 11.5, sway: 4, spin: 7, delay: 4.9, tone: "champagne", shape: "curl", depth: "mid", from: "all" },
  { x: 28, size: 23, fall: 10.5, sway: 3.7, spin: 6.2, delay: 5.4, tone: "dusty", shape: "petal", depth: "mid", from: "all" },
  { x: 67, size: 19, fall: 12, sway: 4.2, spin: 7.8, delay: 0.8, tone: "ivory", shape: "petal", depth: "far", from: "tab" },
  { x: 40, size: 24, fall: 10, sway: 3.5, spin: 6, delay: 2.2, tone: "champagne", shape: "petal", depth: "near", from: "tab" },
  { x: 7, size: 18, fall: 12.5, sway: 4.3, spin: 8, delay: 3.6, tone: "blush", shape: "bud", depth: "far", from: "tab" },
  { x: 79, size: 21, fall: 11, sway: 3.8, spin: 6.8, delay: 5, tone: "blush", shape: "petal", depth: "mid", from: "tab" },
  { x: 17, size: 26, fall: 9.8, sway: 3.3, spin: 5.6, delay: 1.6, tone: "blush", shape: "curl", depth: "near", from: "desk" },
  { x: 50, size: 17, fall: 13, sway: 4.5, spin: 8.6, delay: 0.3, tone: "dusty", shape: "bud", depth: "far", from: "desk" },
  { x: 88, size: 22, fall: 10.8, sway: 3.7, spin: 6.4, delay: 2.7, tone: "ivory", shape: "curl", depth: "mid", from: "desk" },
  { x: 63, size: 25, fall: 10.2, sway: 3.4, spin: 5.9, delay: 4.1, tone: "champagne", shape: "petal", depth: "near", from: "desk" },
  { x: 37, size: 20, fall: 11.6, sway: 4, spin: 7.2, delay: 5.7, tone: "blush", shape: "petal", depth: "mid", from: "desk" },
  { x: 2, size: 19, fall: 12.2, sway: 4.1, spin: 7.6, delay: 6.2, tone: "dusty", shape: "curl", depth: "far", from: "desk" },
];

/** The shower layer and its clock. Rendered once, by layout/site-chrome.tsx. */
export function PetalShower() {
  return (
    <>
      <div aria-hidden className="petal-shower petal-drift" suppressHydrationWarning>
        {petals.map((p, i) => (
          <span
            key={i}
            className="petal-fall"
            data-depth={p.depth}
            data-from={p.from}
            style={{ left: `${p.x}%`, "--fall": `${p.fall}s`, "--sway": `${p.sway}s`, "--spin": `${p.spin}s`, "--d": `${p.delay}s`, "--ps": p.size } as CSSProperties}
          >
            <span className="petal-sway">
              <svg viewBox="0 0 24 24" className={`petal-spin pt-${p.tone} block`}>
                {shapes[p.shape]}
              </svg>
            </span>
          </span>
        ))}
      </div>
      <script dangerouslySetInnerHTML={{ __html: PETAL_CLOCK }} />
      <PetalShowerGuard clock={PETAL_CLOCK} />
    </>
  );
}
