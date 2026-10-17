/**
 * Unit tests for the pure checkout helpers.
 *   npm test
 * (Node 22.6+ runs TypeScript directly; no build step.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutSchema } from "../src/lib/checkout/schema.ts";
import { orderWhatsAppMessage, whatsappUrl } from "../src/lib/checkout/whatsapp.ts";

const valid = {
  name: "Ayesha Khan",
  phone: "+91 98765 43210",
  email: "",
  addressLine1: "12 Rose Street, Banjara Hills",
  addressLine2: "",
  city: "Hyderabad",
  state: "Telangana",
  postalCode: "500034",
  notes: "",
  paymentMethod: "COD",
  idempotencyKey: "6f1c2a7e-1d2b-4c3d-9e8f-0a1b2c3d4e5f",
};

test("accepts a complete Cash on Delivery order", () => {
  assert.equal(checkoutSchema.safeParse(valid).success, true);
});

test("accepts pay-by-phone", () => {
  assert.equal(checkoutSchema.safeParse({ ...valid, paymentMethod: "PHONE" }).success, true);
});

test("rejects unsupported payment methods", () => {
  assert.equal(checkoutSchema.safeParse({ ...valid, paymentMethod: "CARD" }).success, false);
});

test("rejects invalid phone, PIN code, state and email", () => {
  for (const bad of [{ phone: "12345" }, { postalCode: "012345" }, { postalCode: "50003" }, { state: "Atlantis" }, { email: "not-an-email" }]) {
    assert.equal(checkoutSchema.safeParse({ ...valid, ...bad }).success, false, JSON.stringify(bad));
  }
});

test("does not accept any price or total from the browser", () => {
  const parsed = checkoutSchema.parse({ ...valid, total: 1, price: 1 });
  assert.equal("total" in parsed, false);
  assert.equal("price" in parsed, false);
});

test("requires an idempotency key", () => {
  assert.equal(checkoutSchema.safeParse({ ...valid, idempotencyKey: "abc" }).success, false);
});

test("WhatsApp message contains order number, items, total and https image links only", () => {
  const message = orderWhatsAppMessage({
    orderNumber: "QN-261017-1001",
    items: [
      { title: "Radiance Glow Cream", quantity: 2, imageUrl: "https://example.supabase.co/storage/v1/object/public/qalbi-naturals-media/products/radiance-studio.webp" },
      { title: "Facial Cleanser", quantity: 1, imageUrl: "/assets/products/cleanser-studio.webp" },
    ],
    totalFormatted: "₹1,197",
    paymentLabel: "Cash on Delivery",
  });
  assert.match(message, /Order Number: QN-261017-1001/);
  assert.match(message, /• Radiance Glow Cream × 2/);
  assert.match(message, /Total: ₹1,197/);
  assert.match(message, /Radiance Glow Cream: https:\/\/example\.supabase\.co\//);
  assert.doesNotMatch(message, /\/assets\/products\/cleanser/, "relative URLs are not useful in WhatsApp");
  assert.match(message, /Please confirm my order\. Thank you!$/);
});

test("WhatsApp link targets the business number with an encoded message", () => {
  const url = whatsappUrl("919032543737", "Order: QN-1 & total ₹399\nThanks");
  assert.equal(url.startsWith("https://wa.me/919032543737?text="), true);
  assert.equal(decodeURIComponent(new URL(url).searchParams.get("text") ?? ""), "Order: QN-1 & total ₹399\nThanks");
  assert.equal(new URL(url).searchParams.get("text"), "Order: QN-1 & total ₹399\nThanks");
});
