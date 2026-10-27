/*
 * QALBI's floral artwork as data: every arrangement is a list of parts
 * (roses, jasmine, buds, leaves, stems) placed in its own box. `floralSvg`
 * turns one into a standalone SVG document — gradients, the opening
 * animation of each part (petals unfold, leaves grow, stems draw) and a
 * reduced-motion rule built in — which scripts/build-florals.mts writes to
 * public/florals/. The website shows those files as images, so each page
 * carries one small <img> per arrangement instead of hundreds of inline
 * elements, and the browser caches every file once for the whole site.
 *
 * No React and no server-only imports: used by the generator script and tests.
 */

/** Colours of the artwork (hex), derived from the brand tokens by the generator. */
export interface FloralPalette {
  petalLight: string;
  petal: string;
  petalMid: string;
  petalDeep: string;
  petalLine: string;
  bloom: string;
  bloomLine: string;
  centre: string;
  leaf: string;
  leafDeep: string;
  stem: string;
}

type Flower = "rose" | "jasmine" | "bud" | "leaf" | "leafDeep";
/** [kind, x, y, scale, rotation°, delay s] or ["stem", path, delay s, width]. */
export type Part = [Flower, number, number, number?, number?, number?] | ["stem", string, number?, number?];

export interface Arrangement {
  width: number;
  height: number;
  parts: Part[];
}

export const arrangements = {
  // Two roses on an arching stem, buds and broad leaves (300 × 300, rooted bottom right).
  rose: {
    width: 300,
    height: 300,
    parts: [
      ["stem", "M300 300C262 248 210 190 140 120"],
      ["stem", "M228 214C238 176 230 140 204 104", 0.15, 1.1],
      ["stem", "M268 262C284 238 292 212 286 182", 0.2, 1],
      ["leaf", 254, 246, 1.3, -150, 0.3],
      ["leafDeep", 250, 240, 1.05, -78, 0.35],
      ["leafDeep", 206, 178, 1.15, -30, 0.4],
      ["leaf", 176, 152, 1.1, -158, 0.5],
      ["leaf", 232, 170, 0.9, -82, 0.45],
      ["bud", 286, 182, 1.1, 8, 0.65],
      ["bud", 204, 104, 1.05, -16, 0.6],
      ["rose", 140, 120, 1.5, 0, 0.5],
      ["rose", 190, 218, 0.9, 20, 0.65],
    ],
  },
  // A long cascade of jasmine with buds and paired leaves.
  jasmine: {
    width: 300,
    height: 300,
    parts: [
      ["stem", "M300 280C236 270 150 236 50 160"],
      ["stem", "M196 252C184 226 174 206 160 188", 0.2, 1],
      ["stem", "M126 214C118 192 106 178 90 168", 0.25, 1],
      ["leaf", 250, 270, 1.1, -170, 0.3],
      ["leafDeep", 234, 264, 0.95, -112, 0.35],
      ["leaf", 160, 230, 1.05, -150, 0.45],
      ["leafDeep", 150, 226, 0.85, -96, 0.5],
      ["leafDeep", 92, 190, 0.9, -140, 0.55],
      ["jasmine", 160, 186, 1.35, 8, 0.5],
      ["jasmine", 90, 166, 1.15, -20, 0.6],
      ["jasmine", 50, 158, 0.95, 30, 0.7],
      ["jasmine", 214, 226, 0.9, -8, 0.62],
      ["bud", 276, 232, 0.95, -30, 0.55],
      ["bud", 118, 146, 0.75, -50, 0.75],
    ],
  },
  // A leafy arch of sage and botanical green with jasmine and a small rose.
  leaf: {
    width: 300,
    height: 300,
    parts: [
      ["stem", "M300 290C246 256 196 200 160 110"],
      ["stem", "M222 240C190 238 160 226 134 204", 0.2, 1],
      ["leaf", 270, 268, 1.25, -150, 0.25],
      ["leafDeep", 258, 260, 1.1, -92, 0.3],
      ["leaf", 222, 232, 1.2, -162, 0.35],
      ["leafDeep", 212, 220, 1.05, -82, 0.4],
      ["leaf", 186, 180, 1.1, -150, 0.45],
      ["leafDeep", 178, 166, 0.95, -72, 0.5],
      ["leaf", 164, 130, 0.85, -120, 0.55],
      ["leafDeep", 150, 208, 0.9, -170, 0.5],
      ["jasmine", 160, 108, 1.2, 0, 0.6],
      ["jasmine", 132, 202, 0.95, 20, 0.65],
      ["rose", 230, 200, 0.8, 0, 0.7],
    ],
  },
  // Three roses, jasmine sprays, buds and leaves.
  bouquet: {
    width: 300,
    height: 300,
    parts: [
      ["stem", "M300 300C256 256 206 206 150 140"],
      ["stem", "M246 246C252 200 238 150 214 92", 0.12, 1.2],
      ["stem", "M226 228C190 232 146 226 104 206", 0.15, 1.2],
      ["stem", "M272 272C292 246 298 214 292 176", 0.2, 1],
      ["stem", "M196 196C170 176 136 158 92 150", 0.25, 0.9],
      ["leaf", 270, 268, 1.3, -145, 0.3],
      ["leafDeep", 262, 258, 1.1, -85, 0.32],
      ["leafDeep", 232, 210, 1.15, -28, 0.4],
      ["leaf", 178, 170, 1.1, -160, 0.45],
      ["leafDeep", 150, 222, 1.05, -175, 0.45],
      ["leaf", 240, 130, 0.95, -110, 0.5],
      ["leafDeep", 126, 160, 0.85, -150, 0.55],
      ["bud", 292, 176, 1.05, 6, 0.6],
      ["jasmine", 92, 150, 1.15, 14, 0.6],
      ["jasmine", 104, 206, 1.05, -22, 0.65],
      ["jasmine", 262, 86, 0.9, 18, 0.7],
      ["rose", 214, 92, 1.05, 12, 0.55],
      ["rose", 186, 244, 0.95, -18, 0.6],
      ["rose", 150, 140, 1.55, 0, 0.45],
    ],
  },
  // The fullest composition, for generous desktop whitespace: four roses, jasmine clusters and branching leaves (360 × 360).
  cluster: {
    width: 360,
    height: 360,
    parts: [
      ["stem", "M360 360C310 306 250 250 176 170"],
      ["stem", "M300 300C312 246 300 186 268 120", 0.1, 1.3],
      ["stem", "M276 280C230 286 170 280 116 252", 0.14, 1.3],
      ["stem", "M330 330C352 300 358 260 350 214", 0.2, 1],
      ["stem", "M232 232C200 206 160 186 104 176", 0.22, 1],
      ["stem", "M262 160C250 120 232 92 206 66", 0.28, 0.9],
      ["leaf", 328, 326, 1.45, -145, 0.28],
      ["leafDeep", 320, 314, 1.2, -82, 0.3],
      ["leafDeep", 284, 262, 1.25, -26, 0.36],
      ["leaf", 212, 204, 1.2, -160, 0.42],
      ["leafDeep", 180, 272, 1.15, -176, 0.42],
      ["leaf", 290, 168, 1.05, -108, 0.48],
      ["leafDeep", 150, 196, 0.95, -150, 0.52],
      ["leaf", 236, 96, 0.9, -130, 0.56],
      ["leafDeep", 336, 250, 0.95, -60, 0.5],
      ["bud", 350, 214, 1.15, 6, 0.6],
      ["bud", 206, 66, 0.95, -24, 0.66],
      ["jasmine", 104, 176, 1.25, 14, 0.58],
      ["jasmine", 116, 252, 1.15, -22, 0.62],
      ["jasmine", 74, 214, 0.85, 30, 0.7],
      ["jasmine", 316, 98, 1, 18, 0.66],
      ["jasmine", 236, 300, 0.8, -10, 0.72],
      ["rose", 268, 118, 1.15, 12, 0.52],
      ["rose", 226, 296, 1.05, -18, 0.56],
      ["rose", 300, 216, 0.85, 30, 0.62],
      ["rose", 176, 170, 1.75, 0, 0.42],
    ],
  },
  // A slim branch for phone screens: it lies along a section's top or bottom padding, never over content (420 × 64).
  branch: {
    width: 420,
    height: 64,
    parts: [
      ["stem", "M0 50C80 44 170 40 260 34S380 26 420 22", 0, 1.2],
      ["leaf", 40, 47, 0.75, -160, 0.2],
      ["leafDeep", 62, 46, 0.7, -20, 0.24],
      ["leaf", 150, 40, 0.75, -165, 0.32],
      ["leafDeep", 176, 39, 0.7, -12, 0.36],
      ["leaf", 300, 31, 0.7, -170, 0.44],
      ["leafDeep", 330, 29, 0.65, -10, 0.48],
      ["rose", 104, 40, 0.62, 0, 0.3],
      ["jasmine", 226, 30, 0.7, 12, 0.4],
      ["jasmine", 262, 40, 0.5, -20, 0.46],
      ["rose", 368, 22, 0.5, 18, 0.5],
      ["bud", 410, 22, 0.55, 70, 0.6],
    ],
  },
  // A garland: a stem waving across the width with roses and jasmine in turn (1200 × 76).
  border: {
    width: 1200,
    height: 76,
    parts: [
      ["stem", "M0 44C75 24 150 24 225 40S375 56 450 40S600 24 675 40S825 56 900 40S1050 24 1200 40", 0, 1.2],
      ...Array.from({ length: 8 }, (_, i): Part[] => {
        const x = 75 + i * 150;
        const y = i % 2 ? 46 : 30;
        const d = 0.1 + i * 0.12;
        return [
          [i % 2 === 0 ? "leafDeep" : "leaf", x - 8, y + 6, 0.75, 150 + (i % 2) * 20, d],
          [i % 2 === 1 ? "leafDeep" : "leaf", x + 8, y + 6, 0.75, 20 - (i % 2) * 20, d + 0.05],
          i % 2 ? ["jasmine", x, y, 0.85, i * 13, d + 0.1] : ["rose", x, y, 0.62, i * 9, d + 0.1],
        ];
      }).flat(),
    ],
  },
  // A small symmetrical spray above centred section headings (180 × 48).
  spray: {
    width: 180,
    height: 48,
    parts: [
      ["stem", "M90 30C70 34 46 36 14 32", 0.05, 1],
      ["stem", "M90 30C110 34 134 36 166 32", 0.05, 1],
      ["leaf", 70, 33, 0.7, 170, 0.25],
      ["leafDeep", 110, 33, 0.7, 10, 0.25],
      ["leafDeep", 40, 35, 0.55, 190, 0.35],
      ["leaf", 140, 35, 0.55, -10, 0.35],
      ["jasmine", 58, 26, 0.62, 12, 0.35],
      ["jasmine", 122, 26, 0.62, -8, 0.4],
      ["bud", 16, 32, 0.6, -70, 0.45],
      ["bud", 164, 32, 0.6, 70, 0.45],
      ["rose", 90, 24, 0.62, 0, 0.2],
    ],
  },
} satisfies Record<string, Arrangement>;

export type FloralVariant = keyof typeof arrangements;

// Shapes drawn from their base at (0, 0) so they can open from it.
const ROSE_PETAL = "M0 0C-11-3-17-15-13-25C-10-31-4-32 0-29C4-32 10-31 13-25C17-15 11-3 0 0Z";
const ROSE_CUP = "M0 0C-9-2-14-12-10-19C-7-24 7-24 10-19C14-12 9-2 0 0Z";
const JASMINE_PETAL = "M0 0C-5-4-7-15-3-22C-1-25 1-25 3-22C7-15 5-4 0 0Z";
const LEAF = "M0 0C8-8 24-9 36 0C24 9 8 8 0 0Z";
const BUD = "M0 0C-7-4-8-15-2-22C0-24 1-24 2-22C8-15 7-4 0 0Z";
const SEPAL = "M0 0C3-3 8-4 12-2C8 1 3 1 0 0Z";

const n = (v: number) => +v.toFixed(2);
const at = (d: number) => ` style="--d:${n(d)}s"`;
const place = (x: number, y: number, s = 1, r = 0) => `translate(${n(x)} ${n(y)})${r ? ` rotate(${n(r)})` : ""}${s !== 1 ? ` scale(${n(s)})` : ""}`;

/** Open-on-load animation classes: p = petal (from its base), l = leaf (from its stalk), s = stem (drawn), f = fade. */
function rose(d: number) {
  // The rotation sits on a wrapper: an animated CSS transform replaces an element's own transform attribute.
  const ring = (count: number, path: string, scale: number, offset: number, fill: string, start: number) =>
    Array.from({ length: count }, (_, i) => `<g transform="rotate(${n(offset + (360 / count) * i)}) scale(${scale})"><path class="p"${at(start + i * 0.04)} d="${path}" fill="url(#${fill})" stroke-width="${n(0.6 / scale)}"/></g>`).join("");
  return (
    ring(6, ROSE_PETAL, 1, 0, "ro", d + 0.3) +
    ring(5, ROSE_PETAL, 0.74, 34, "rm", d + 0.16) +
    ring(4, ROSE_CUP, 0.62, 20, "ri", d + 0.04) +
    `<circle class="f"${at(d)} r="5.5" fill="url(#ri)"/><path class="f"${at(d + 0.1)} d="M-2.5 1.5c-1.5-3 1.5-5.5 4-4s1.5 5-1.5 5.5" fill="none" stroke-width=".9" stroke-linecap="round"/>`
  );
}
const jasmine = (d: number) =>
  Array.from({ length: 5 }, (_, i) => `<g transform="rotate(${i * 72})"><path class="p j"${at(d + i * 0.05)} d="${JASMINE_PETAL}" fill="url(#ja)"/></g>`).join("") +
  `<circle class="f"${at(d + 0.3)} r="3.4" fill="url(#go)"/>`;
const bud = (d: number) =>
  `<path class="p"${at(d)} d="${BUD}" fill="url(#rm)"/>` +
  `<g transform="rotate(-70)"><path class="l"${at(d + 0.1)} d="${SEPAL}" fill="url(#le)"/></g>` +
  `<g transform="rotate(-110) scale(1 -1)"><path class="l"${at(d + 0.1)} d="${SEPAL}" fill="url(#le)"/></g>`;
const leaf = (d: number, deep: boolean) =>
  `<path class="l v"${at(d)} d="${LEAF}" fill="url(#${deep ? "ld" : "le"})"/><path class="l r"${at(d + 0.1)} d="M2 0H32"/>`;

const gradients = (c: FloralPalette) =>
  `<defs>` +
  `<radialGradient id="ro" cx="50%" cy="100%" r="110%"><stop offset="0" stop-color="${c.petalLight}"/><stop offset=".55" stop-color="${c.petal}"/><stop offset="1" stop-color="${c.petalMid}"/></radialGradient>` +
  `<radialGradient id="rm" cx="50%" cy="100%" r="110%"><stop offset="0" stop-color="${c.petal}"/><stop offset=".6" stop-color="${c.petalMid}"/><stop offset="1" stop-color="${c.petalDeep}"/></radialGradient>` +
  `<radialGradient id="ri" cx="50%" cy="100%" r="110%"><stop offset="0" stop-color="${c.petalMid}"/><stop offset="1" stop-color="${c.petalLine}"/></radialGradient>` +
  `<radialGradient id="ja" cx="50%" cy="100%" r="110%"><stop offset="0" stop-color="${c.petal}"/><stop offset=".35" stop-color="${c.petalLight}"/><stop offset="1" stop-color="${c.bloom}"/></radialGradient>` +
  `<radialGradient id="go" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${c.petalMid}"/><stop offset="1" stop-color="${c.centre}"/></radialGradient>` +
  `<linearGradient id="le"><stop offset="0" stop-color="${c.leafDeep}"/><stop offset="1" stop-color="${c.leaf}"/></linearGradient>` +
  `<linearGradient id="ld"><stop offset="0" stop-color="${c.stem}"/><stop offset="1" stop-color="${c.leafDeep}"/></linearGradient>` +
  `</defs>`;

/**
 * Part styles. `animate`: each part opens from its base when the image loads.
 * A media query can't stop it — an SVG shown as an image doesn't see the
 * visitor's reduced-motion setting — so reduced-motion visitors get the
 * static twin of each file instead (layout/bloom-observer.tsx).
 */
const styles = (c: FloralPalette, animate: boolean) =>
  `<style>` +
  (animate ? `.p,.l{transform-box:fill-box;animation:o 1s cubic-bezier(.2,.7,.2,1) var(--d,0s) both}` : ``) +
  `.p{transform-origin:50% 100%;stroke:${c.petalLine};stroke-opacity:.55}.j{stroke:${c.bloomLine};stroke-opacity:1;stroke-width:.7}` +
  `.l{transform-origin:0 50%}.v{stroke:${c.stem};stroke-width:.5;stroke-opacity:.35}.r{fill:none;stroke:${c.petalLight};stroke-width:.6;stroke-opacity:.5}` +
  `.s{fill:none;stroke:${c.stem};stroke-linecap:round}.f{stroke:${c.petalLine}}` +
  (animate
    ? `.l{animation-name:g}.s{stroke-dasharray:1;animation:w 1.1s ease-out var(--d,0s) both}.f{animation:a .6s ease-out var(--d,0s) both}` +
      `@keyframes o{from{opacity:0;transform:scale(.1) rotate(-28deg)}}@keyframes g{from{opacity:0;transform:scale(0,.3)}}@keyframes w{from{stroke-dashoffset:1}}@keyframes a{from{opacity:0}}` +
      // Where the setting does reach the image (e.g. opened directly), still respect it.
      `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`
    : ``) +
  `</style>`;

function part(p: Part): string {
  if (p[0] === "stem") {
    const [, path, d = 0, width = 1.4] = p;
    return `<path class="s"${at(d)} d="${path}" pathLength="1" stroke-width="${width}"/>`;
  }
  const [kind, x, y, s = 1, r = 0, d = 0] = p;
  const body = kind === "rose" ? rose(d) : kind === "jasmine" ? jasmine(d) : kind === "bud" ? bud(d) : leaf(d, kind === "leafDeep");
  return `<g transform="${place(x, y, s, r)}">${body}</g>`;
}

/** Margin around every arrangement: as an image the SVG is clipped to its box, and petals reach a little past it. */
export const FLORAL_PAD = 16;

/** Image size of an arrangement's file (its box plus the margin). */
export const floralSize = (variant: FloralVariant) => ({ width: arrangements[variant].width + 2 * FLORAL_PAD, height: arrangements[variant].height + 2 * FLORAL_PAD });

/** A standalone SVG document for one arrangement, in the given colours; `animate: false` for the still, fully open twin. */
export function floralSvg(variant: FloralVariant, palette: FloralPalette, { animate = true }: { animate?: boolean } = {}): string {
  const a: Arrangement = arrangements[variant];
  const { width, height } = floralSize(variant);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-FLORAL_PAD} ${-FLORAL_PAD} ${width} ${height}" width="${width}" height="${height}">` +
    styles(palette, animate) +
    gradients(palette) +
    a.parts.map(part).join("") +
    `</svg>`
  );
}
