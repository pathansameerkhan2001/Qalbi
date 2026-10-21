/**
 * Unit tests for structured data helpers and the ingredient icon list.
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { breadcrumbJsonLd } from "../src/lib/site.ts";
import { ingredientIcons } from "../src/types/content.ts";

test("breadcrumbs: Home first, positions in order, current page without URL", () => {
  const data = JSON.parse(breadcrumbJsonLd([{ label: "Products", href: "/products" }, { label: "Radiance Glow Cream" }]));
  assert.equal(data["@type"], "BreadcrumbList");
  assert.deepEqual(
    data.itemListElement.map((i: { position: number; name: string }) => [i.position, i.name]),
    [
      [1, "Home"],
      [2, "Products"],
      [3, "Radiance Glow Cream"],
    ],
  );
  assert.match(data.itemListElement[1].item, /\/products$/);
  assert.equal(data.itemListElement[2].item, undefined);
});

test("breadcrumbs: JSON-LD cannot close the script tag", () => {
  const json = breadcrumbJsonLd([{ label: "</script><script>alert(1)</script>" }]);
  assert.equal(json.includes("<"), false);
  assert.equal(JSON.parse(json).itemListElement[1].name, "</script><script>alert(1)</script>");
});

test("ingredient icons match the database check constraint", () => {
  // supabase/migrations/20261021000000_ingredients.sql: icon in (...)
  assert.deepEqual([...ingredientIcons], ["saffron", "rose", "coconut", "aloe", "turmeric", "neem", "cardamom", "leaf"]);
});
