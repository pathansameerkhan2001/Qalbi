/**
 * Product sharing: message, canonical link and official share links.
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProductShare, productShareUrl } from "../src/lib/share.ts";

const origin = "https://qalbinaturals.in";

test("share: the product's own canonical page on the configured site", () => {
  assert.equal(productShareUrl("/products/radiance-glow-cream", origin), "https://qalbinaturals.in/products/radiance-glow-cream");
  assert.equal(productShareUrl("products/radiance-glow-cream", origin), "https://qalbinaturals.in/products/radiance-glow-cream");
  assert.equal(productShareUrl("/products/radiance-glow-cream", "https://qalbinaturals.in/"), "https://qalbinaturals.in/products/radiance-glow-cream");
});

test("share: message from the product record, with the price only when one is given", () => {
  const withPrice = buildProductShare({ title: "Radiance Glow Cream", path: "/products/radiance-glow-cream", price: "₹599" }, origin, "QALBI Naturals");
  assert.equal(withPrice.text, "Discover Radiance Glow Cream (₹599) at QALBI Naturals. Explore the product here:");
  assert.equal(withPrice.textWithUrl, "Discover Radiance Glow Cream (₹599) at QALBI Naturals. Explore the product here: https://qalbinaturals.in/products/radiance-glow-cream");
  assert.equal(withPrice.title, "Radiance Glow Cream | QALBI Naturals");
  const noPrice = buildProductShare({ title: "Radiance Glow Cream", path: "/products/radiance-glow-cream", price: null }, origin, "QALBI Naturals");
  assert.equal(noPrice.text, "Discover Radiance Glow Cream at QALBI Naturals. Explore the product here:");
});

test("share: WhatsApp and Facebook links are the official ones, with everything URL-encoded", () => {
  const s = buildProductShare({ title: "Ayurvedic Ubtan Face & Body Scrub", path: "/products/ayuredic-ubtan-face-body-scrub", price: "₹150" }, origin, "QALBI Naturals");
  const wa = new URL(s.whatsappUrl);
  assert.equal(wa.origin + wa.pathname, "https://wa.me/");
  assert.equal(wa.searchParams.get("text"), s.textWithUrl, "the whole message survives encoding, including & and ₹");
  assert.ok(!s.whatsappUrl.includes(" ") && !s.whatsappUrl.includes("&body"), "no raw spaces or stray parameters");
  const fb = new URL(s.facebookUrl);
  assert.equal(fb.origin + fb.pathname, "https://www.facebook.com/sharer/sharer.php");
  assert.equal(fb.searchParams.get("u"), "https://qalbinaturals.in/products/ayuredic-ubtan-face-body-scrub");
});
