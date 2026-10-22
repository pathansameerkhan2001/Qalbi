/**
 * Unit tests for the product description parser (src/lib/content/product-description.ts).
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { namesIngredient, parseProductDescription, productsWithIngredient, splitIngredientList, stripMarkdown } from "../src/lib/content/product-description.ts";

/** The facial cleanser description exactly as stored in the live database (Windows line endings). */
const cleanser = [
  "**QALBI Ayurvedic Facial Cleanser**",
  "",
  "Experience a refreshing skincare ritual with QALBI Ayurvedic Facial Cleanser, formulated with a blend of botanical extracts.",
  "",
  "Its carefully selected ingredients help maintain skin hydration.",
  "",
  "**Key Benefits**",
  "- Cleanses skin and removes everyday impurities.",
  "- Helps maintain skin moisture and softness.",
  "",
  "**Key Ingredients:** Green Cardamom Extract, Shea Butter, Vitamin B5, Saffron, Wild Turmeric, and Hyaluronic Acid.",
  "",
  "**How to Use:** Apply to damp skin, gently massage, and rinse thoroughly with water. Follow the directions on the product packaging.",
  "",
  "**Suitable For:** Daily facial cleansing, subject to individual skin tolerance.",
  "",
  "*For external use only. Perform a patch test before use.*",
].join("\r\n");

test("structured description: sections, no raw markers, title line not repeated", () => {
  const d = parseProductDescription(cleanser, "QALBI Facial Cleanser");
  assert.deepEqual(d.intro, [
    { type: "p", text: "Experience a refreshing skincare ritual with QALBI Ayurvedic Facial Cleanser, formulated with a blend of botanical extracts." },
    { type: "p", text: "Its carefully selected ingredients help maintain skin hydration." },
  ]);
  assert.deepEqual(d.benefits, ["Cleanses skin and removes everyday impurities.", "Helps maintain skin moisture and softness."]);
  assert.deepEqual(d.keyIngredients, ["Green Cardamom Extract", "Shea Butter", "Vitamin B5", "Saffron", "Wild Turmeric", "Hyaluronic Acid"]);
  assert.deepEqual(d.howToUse, ["Apply to damp skin, gently massage, and rinse thoroughly with water.", "Follow the directions on the product packaging."]);
  assert.equal(d.suitableFor, "Daily facial cleansing, subject to individual skin tolerance.");
  assert.deepEqual(d.notes, ["For external use only. Perform a patch test before use."]);
  assert.deepEqual(d.other, []);
  const all = JSON.stringify(d);
  assert.doesNotMatch(all, /\*\*/);
});

test("a first bold line that is not the product name is kept as a section", () => {
  const d = parseProductDescription("**Why we made it**\nBecause.\n\nMore.", "Radiance Glow Cream");
  assert.deepEqual(d.intro, []);
  assert.deepEqual(d.other, [{ heading: "Why we made it", blocks: [{ type: "p", text: "Because." }, { type: "p", text: "More." }] }]);
});

test("plain descriptions and numbered usage lists", () => {
  assert.deepEqual(parseProductDescription("Repair | Nourish | Brighten").intro, [{ type: "p", text: "Repair | Nourish | Brighten" }]);
  const d = parseProductDescription("Intro.\n\n## How to use\n1. Cleanse.\n2. Apply a pea-sized amount.");
  assert.deepEqual(d.howToUse, ["Cleanse.", "Apply a pea-sized amount."]);
  assert.deepEqual(parseProductDescription("").intro, []);
});

test("stored text is never turned into markup", () => {
  const d = parseProductDescription('<script>alert(1)</script>\n\n**Key Benefits**\n- <img src=x onerror=alert(1)>');
  // The parser returns plain strings; React escapes them when rendering.
  assert.deepEqual(d.intro, [{ type: "p", text: "<script>alert(1)</script>" }]);
  assert.deepEqual(d.benefits, ["<img src=x onerror=alert(1)>"]);
});

test("stripMarkdown gives clean meta text", () => {
  assert.equal(stripMarkdown("**Title**\r\n\r\nBody *soft*.\r\n- one\r\n- two"), "Title Body soft. one two");
});

test("ingredient names match whole words only", () => {
  assert.deepEqual(splitIngredientList("A, B; C and D, and E."), ["A", "B", "C and D", "E"]);
  assert.equal(namesIngredient(["Green Cardamom Extract"], "Cardamom"), true);
  assert.equal(namesIngredient(["Wild Turmeric"], "Turmeric"), true);
  assert.equal(namesIngredient(["Rosemary Oil"], "Rose"), false);
  assert.equal(namesIngredient(["Aloe  Vera Gel"], "Aloe Vera"), true);
  assert.equal(namesIngredient(["Shea Butter"], "Saffron"), false);
});

test("ingredient → product links come from the product's own key ingredients or an explicit link", () => {
  const products = [
    { handle: "qalbi-facial-cleanser", title: "QALBI Facial Cleanser", description: cleanser },
    { handle: "moisturizer", title: "Moisturizer", description: "A light cream." },
  ];
  assert.deepEqual(productsWithIngredient({ name: "Saffron", productHandles: [] }, products).map((p) => p.handle), ["qalbi-facial-cleanser"]);
  assert.deepEqual(productsWithIngredient({ name: "Neem", productHandles: [] }, products), []);
  assert.deepEqual(productsWithIngredient({ name: "Neem", productHandles: ["moisturizer"] }, products).map((p) => p.handle), ["moisturizer"]);
});
