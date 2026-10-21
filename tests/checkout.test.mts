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

// ---------------------------------------------------------------------------
// WhatsApp order request from the bag (customer details + verified prices)
// ---------------------------------------------------------------------------
import { orderRequestWhatsAppMessage, type WhatsAppOrderRequest } from "../src/lib/checkout/whatsapp.ts";
import { customerDetailsErrors, customerDetailsSchema } from "../src/lib/checkout/customer-details.ts";

const radiance = {
  title: "Radiance Glow Cream",
  quantity: 2,
  unitPrice: "₹399",
  lineTotal: "₹798",
  url: "https://qalbinaturals.com/products/radiance-glow-cream",
  imageUrl: "https://qalbinaturals.com/assets/products/radiance-studio.webp",
};
const customer = { name: "Asha Rao", address: "12 Lake Road\nIndiranagar, Bengaluru", pinCode: "560038" };
const request = (over: Partial<WhatsAppOrderRequest> = {}): WhatsAppOrderRequest => ({
  items: [radiance],
  subtotal: "₹798",
  delivery: "₹50",
  total: "₹848",
  customer,
  ...over,
});

test("order request: product, quantity, verified price, item total, links, delivery and total", () => {
  const m = orderRequestWhatsAppMessage(request());
  assert.match(m, /1\. Radiance Glow Cream × 2/);
  assert.match(m, /Price: ₹399 each · Item total: ₹798/);
  assert.match(m, /Product page: https:\/\/qalbinaturals\.com\/products\/radiance-glow-cream/);
  assert.match(m, /Photo \(link\): https:\/\/qalbinaturals\.com\/assets\/products\/radiance-studio\.webp/);
  assert.match(m, /Subtotal: ₹798\nDelivery: ₹50\nTotal: ₹848/);
  assert.doesNotMatch(m, /attached/i, "never claims an attachment");
  assert.doesNotMatch(m, /placed/i, "a request, not a placed order");
});

test("order request: includes the customer's name, address and PIN code", () => {
  const m = orderRequestWhatsAppMessage(request());
  assert.match(m, /Name: Asha Rao\nAddress: 12 Lake Road\nIndiranagar, Bengaluru\nPIN code: 560038/);
});

test("order request: an unknown delivery charge is never invented", () => {
  const m = orderRequestWhatsAppMessage(request({ delivery: null, total: null }));
  assert.match(m, /Delivery: to be confirmed/);
  assert.match(m, /Total: to be confirmed with the delivery charge/);
  assert.doesNotMatch(m, /₹848/);
});

test("order request: unconfirmed prices are never stated and no total is given", () => {
  const m = orderRequestWhatsAppMessage(request({ items: [{ ...radiance, unitPrice: null, lineTotal: null }], subtotal: null, delivery: null, total: null }));
  assert.match(m, /Price: please confirm/);
  assert.doesNotMatch(m, /₹/);
  assert.match(m, /Total: please confirm/);
});

test("order request: only public https links are included", () => {
  const m = orderRequestWhatsAppMessage(request({ items: [{ ...radiance, url: "http://localhost:3000/products/x", imageUrl: "/assets/products/x.webp" }] }));
  assert.doesNotMatch(m, /localhost|Product page|Photo/);
  assert.doesNotMatch(orderRequestWhatsAppMessage(request({ items: [{ ...radiance, imageUrl: "https://evil.example/a b.webp" }] })), /evil/);
});

test("order request: the wa.me link round-trips the full message through encoding", () => {
  const m = orderRequestWhatsAppMessage(request({ customer: { ...customer, address: "Flat #4 & 5, A/B Block?\nPune" } }));
  const url = whatsappUrl("919032543737", m);
  assert.ok(url.startsWith("https://wa.me/919032543737?text="));
  assert.equal(new URL(url).searchParams.get("text"), m, "round-trips through URL encoding");
  assert.doesNotMatch(url.split("?text=")[1], /[ \n&#?]/, "fully encoded");
});

test("customer details: valid input is trimmed and normalised", () => {
  const d = customerDetailsSchema.parse({ name: "  Asha   Rao ", address: " 12 Lake Road \r\n\n  Bengaluru  ", pinCode: " 560 038 " });
  assert.deepEqual(d, { name: "Asha Rao", address: "12 Lake Road\nBengaluru", pinCode: "560038" });
});

test("customer details: empty fields and invalid PIN codes get field messages", () => {
  const r = customerDetailsSchema.safeParse({ name: " ", address: "", pinCode: "" });
  assert.ok(!r.success);
  const e = customerDetailsErrors(r.error);
  assert.equal(e.name, "Please enter your full name");
  assert.equal(e.address, "Please enter your delivery address");
  assert.equal(e.pinCode, "Please enter your PIN code");
  for (const pinCode of ["012345", "56003", "5600388", "56A038"]) {
    const bad = customerDetailsSchema.safeParse({ ...customer, pinCode });
    assert.ok(!bad.success, pinCode);
    assert.equal(customerDetailsErrors(bad.error).pinCode, "Please enter a valid 6-digit PIN code");
  }
});

