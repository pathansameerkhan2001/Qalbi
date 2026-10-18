/**
 * Unit tests for the content-management rules (hero links, Reel URLs, blog markup).
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromIstInput, isMediaPath, isSafeSiteLink, isSlug, normalizeReelUrl, parseBlogBody, readingMinutes, slugify, toIstInput, truncate } from "../src/lib/content/rules.ts";

test("media paths: storage paths only", () => {
  assert.equal(isMediaPath("uploads/hero/slide-ab12cd34.webp"), true);
  assert.equal(isMediaPath("hero/homepage-desktop.webp"), true);
  assert.equal(isMediaPath("uploads/../secret.webp"), false);
  assert.equal(isMediaPath("/uploads/a.webp"), false);
  assert.equal(isMediaPath("https://evil.example/a.webp"), false);
  assert.equal(isMediaPath("Uploads/A.webp"), false);
  assert.equal(isMediaPath(""), false);
});

test("site links: internal paths and https only", () => {
  for (const ok of ["/", "/products", "/collections/serums?sort=newest", "https://www.instagram.com/qalbinaturals/"]) assert.equal(isSafeSiteLink(ok), true, ok);
  for (const bad of ["javascript:alert(1)", "//evil.example", "http://example.com", "data:text/html,x", "products", "/a b", ""]) assert.equal(isSafeSiteLink(bad), false, bad);
});

test("reel URLs are normalised to one canonical form", () => {
  assert.equal(normalizeReelUrl("https://www.instagram.com/reel/AbC_12-3/?igsh=xyz"), "https://www.instagram.com/reel/AbC_12-3/");
  assert.equal(normalizeReelUrl("https://instagram.com/reels/AbC_12-3"), "https://www.instagram.com/reel/AbC_12-3/");
  assert.equal(normalizeReelUrl("https://www.instagram.com/qalbinaturals/reel/AbC_12-3/"), "https://www.instagram.com/reel/AbC_12-3/");
  assert.equal(normalizeReelUrl("https://www.instagram.com/p/XyZ12345/"), "https://www.instagram.com/p/XyZ12345/");
  assert.equal(normalizeReelUrl("https://www.instagram.com/qalbinaturals/"), null);
  assert.equal(normalizeReelUrl("http://www.instagram.com/reel/AbC_12-3/"), null);
  assert.equal(normalizeReelUrl("https://instagram.com.evil.example/reel/AbC_12-3/"), null);
  assert.equal(normalizeReelUrl("not a url"), null);
});

test("slugs", () => {
  assert.equal(slugify("  Your Évening Ritual: 5 Steps! "), "your-evening-ritual-5-steps");
  assert.equal(isSlug("your-evening-ritual"), true);
  assert.equal(isSlug("Bad Slug"), false);
  assert.equal(isSlug("-leading"), false);
});

test("blog markup becomes text blocks, never HTML", () => {
  const blocks = parseBlogBody("## Morning\nCleanse gently.\nThen tone.\n\n- Cleanser\n- Toner\n\n### Note\n<script>alert(1)</script>");
  assert.deepEqual(blocks, [
    { type: "h2", text: "Morning" },
    { type: "p", text: "Cleanse gently. Then tone." },
    { type: "ul", items: ["Cleanser", "Toner"] },
    { type: "h3", text: "Note" },
    { type: "p", text: "<script>alert(1)</script>" },
  ]);
  assert.deepEqual(parseBlogBody(""), []);
});

test("reading time and truncation", () => {
  assert.equal(readingMinutes("word ".repeat(450)), 2);
  assert.equal(readingMinutes(""), 1);
  assert.equal(truncate("short", 160), "short");
  const long = truncate("lorem ipsum ".repeat(30), 60);
  assert.ok(long.length <= 60 && long.endsWith("…"));
});

test("publication dates are entered and shown in India Standard Time", () => {
  assert.equal(fromIstInput("2026-10-19T09:30"), "2026-10-19T04:00:00.000Z");
  assert.equal(toIstInput("2026-10-19T04:00:00.000Z"), "2026-10-19T09:30");
  assert.equal(fromIstInput(""), null);
  assert.equal(fromIstInput("19/10/2026"), null);
  assert.equal(toIstInput(null), "");
});
