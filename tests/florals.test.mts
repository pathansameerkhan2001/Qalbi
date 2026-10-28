/**
 * Floral artwork: the generated files match the manifest, and the SVG builder
 * keeps the parts the website relies on.
 *   npm test   (regenerate with npm run florals:build)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { arrangements, floralSize, floralSvg, type FloralPalette, type FloralVariant } from "../src/lib/florals/art.ts";
import { floralFiles } from "../src/lib/florals/manifest.ts";

test("florals: every arrangement has a generated file whose content hash matches the manifest", () => {
  for (const variant of Object.keys(arrangements) as FloralVariant[]) {
    const entry = floralFiles[variant];
    assert.ok(entry, `${variant} is in the manifest`);
    const hash = (file: string) => createHash("sha256").update(readFileSync(`public/florals/${file}`, "utf8")).digest("hex").slice(0, 10);
    assert.equal(entry.src, `/florals/${variant}.svg?v=${hash(`${variant}.svg`)}`, `${variant}: run npm run florals:build`);
    assert.equal(entry.still, `/florals/${variant}.still.svg?v=${hash(`${variant}.still.svg`)}`, `${variant} (still): run npm run florals:build`);
    assert.deepEqual({ width: entry.width, height: entry.height }, floralSize(variant));
  }
});

test("florals: a generated SVG is standalone, uses only the given colours and stays still with reduced motion", () => {
  const palette: FloralPalette = { petalLight: "#000001", petal: "#000002", petalMid: "#000003", petalDeep: "#000004", petalLine: "#000005", bloom: "#000006", bloomLine: "#000007", centre: "#000008", leaf: "#000009", leafDeep: "#00000a", stem: "#00000b", blushLight: "#00000c", blush: "#00000d", blushDeep: "#00000e" };
  const svg = floralSvg("bouquet", palette);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[-\d. ]+" width="\d+" height="\d+">/);
  assert.match(svg, /@media \(prefers-reduced-motion:reduce\)\{\*\{animation:none!important\}\}/);
  const colours = new Set(svg.match(/#[0-9a-f]{6}/gi));
  assert.deepEqual([...colours].filter((c) => !Object.values(palette).includes(c)), [], "no colour outside the palette");
  assert.ok(!svg.includes("undefined") && !svg.includes("NaN"));
  // The still twin (reduced motion) has no animation at all.
  assert.doesNotMatch(floralSvg("bouquet", palette, { animate: false }), /animation|@keyframes/);
  assert.ok(svg.endsWith("</svg>"));
});
