/**
 * Unit tests for admin product validation and the database → storefront mapping.
 *   npm test
 * Database-level visibility and admin-only writes are tested against Postgres in
 * supabase/tests/catalogue_visibility_test.sql.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { productSchema, productVisibility, publishBlockers } from "../src/lib/admin/product-rules.ts";
import { rowToProduct, type ProductRow } from "../src/lib/store/product-mapping.ts";
import { moveInOrder } from "../src/lib/admin/ordering.ts";

const form = (over: Record<string, unknown> = {}) => ({
  id: "",
  slug: "radiance-glow-cream",
  name: "Radiance Glow Cream",
  description: "Repair | Nourish | Brighten",
  price: "399",
  compare_at_price: "",
  stock_quantity: "12",
  sku: "",
  category_id: "",
  is_published: "on",
  is_featured: "",
  is_best_seller: "",
  images: [{ path: "uploads/products/radiance-ab12cd34.webp", alt: "Radiance Glow Cream" }],
  seo_title: "",
  seo_description: "",
  ...over,
});

const errors = (input: unknown) => {
  const r = productSchema.safeParse(input);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
};

test("products: a complete published product is accepted with server-side coercion", () => {
  const r = productSchema.parse(form());
  assert.equal(r.price, 399);
  assert.equal(r.stock_quantity, 12);
  assert.equal(r.is_published, true);
  assert.equal(r.compare_at_price, null);
  assert.equal(r.category_id, null);
});

test("products: drafts may be saved before the price and photos are confirmed", () => {
  const r = productSchema.parse(form({ is_published: "", price: "0", images: [] }));
  assert.equal(r.is_published, false);
});

test("products: publishing needs a real price and a photo", () => {
  assert.equal(errors(form({ price: "0" })).price, "Set the real price before publishing");
  assert.equal(errors(form({ images: [] })).images, "Add at least one photo before publishing");
});

test("products: prices and stock are validated on the server", () => {
  assert.ok(errors(form({ price: "-1" })).price);
  assert.ok(errors(form({ price: "12.345" })).price, "more than two decimals");
  assert.ok(errors(form({ price: "abc" })).price);
  assert.ok(errors(form({ price: "2000000" })).price);
  assert.ok(errors(form({ stock_quantity: "1.5" })).stock_quantity);
  assert.ok(errors(form({ stock_quantity: "-3" })).stock_quantity);
  assert.equal(productSchema.parse(form({ stock_quantity: "" })).stock_quantity, null, "empty = not tracked");
  assert.equal(errors(form({ compare_at_price: "399" })).compare_at_price, "Compare-at price must be higher than the price");
  assert.equal(productSchema.parse(form({ compare_at_price: "499" })).compare_at_price, 499);
});

test("products: slugs and image paths are restricted", () => {
  assert.ok(errors(form({ slug: "Bad Slug" })).slug);
  assert.equal(productSchema.parse(form({ slug: "Radiance-Glow" })).slug, "radiance-glow");
  assert.ok(errors(form({ images: [{ path: "uploads/../secret.webp", alt: "" }] })).images);
  assert.ok(errors(form({ images: [{ path: "javascript:alert(1)", alt: "" }] })).images);
  assert.equal(productSchema.parse(form({ images: [{ path: "https://cdn.example.com/a.webp", alt: "" }] })).images.length, 1);
});

const row = (over: Partial<ProductRow> = {}): ProductRow => ({
  id: "767073ec-8da5-40ef-a21f-e3a1c61f488a",
  handle: "test",
  title: "test",
  description: "",
  price: 55,
  compareAtPrice: 99.55,
  inventory: 0,
  sku: null,
  categoryId: null,
  category: null,
  featured: false,
  bestSeller: false,
  published: true,
  createdAt: "2026-10-21T05:59:30Z",
  seoTitle: null,
  seoDescription: null,
  images: [{ id: "i1", path: "uploads/products/cloudxfn-photoroom-75509e56.png", alt: "", sort: 0, isPrimary: true }],
  ...over,
});

test("storefront: existing product data is preserved exactly (price, compare-at, slug, image)", () => {
  const p = rowToProduct(row());
  assert.equal(p.handle, "test");
  assert.equal(p.priceRange.min.amount, 55);
  assert.equal(p.compareAtPriceRange?.min.amount, 99.55);
  assert.equal(p.variants[0].id, p.id, "the product id is the purchasable variant id");
  assert.match(p.featuredImage!.url, /uploads\/products\/cloudxfn-photoroom-75509e56\.png$/);
  assert.equal(p.featuredImage!.alt, "test", "missing alt text falls back to the product name");
});

test("storefront: published products with stock 0 show as out of stock, untracked stock is on sale", () => {
  assert.equal(rowToProduct(row({ inventory: 0 })).availableForSale, false);
  assert.equal(rowToProduct(row({ inventory: 3 })).availableForSale, true);
  assert.equal(rowToProduct(row({ inventory: null })).availableForSale, true);
  assert.equal(rowToProduct(row({ published: false, inventory: 5 })).availableForSale, false);
  assert.equal(productVisibility({ published: true, inventory: 0 }), "out-of-stock");
  assert.equal(productVisibility({ published: true, inventory: null }), "on-sale");
  assert.equal(productVisibility({ published: false, inventory: 9 }), "draft");
});

test("storefront: category and best-seller flags become collections", () => {
  const p = rowToProduct(row({ category: { handle: "serums", title: "Serums" }, bestSeller: true }));
  assert.deepEqual(p.collectionHandles, ["serums", "bestsellers"]);
  assert.equal(p.productType, "Serums");
});

test("publish toggle: stored drafts at ₹0 or without photos cannot be published", () => {
  // The five imported drafts: price 0, photos present.
  assert.deepEqual(publishBlockers({ name: "Radiance Glow Cream", price: 0, imageCount: 4 }), ["set the real price"]);
  assert.deepEqual(publishBlockers({ name: "Serum", price: 897, imageCount: 0 }), ["add at least one photo"]);
  assert.deepEqual(publishBlockers({ name: " ", price: Number.NaN, imageCount: 0 }), ["add a name", "set the real price", "add at least one photo"]);
  assert.deepEqual(publishBlockers({ name: "Radiance Glow Cream", price: 399, imageCount: 4 }), []);
});

test("manual order: swaps with the neighbour and renumbers the whole list, writing only changed rows", () => {
  const list = [
    { id: "a", sort: 10 },
    { id: "b", sort: 20 },
    { id: "c", sort: 30 },
  ];
  assert.deepEqual(moveInOrder(list, "c", "up"), [
    { id: "c", sort: 20 },
    { id: "b", sort: 30 },
  ]);
  assert.deepEqual(moveInOrder(list, "a", "down"), [
    { id: "b", sort: 10 },
    { id: "a", sort: 20 },
  ]);
  assert.deepEqual(moveInOrder(list, "a", "up"), [], "already first: nothing to write");
  assert.deepEqual(moveInOrder(list, "c", "down"), []);
  assert.equal(moveInOrder(list, "zzz", "up"), null);
});

test("manual order: equal or missing numbers (e.g. new rows at 0) are resolved by the renumbering", () => {
  const changes = moveInOrder(
    [
      { id: "a", sort: 0 },
      { id: "b", sort: 0 },
      { id: "c", sort: null },
    ],
    "b",
    "down",
  );
  assert.deepEqual(changes, [
    { id: "a", sort: 10 },
    { id: "c", sort: 20 },
    { id: "b", sort: 30 },
  ]);
});
