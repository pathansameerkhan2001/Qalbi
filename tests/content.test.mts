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

test("suggested categories fit the categories table and never repeat a handle", async () => {
  const { existsSync } = await import("node:fs");
  const { suggestedCategories } = await import("../src/data/category-suggestions.ts");
  const slugs = new Set<string>();
  for (const s of suggestedCategories) {
    assert.equal(isSlug(s.slug), true, s.slug);
    assert.equal(slugs.has(s.slug), false, `duplicate ${s.slug}`);
    slugs.add(s.slug);
    assert.ok(s.name.length >= 1 && s.name.length <= 80, s.name);
    assert.ok(s.description.length <= 400, s.slug);
    assert.ok(s.basis.length > 0, `${s.slug} needs a basis for the store owner`);
    // Only QALBI's own website photos, and they must exist.
    if (s.imagePath) {
      assert.equal(isMediaPath(s.imagePath), true, s.imagePath);
      assert.ok(existsSync(`public/assets/${s.imagePath}`), `${s.imagePath} is missing`);
    }
  }
});

test("the approved Shop by Category set: same eight names, handles and photos everywhere", async () => {
  const { existsSync } = await import("node:fs");
  const { suggestedCategories } = await import("../src/data/category-suggestions.ts");
  // src/data/categories.ts uses app path aliases that plain Node can't load, so read its entries as text.
  const source = (await import("node:fs")).readFileSync("src/data/categories.ts", "utf8");
  const homeCategories = [...source.matchAll(/\{ label: "([^"]+)", collectionHandle: "([^"]+)"/g)].map((m) => ({ label: m[1], collectionHandle: m[2] }));
  const approved = ["Face Serums", "Face Wash & Cleansers", "Face Creams & Moisturizers", "Scrubs & Face Masks", "Hair Mask & Shampoo", "Lip, Eye & Lash Care", "Body & Personal Care", "Herbal Tea"];
  assert.deepEqual(suggestedCategories.map((s) => s.name), approved);
  assert.deepEqual(homeCategories.map((c) => c.label), approved);
  assert.deepEqual(homeCategories.map((c) => c.collectionHandle), suggestedCategories.map((s) => s.slug));
  for (const s of suggestedCategories) {
    assert.ok(s.imagePath, `${s.slug} needs a photo`);
    assert.ok(existsSync(`public/assets/${s.imagePath}`), `${s.imagePath} is missing`);
    assert.ok(s.description.length > 0, `${s.slug} needs an introduction`);
  }
});

test("approved categories: no duplicates by handle or normalised name; renames are only proposed", async () => {
  const { missingSuggestions, matchSuggestion, approvedRename } = await import("../src/data/category-suggestions.ts");
  // The three categories in the live database (created by the product import).
  const live = [
    { handle: "serums", title: "Serums" },
    { handle: "face-creams-moisturisers", title: "Face Creams & Moisturisers" },
    { handle: "face-wash-cleansers", title: "Face Wash & Cleansers" },
  ];
  assert.deepEqual(missingSuggestions(live).map((s) => s.slug), ["scrubs-face-masks", "hair-mask-shampoo", "lip-eye-lash-care", "body-personal-care", "herbal-tea"]);
  assert.deepEqual(missingSuggestions([]).length, 8);
  // Same name under another handle, written differently, still counts as existing.
  assert.equal(matchSuggestion({ handle: "tea", title: "herbal  tea" })?.slug, "herbal-tea");
  assert.equal(matchSuggestion({ handle: "body", title: "Body and Personal Care" })?.slug, "body-personal-care");
  assert.equal(matchSuggestion({ handle: "sunscreen", title: "Sunscreen" }), undefined);
  // Capitalisation, spacing, punctuation and "&" vs "and" never create a duplicate.
  for (const [title, slug] of [
    ["FACE  SERUMS", "serums"],
    ["Face Wash and Cleansers", "face-wash-cleansers"],
    ["Lip Eye and Lash Care", "lip-eye-lash-care"],
    ["scrubs & face-masks", "scrubs-face-masks"],
    [" Hair Mask & Shampoo ", "hair-mask-shampoo"],
  ]) {
    assert.equal(matchSuggestion({ handle: "other-handle", title })?.slug, slug, title);
    assert.equal(missingSuggestions([{ handle: "other-handle", title }]).some((s) => s.slug === slug), false, title);
  }
  // Once all eight exist, nothing more is offered.
  const all = [...live, ...missingSuggestions(live).map((s) => ({ handle: s.slug, title: s.name }))];
  assert.deepEqual(missingSuggestions(all), []);
  // Spelling differences are proposed, never applied automatically.
  assert.equal(approvedRename(live[0]), "Face Serums");
  assert.equal(approvedRename(live[1]), "Face Creams & Moisturizers");
  assert.equal(approvedRename(live[2]), null);
  assert.equal(approvedRename({ handle: "sunscreen", title: "Sunscreen" }), null);
});

test("the shop-category assignment SQL never deletes and only fills empty product categories", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("supabase/scripts/assign_shop_categories.sql", "utf8").replace(/--.*$/gm, "");
  assert.doesNotMatch(code, /\b(delete|drop|truncate|insert)\b/i);
  assert.match(code, /update public\.products p set category_id = c\.id[\s\S]*?and p\.category_id is null;/);
  // Renames and showing categories stay commented out until the owner approves them.
  assert.doesNotMatch(code, /set name =|set is_active/);
});

test("the add-suggested-categories SQL matches the suggestion list and only inserts hidden rows", async () => {
  const { readFileSync } = await import("node:fs");
  const { suggestedCategories } = await import("../src/data/category-suggestions.ts");
  const sql = readFileSync("supabase/scripts/add_suggested_categories.sql", "utf8");
  const code = sql.replace(/--.*$/gm, "");
  for (const s of suggestedCategories) {
    const row = new RegExp(`\\('${s.name.replace(/[&]/g, "\\$&")}',\\s*'${s.slug}',\\s*(null|'[^']*'),\\s*(null|'([^']*)')`).exec(code);
    assert.ok(row, `${s.slug} is missing from the SQL`);
    assert.equal(row[3] ?? null, s.imagePath, `${s.slug} image differs`);
  }
  assert.match(code, /on conflict \(slug\) do nothing/);
  assert.match(code, /\bfalse\s*\nfrom proposed/);
  assert.doesNotMatch(code, /\b(update|delete|drop|truncate)\b/i);
});

test("customer reviews: only approved wording is published; drafts carry no rating or verified badge", async () => {
  const { reviews, publishedReviews } = await import("../src/data/reviews.ts");
  const ids = new Set<string>();
  for (const r of reviews) {
    assert.equal(ids.has(r.id), false, `duplicate ${r.id}`);
    ids.add(r.id);
    assert.ok(["pending-approval", "approved"].includes(r.status), `${r.id}: unknown status`);
    assert.ok(r.name.trim() && r.quote.trim(), `${r.id}: name and quote are required`);
    if (r.rating !== null) assert.ok(Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5, `${r.id}: rating must be 1–5`);
    if (r.status !== "approved") {
      assert.equal(r.rating, null, `${r.id}: a draft must not carry a rating`);
      assert.equal(r.verifiedPurchase, false, `${r.id}: a draft must not be marked verified`);
    }
  }
  assert.deepEqual(
    publishedReviews.map((r) => r.id),
    reviews.filter((r) => r.status === "approved").map((r) => r.id),
  );
  assert.ok(publishedReviews.every((r) => r.status === "approved"));
});
