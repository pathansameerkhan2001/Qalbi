import type { CSSProperties } from "react";
import Image from "next/image";
import { brandAssets, brandConfig } from "@/data/brand";
import { floralFiles } from "@/lib/florals/manifest";
import { IntroPetals } from "@/components/home/petal-drift";

/**
 * Runs while the page is being parsed, before the overlay below is painted:
 * a visitor sees the entrance once per browser session (sessionStorage), so
 * later pages and reloads open straight away. Without storage (some private
 * modes) it simply plays.
 */
const once = `try{var k="qalbi-entrance";if(sessionStorage.getItem(k))document.documentElement.setAttribute("data-entrance","seen");else sessionStorage.setItem(k,"1")}catch(e){}`;

/**
 * Runs right after the overlay is parsed — before the page's JavaScript loads:
 *  - Skip (button, or Escape) fades the intro out in under half a second, then removes it;
 *  - the blooming artwork gets its files at the moment it should open (2 s and
 *    2.4 s): those files animate as they load, so loading them early would
 *    open them unseen. Only while the intro is actually showing, and never
 *    with reduced motion.
 */
const control = `(function(){var h=document.documentElement;if(h.getAttribute("data-entrance")==="seen")return;var b=document.getElementById("floral-entrance-skip");function s(){if(h.getAttribute("data-entrance"))return;h.setAttribute("data-entrance","skipping");setTimeout(function(){h.setAttribute("data-entrance","seen")},450)}if(b)b.addEventListener("click",s);document.addEventListener("keydown",function e(k){if(k.key==="Escape"){s();document.removeEventListener("keydown",e)}});if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;[["fe-art-a",2000],["fe-art-b",2400]].forEach(function(p){setTimeout(function(){if(h.getAttribute("data-entrance"))return;document.querySelectorAll("."+p[0]).forEach(function(i){i.src=i.getAttribute("data-fe-src")})},p[1])})})()`;

/** Petals that circle in around the logo during the reveal (offsets from the centre, in rem). */
const framePetals = [
  { x: -15, y: -7, s: 1.1, r: -30, d: 5 },
  { x: 13, y: -8, s: 0.9, r: 40, d: 5.3 },
  { x: -18, y: 4, s: 0.8, r: 80, d: 5.6 },
  { x: 17, y: 5, s: 1.2, r: -60, d: 5.15 },
  { x: -9, y: 9, s: 0.7, r: 10, d: 5.9 },
  { x: 9, y: 10, s: 0.85, r: -15, d: 5.45 },
  { x: -4, y: -11, s: 0.75, r: 120, d: 6.2 },
  { x: 5, y: -10.5, s: 0.95, r: -100, d: 5.75 },
];

/** An artwork image that blooms when the control script gives it its file (`group` is when). */
function Bloom({ variant, group, className }: { variant: keyof typeof floralFiles; group: "a" | "b"; className?: string }) {
  const file = floralFiles[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static, pre-optimised SVG artwork
    <img alt="" aria-hidden data-fe-src={file.src} width={file.width} height={file.height} decoding="async" draggable={false} suppressHydrationWarning className={`fe-art-${group} block ${className ?? ""}`} />
  );
}

/**
 * The QALBI Naturals entrance — about 10 s, once per session (globals.css, “Entrance”):
 *  0–2 s   Floral awakening: the logo on warm ivory under a gentle golden glow,
 *          faint botanical silhouettes, and the first petals drifting in.
 *  2–5 s   Rose-petal bloom: the petals gather (blush, dusty rose, champagne,
 *          ivory); roses and jasmine open in the corners and a single rose
 *          blooms above the logo.
 *  5–8 s   Brand reveal: petals circle in around the logo (its tagline is part
 *          of the original artwork), the light turns softly ivory-and-sage, and
 *          one champagne light passes over the gold.
 *  8–10 s  The arrangements part outwards and the layer fades away while the
 *          petals keep falling — into the site's own petal stream beneath.
 *
 * The page underneath renders and works the whole time: the layer never takes
 * clicks except on “Skip intro”, and it removes itself by its own animation
 * even if scripts never run or an artwork file fails. Reduced motion: the
 * logo alone, still, for about a second.
 */
export function FloralEntrance() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: once }} />
      <div className="floral-entrance">
        <div aria-hidden className="fe-light" />
        <div aria-hidden className="fe-tint" />

        {/* 0–2 s: faint botanical silhouettes along the edges (still artwork). */}
        <div aria-hidden className="fe-silhouette fe-silhouette--top">
          {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimised SVG artwork */}
          <img alt="" src={floralFiles.branch.still} width={floralFiles.branch.width} height={floralFiles.branch.height} loading="lazy" className="block size-full" />
        </div>
        <div aria-hidden className="fe-silhouette fe-silhouette--bottom">
          {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimised SVG artwork */}
          <img alt="" src={floralFiles.branch.still} width={floralFiles.branch.width} height={floralFiles.branch.height} loading="lazy" className="block size-full" />
        </div>

        {/* 2–5 s: the corners bloom. */}
        <div aria-hidden className="fe-corner fe-tl">
          <Bloom variant="cluster" group="a" className="size-full -scale-100" />
        </div>
        <div aria-hidden className="fe-corner fe-tr">
          <Bloom variant="jasmine" group="a" className="size-full -scale-y-100" />
        </div>
        <div aria-hidden className="fe-corner fe-bl">
          <Bloom variant="rose" group="a" className="size-full -scale-x-100" />
        </div>
        <div aria-hidden className="fe-corner fe-br">
          <Bloom variant="cluster" group="a" className="size-full" />
        </div>

        <IntroPetals />

        <div aria-hidden className="fe-center">
          <div className="fe-glow" />
          <div className="fe-stack">
            <Bloom variant="bloom" group="b" className="fe-bloom" />
            {brandAssets.logoSrc ? (
              <div className="fe-logo">
                {/* The original artwork at its own proportions (lossless: exact pixels); lazy, so a hidden entrance never downloads it. */}
                <Image src={brandAssets.logoLosslessSrc ?? brandAssets.logoSrc} alt="" width={brandAssets.logoWidth} height={brandAssets.logoHeight} unoptimized loading="lazy" className="block h-auto w-full" />
                {brandAssets.logoMaskSrc && <span className="fe-shimmer" style={{ "--logo-mask": `url("${brandAssets.logoMaskSrc}")` } as CSSProperties} />}
              </div>
            ) : (
              <p className="fe-logo font-serif text-5xl italic text-gold">{brandConfig.shortName}</p>
            )}
          </div>
          {framePetals.map((p, i) => (
            <span
              key={i}
              className="fe-petal"
              style={{ "--x": `${p.x}rem`, "--y": `${p.y}rem`, "--s": p.s, "--r": `${p.r}deg`, "--pd": `${p.d}s` } as CSSProperties}
            >
              <svg viewBox="0 0 24 24" className={`block size-full ${i % 3 === 2 ? "pt-champagne" : i % 3 === 1 ? "pt-dusty" : "pt-blush"}`}>
                <path d="M12 2C17.5 5 21 11 18.5 17c-1.6 3.6-4.2 5-6.5 5s-4.9-1.4-6.5-5C3 11 6.5 5 12 2Z" className="pt-body" />
                <path d="M5.6 15.5c1.5 3.7 4 5.3 6.4 5.3s4.9-1.6 6.4-5.3c-2 1.4-4.2 2.1-6.4 2.1s-4.4-.7-6.4-2.1Z" className="pt-shade" />
              </svg>
            </span>
          ))}
        </div>

        <button id="floral-entrance-skip" type="button" className="fe-skip">
          Skip intro
        </button>
      </div>
      <script dangerouslySetInnerHTML={{ __html: control }} />
    </>
  );
}
