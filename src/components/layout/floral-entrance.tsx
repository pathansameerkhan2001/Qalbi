import type { CSSProperties } from "react";
import Image from "next/image";
import { brandAssets, brandConfig } from "@/data/brand";
import { FloralArt } from "@/components/ui/flowers";

/**
 * Runs while the page is being parsed, before the overlay below is painted:
 * a visitor sees the entrance once per browser session (sessionStorage), so
 * later pages and reloads open straight away. Without storage (some private
 * modes) it simply plays.
 */
const once = `try{var k="qalbi-entrance";if(sessionStorage.getItem(k))document.documentElement.setAttribute("data-entrance","seen");else sessionStorage.setItem(k,"1")}catch(e){}`;

/** Skip (button or Escape) works as soon as the button exists — before the page's JavaScript has loaded. */
const skip = `(function(){var b=document.getElementById("floral-entrance-skip");if(!b)return;function s(){document.documentElement.setAttribute("data-entrance","seen")}b.addEventListener("click",s);document.addEventListener("keydown",function e(k){if(k.key==="Escape"){s();document.removeEventListener("keydown",e)}})})()`;

/** Petals that drift around the logo while it is revealed (offsets from the centre, in rem). */
const framePetals = [
  { x: -15, y: -7, s: 1.1, r: -30, d: 1.0 },
  { x: 13, y: -8, s: 0.9, r: 40, d: 1.15 },
  { x: -18, y: 4, s: 0.8, r: 80, d: 1.3 },
  { x: 17, y: 5, s: 1.2, r: -60, d: 1.05 },
  { x: -9, y: 9, s: 0.7, r: 10, d: 1.4 },
  { x: 9, y: 10, s: 0.85, r: -15, d: 1.25 },
  { x: -4, y: -11, s: 0.75, r: 120, d: 1.5 },
  { x: 5, y: -10.5, s: 0.95, r: -100, d: 1.2 },
];

/**
 * The QALBI Naturals entrance (≈3.6 s, once per session):
 *  1. Botanical opening — on warm ivory light, four arrangements grow in from
 *     the corners: stems draw, leaves unfold, roses and jasmine open.
 *  2. Logo reveal — the original logo (its own PNG and proportions, tagline
 *     included) unfurls from the centre over a soft champagne glow, petals
 *     drift around it, and one light sweep passes over the gold.
 *  3. The arrangements part outwards and the layer fades into the homepage.
 *
 * CSS only (globals.css, “Entrance”). The page underneath renders and works
 * normally — the layer never takes clicks except on “Skip intro” — and it
 * removes itself by its own animation even if scripts never run. Reduced
 * motion: not shown.
 */
export function FloralEntrance() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: once }} />
      <div className="floral-entrance">
        <div aria-hidden className="fe-light" />
        <div aria-hidden className="fe-corner fe-tl">
          <FloralArt variant="bouquet" onView={false} className="size-full -scale-100" />
        </div>
        <div aria-hidden className="fe-corner fe-tr">
          <FloralArt variant="jasmine" onView={false} className="size-full -scale-y-100" />
        </div>
        <div aria-hidden className="fe-corner fe-bl">
          <FloralArt variant="rose" onView={false} className="size-full -scale-x-100" />
        </div>
        <div aria-hidden className="fe-corner fe-br">
          <FloralArt variant="bouquet" onView={false} className="size-full" />
        </div>

        <div aria-hidden className="fe-center">
          <div className="fe-glow" />
          {framePetals.map((p, i) => (
            <span
              key={i}
              className="fe-petal"
              style={{ "--x": `${p.x}rem`, "--y": `${p.y}rem`, "--s": p.s, "--r": `${p.r}deg`, "--pd": `${p.d}s` } as CSSProperties}
            >
              <svg viewBox="0 0 20 20" className="block size-full">
                <path
                  d="M10 1C15 4 18 10 16 15c-1.5 3-4 4-6 4s-4.5-1-6-4C2 10 5 4 10 1Z"
                  style={i % 3 === 2 ? { fill: "var(--fl-bloom)", stroke: "var(--fl-bloom-line)" } : { fill: "var(--fl-petal-mid)", stroke: "var(--fl-petal-line)" }}
                  strokeOpacity={0.5}
                  strokeWidth={0.6}
                />
              </svg>
            </span>
          ))}
          {brandAssets.logoSrc && (
            <div className="fe-logo">
              {/* The original artwork at its own proportions (unoptimised: exact pixels); lazy, so a hidden entrance never downloads it. */}
              <Image src={brandAssets.logoSrc} alt="" width={brandAssets.logoWidth} height={brandAssets.logoHeight} unoptimized loading="lazy" className="block h-auto w-full" />
              {brandAssets.logoMaskSrc && <span className="fe-shimmer" style={{ "--logo-mask": `url("${brandAssets.logoMaskSrc}")` } as CSSProperties} />}
            </div>
          )}
          {!brandAssets.logoSrc && <p className="fe-logo font-serif text-5xl italic text-gold">{brandConfig.shortName}</p>}
        </div>

        <button id="floral-entrance-skip" type="button" className="fe-skip">
          Skip intro
        </button>
      </div>
      <script dangerouslySetInnerHTML={{ __html: skip }} />
    </>
  );
}
