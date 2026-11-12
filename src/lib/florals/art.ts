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
  /** Deepest leaf shade and the soft shadow under the flowers. */
  forest: string;
  /** Blush rose (owner-approved, 2026-10-28): light, body and deep rim. */
  blushLight: string;
  blush: string;
  blushDeep: string;
}

/** rose = champagne, blush = blush pink, ivory = ivory rose; petal* = a single loose rose petal in that tone. */
type Flower = "rose" | "blush" | "ivory" | "jasmine" | "bud" | "leaf" | "leafDeep" | "petalBlush" | "petalChampagne" | "petalIvory";
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
      ["blush", 190, 218, 0.9, 20, 0.65],
      ["petalBlush", 112, 196, 0.9, -40, 0.8],
      ["petalChampagne", 86, 168, 0.7, 25, 0.88],
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
      ["ivory", 214, 92, 1.05, 12, 0.55],
      ["petalIvory", 60, 196, 0.8, -60, 0.85],
      ["petalBlush", 84, 238, 0.7, 30, 0.9],
      ["blush", 186, 244, 0.95, -18, 0.6],
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
      ["ivory", 268, 118, 1.15, 12, 0.52],
      ["blush", 226, 296, 1.05, -18, 0.56],
      ["petalBlush", 60, 270, 0.95, -35, 0.82],
      ["petalChampagne", 34, 236, 0.75, 40, 0.88],
      ["petalIvory", 88, 312, 0.7, 70, 0.92],
      ["blush", 300, 216, 0.85, 30, 0.62],
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
  // Phone sprig led by roses (blush, champagne, ivory) with loose petals: replaces rose-led corners on small screens (420 × 64).
  sprigRose: {
    width: 420,
    height: 64,
    parts: [
      ["stem", "M0 46C90 50 180 44 270 34S380 18 420 14", 0, 1.2],
      ["leafDeep", 34, 47, 0.8, -165, 0.2],
      ["leaf", 58, 48, 0.75, -15, 0.24],
      ["leaf", 196, 42, 0.75, -160, 0.34],
      ["leafDeep", 222, 40, 0.7, -14, 0.38],
      ["leafDeep", 340, 24, 0.7, -168, 0.46],
      ["leaf", 362, 22, 0.65, -20, 0.5],
      ["blush", 120, 42, 0.78, 0, 0.28],
      ["rose", 282, 32, 0.6, 18, 0.42],
      ["ivory", 396, 16, 0.42, -12, 0.55],
      ["bud", 168, 40, 0.55, 60, 0.4],
      ["petalBlush", 70, 26, 0.5, -50, 0.6],
      ["petalChampagne", 236, 16, 0.45, 35, 0.66],
    ],
  },
  // Phone sprig led by jasmine with a small ivory rose: replaces jasmine- and leaf-led corners on small screens (420 × 64).
  sprigJasmine: {
    width: 420,
    height: 64,
    parts: [
      ["stem", "M0 30C70 40 150 48 240 44S370 30 420 34", 0, 1.1],
      ["leaf", 30, 34, 0.7, -150, 0.2],
      ["leafDeep", 52, 38, 0.7, 20, 0.24],
      ["leaf", 168, 47, 0.7, -170, 0.32],
      ["leafDeep", 196, 47, 0.65, 10, 0.36],
      ["leaf", 318, 38, 0.7, -175, 0.44],
      ["leafDeep", 344, 36, 0.65, 8, 0.48],
      ["jasmine", 92, 38, 0.8, 10, 0.3],
      ["jasmine", 128, 46, 0.6, -24, 0.36],
      ["jasmine", 262, 40, 0.78, 18, 0.42],
      ["jasmine", 392, 30, 0.6, -10, 0.52],
      ["ivory", 226, 34, 0.5, 0, 0.4],
      ["bud", 290, 40, 0.5, 60, 0.5],
      ["petalIvory", 160, 22, 0.45, -40, 0.6],
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
          i % 2 ? ["jasmine", x, y, 0.85, i * 13, d + 0.1] : [(["rose", "blush", "ivory", "blush"] as const)[(i / 2) % 4], x, y, 0.62, i * 9, d + 0.1],
        ];
      }).flat(),
    ],
  },
  // One rose opening, framed by leaves and two buds — the intro's blooming rose (160 × 120).
  bloom: {
    width: 160,
    height: 120,
    parts: [
      ["stem", "M80 112C80 98 80 86 80 72", 0, 1.3],
      ["leaf", 78, 100, 1.05, 200, 0.2],
      ["leafDeep", 82, 100, 1.05, -20, 0.25],
      ["leaf", 70, 86, 0.8, 215, 0.35],
      ["leafDeep", 90, 86, 0.8, -35, 0.4],
      ["bud", 36, 70, 0.9, -40, 0.6],
      ["bud", 124, 70, 0.9, 40, 0.65],
      ["jasmine", 46, 92, 0.7, 10, 0.55],
      ["jasmine", 114, 92, 0.7, -14, 0.6],
      ["blush", 80, 56, 1.6, 0, 0.3],
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
/** Broad outer rose petal: a soft notch at the top, widest two-thirds up. */
const ROSE_PETAL = "M0 0C-8-1-16-8-17-18C-18-26-13-31-7-31C-4-31-2-30 0-28.5C2-30 4-31 7-31C13-31 18-26 17-18C16-8 8-1 0 0Z";
/** The rim of that petal rolled back: a light crescent along its top edge. */
const ROSE_ROLL = "M-15-23C-12-30-4-32 0-28.5C4-32 12-30 15-23C11-26.5 4-28 0-25.5C-4-28-11-26.5-15-23Z";
const ROSE_CUP = "M0 0C-9-2-14-12-10-19C-7-24 7-24 10-19C14-12 9-2 0 0Z";
/** Star-jasmine petal, slightly asymmetric so the five turn like a pinwheel. */
const JASMINE_PETAL = "M0 0C-3-3-6-10-6-17C-6-22-3-25 0-25C3-24 4-20 3-15C2-9 1.5-4 0 0Z";
const LEAF = "M0 0C7-9 23-11 36 0C23 8 8 9 0 0Z";
/** The underside of a leaf: the lower half in shadow. */
const LEAF_SHADE = "M0 0C8 8 23 8 36 0C24 3 10 3 0 0Z";
/** Midrib and side veins. */
const LEAF_VEINS = "M2 0Q18-1 33 0M9-.4l5-4.4M16-.7l5-4.8M23-.6l4.5-4M10 0l5 3.4M17 0l5 3.9M24 0l4.5 3";
const BUD = "M0 0C-7-4-8-15-2-22C0-24 1-24 2-22C8-15 7-4 0 0Z";
const SEPAL = "M0 0C3-3 8-4 12-2C8 1 3 1 0 0Z";
/** A single fallen rose petal: curved body, a fold in shadow and a lit edge. */
const LOOSE_PETAL = "M0 0C-5-2-11-9-12-17C-13-23-9-27-4-26.5C-2-26.3-1-25.5 0-24.8C1.5-26 4-27 7-26C11-24 12-18 10-12C8-6 4-1 0 0Z";
const LOOSE_FOLD = "M0 0C-4-6-4-15 3-26C-2-20-2-10 0 0Z";
const LOOSE_EDGE = "M7-26C11-24 12-18 10-12C9.5-17 9-22 4-25.5Z";

const n = (v: number) => +v.toFixed(2);
const at = (d: number) => ` style="--d:${n(d)}s"`;
const place = (x: number, y: number, s = 1, r = 0) => `translate(${n(x)} ${n(y)})${r ? ` rotate(${n(r)})` : ""}${s !== 1 ? ` scale(${n(s)})` : ""}`;

/** Gradient ids per rose tone: outer, middle and inner petals, and the rolled rims. */
const roseTones = { rose: ["ro", "rm", "ri", "rr"], blush: ["bo", "bm", "bi", "br"], ivory: ["io", "im", "ii", "ir"] } as const;

/** Open-on-load animation classes: p = petal (from its base), l = leaf (from its stalk), s = stem (drawn), f = fade. */
function rose(d: number, tone: keyof typeof roseTones) {
  const [o, m, i, rim] = roseTones[tone];
  // The rotation sits on a wrapper: an animated CSS transform replaces an element's own transform attribute.
  const ring = (count: number, scale: number, offset: number, fill: string, start: number) =>
    Array.from(
      { length: count },
      (_, k) =>
        `<g transform="rotate(${n(offset + (360 / count) * k)}) scale(${scale})"><g class="p"${at(start + k * 0.04)}>` +
        `<path d="${ROSE_PETAL}" fill="url(#${fill})" stroke-width="${n(0.55 / scale)}"/><path d="${ROSE_ROLL}" fill="url(#${rim})" stroke="none"/></g></g>`,
    ).join("");
  // The heart: a tight swirl of curled petal edges over the shaded centre.
  const swirl = `<path class="f h"${at(d + 0.12)} d="M.6-.4c1.4.2 1.7 1.8.6 2.6S-2 2.7-2.1.8-.6-2.8 1.6-2.6 5.3-.6 4.9 2.2 1.7 6-1.4 5.5-6.4 2.6-6 -.8-2.6-6.6 1.4-6.3"/>`;
  return (
    ring(5, 1, 0, o, d + 0.3) +
    ring(5, 0.74, 36, m, d + 0.16) +
    Array.from({ length: 4 }, (_, k) => `<g transform="rotate(${20 + 90 * k}) scale(.56)"><path class="p"${at(d + 0.06 + k * 0.03)} d="${ROSE_CUP}" fill="url(#${m})" stroke-width="1"/></g>`).join("") +
    `<circle class="f n"${at(d)} r="8.5" fill="url(#${i})"/>` +
    swirl
  );
}
const jasmine = (d: number) =>
  Array.from({ length: 5 }, (_, k) => `<g transform="rotate(${k * 72})"><path class="p j"${at(d + k * 0.05)} d="${JASMINE_PETAL}" fill="url(#ja)"/></g>`).join("") +
  `<circle class="f"${at(d + 0.3)} r="3" fill="url(#go)"/>` +
  [0, 120, 240].map((r) => `<circle class="f n"${at(d + 0.36)} transform="rotate(${r})" cy="-1.6" r=".75" fill="url(#go)"/>`).join("");
const bud = (d: number) =>
  `<path class="p"${at(d)} d="${BUD}" fill="url(#rm)"/>` +
  `<g transform="rotate(-70)"><path class="l"${at(d + 0.1)} d="${SEPAL}" fill="url(#le)"/></g>` +
  `<g transform="rotate(-110) scale(1 -1)"><path class="l"${at(d + 0.1)} d="${SEPAL}" fill="url(#le)"/></g>`;
const leaf = (d: number, deep: boolean) =>
  `<g class="l"${at(d)}><path class="v" d="${LEAF}" fill="url(#${deep ? "ld" : "le"})"/><path d="${LEAF_SHADE}" fill="url(#lh)"/><path class="r" d="${LEAF_VEINS}"/></g>`;
const loosePetal = (d: number, tone: "petalBlush" | "petalChampagne" | "petalIvory") => {
  const [body, rim] = tone === "petalBlush" ? ["bo", "br"] : tone === "petalChampagne" ? ["ro", "rr"] : ["io", "ir"];
  return `<g class="p"${at(d)}><path d="${LOOSE_PETAL}" fill="url(#${body})" stroke-width=".5"/><path d="${LOOSE_FOLD}" fill="url(#lf)" stroke="none"/><path d="${LOOSE_EDGE}" fill="url(#${rim})" stroke="none"/></g>`;
};

type Stop = [offset: number, colour: string, opacity?: number];
const stops = (list: Stop[]) => list.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ""}/>`).join("");
const rg = (id: string, list: Stop[], box = `cx="50%" cy="100%" r="110%"`) => `<radialGradient id="${id}" ${box}>${stops(list)}</radialGradient>`;
const lg = (id: string, list: Stop[], dir = "") => `<linearGradient id="${id}"${dir}>${stops(list)}</linearGradient>`;
const centred = `cx="50%" cy="50%" r="60%"`;
const upward = ` x1="0" y1="1" x2="0" y2="0"`;

const gradients = (c: FloralPalette) =>
  `<defs>` +
  // Champagne rose: deeper at the base of each petal, lifting to ivory at the rim.
  rg("ro", [[0, c.petalMid], [0.5, c.petal], [1, c.petalLight]]) +
  rg("rm", [[0, c.petalDeep], [0.6, c.petalMid], [1, c.petal]]) +
  rg("ri", [[0, c.petalLine], [1, c.petalMid]], centred) +
  lg("rr", [[0, c.petalLight, 0.95], [1, c.petal, 0.4]], upward) +
  // Blush rose.
  rg("bo", [[0, c.blushDeep], [0.5, c.blush], [1, c.blushLight]]) +
  rg("bm", [[0, c.blushDeep], [0.7, c.blush], [1, c.blushLight]]) +
  rg("bi", [[0, c.blushDeep], [1, c.blush]], centred) +
  lg("br", [[0, c.petalLight, 0.9], [1, c.blushLight, 0.3]], upward) +
  // Ivory rose: a champagne warmth only at the base.
  rg("io", [[0, c.petal], [0.45, c.petalLight], [1, c.bloom]]) +
  rg("im", [[0, c.petalMid], [0.6, c.petal], [1, c.petalLight]]) +
  rg("ii", [[0, c.petalMid], [1, c.petalLight]], centred) +
  lg("ir", [[0, c.bloom], [1, c.petalLight, 0.5]], upward) +
  // Jasmine: white with a warm throat; gold centre.
  rg("ja", [[0, c.petal], [0.3, c.petalLight], [1, c.bloom]]) +
  rg("go", [[0, c.petalMid], [1, c.centre]], `cx="40%" cy="35%" r="70%"`) +
  // Leaves: sage to botanical, botanical to forest; a leaf's shaded underside; a loose petal's fold.
  lg("le", [[0, c.leafDeep], [1, c.leaf]]) +
  lg("ld", [[0, c.forest], [1, c.leafDeep]]) +
  lg("lh", [[0, c.forest, 0.35], [1, c.forest, 0.05]]) +
  lg("lf", [[0, c.petalLine, 0.3], [1, c.petalLine, 0]], upward) +
  // A soft natural shadow under each flower.
  `<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="${c.forest}" flood-opacity=".22"/></filter>` +
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
  `.p{transform-origin:50% 100%;stroke:${c.petalLine};stroke-opacity:.4}.j{stroke:${c.bloomLine};stroke-opacity:.75;stroke-width:.45}` +
  `.l{transform-origin:0 50%}.v{stroke:${c.stem};stroke-width:.5;stroke-opacity:.35}.r{fill:none;stroke:${c.petalLight};stroke-width:.6;stroke-opacity:.5}` +
  `.s{fill:none;stroke:${c.stem};stroke-linecap:round}.f{stroke:${c.petalLine};stroke-width:.5}.n{stroke:none}.h{fill:none;stroke-width:.9;stroke-linecap:round;stroke-opacity:.8}` +
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
  if (kind === "leaf" || kind === "leafDeep") return `<g transform="${place(x, y, s, r)}">${leaf(d, kind === "leafDeep")}</g>`;
  const body = kind === "rose" || kind === "blush" || kind === "ivory" ? rose(d, kind) : kind === "jasmine" ? jasmine(d) : kind === "bud" ? bud(d) : loosePetal(d, kind);
  // Flowers and petals cast a faint shadow on what lies beneath them.
  return `<g transform="${place(x, y, s, r)}" filter="url(#sh)">${body}</g>`;
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
