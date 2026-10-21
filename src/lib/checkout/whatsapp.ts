/**
 * Customer-initiated WhatsApp order confirmation. The website cannot send a
 * WhatsApp message itself: it opens WhatsApp with a prefilled message that
 * the customer reviews and sends. Pure functions (no request access).
 */

export interface WhatsAppOrderSummary {
  orderNumber: string;
  items: { title: string; quantity: number; imageUrl: string | null }[];
  totalFormatted: string;
  paymentLabel: string;
}

export function orderWhatsAppMessage(order: WhatsAppOrderSummary): string {
  const products = order.items.map((i) => `• ${i.title} × ${i.quantity}`).join("\n");
  const images = order.items
    .filter((i): i is typeof i & { imageUrl: string } => Boolean(i.imageUrl && /^https:\/\//.test(i.imageUrl)))
    .map((i) => `${i.title}: ${i.imageUrl}`)
    .join("\n");
  return [
    "Hello QALBI Naturals! I have placed an order.",
    "",
    `Order Number: ${order.orderNumber}`,
    "",
    "Products:",
    products,
    "",
    `Total: ${order.totalFormatted}`,
    `Payment: ${order.paymentLabel}`,
    ...(images ? ["", "Product images:", images] : []),
    "",
    "Please confirm my order. Thank you!",
  ].join("\n");
}

/** What the WhatsApp order buttons need, resolved on the server (src/lib/whatsapp-order.ts). */
export interface WhatsAppOrderConfig {
  /** Business number from Store Settings → Contact (falls back to the brand number). */
  digits: string;
  /** Public https origin for product and photo links, or null (links are then left out). */
  siteOrigin: string | null;
  /** False for the preview catalogue: its prices are not confirmed and are never sent. */
  priceConfirmed: boolean;
}

/** One product in a WhatsApp order request. Prices are formatted on the server from catalogue data. */
export interface WhatsAppRequestItem {
  title: string;
  quantity: number;
  /** Formatted unit price, or null when the price is not confirmed (preview catalogue). */
  unitPrice: string | null;
  /** Formatted unit price × quantity, or null when the price is not confirmed. */
  lineTotal: string | null;
  /** Public https product page, or null when the site has no public address yet. */
  url: string | null;
  /** Public https image URL, or null. Sent as a link: WhatsApp text links cannot attach files. */
  imageUrl: string | null;
}

/** Order request from the bag: verified items and totals plus the delivery details the customer entered. */
export interface WhatsAppOrderRequest {
  items: WhatsAppRequestItem[];
  /** Formatted amounts, or null when not confirmed (then the shop confirms them in WhatsApp). */
  subtotal: string | null;
  delivery: string | null;
  total: string | null;
  customer: { name: string; address: string; pinCode: string };
}

const httpsOnly = (value: string | null | undefined) => (value && /^https:\/\/[^\s]+$/.test(value) ? value : null);

/**
 * Message for a customer-initiated WhatsApp order request from the bag. The
 * customer reviews it in WhatsApp and decides whether to send it: it is a
 * request, not a placed order. Prices are stated only when confirmed, and
 * nothing claims a photo is attached — photos are links.
 */
export function orderRequestWhatsAppMessage(order: WhatsAppOrderRequest): string {
  const blocks = order.items.map((item, i) => {
    const lines = [`${i + 1}. ${item.title} × ${item.quantity}`];
    lines.push(item.unitPrice && item.lineTotal ? `   Price: ${item.unitPrice} each · Item total: ${item.lineTotal}` : "   Price: please confirm");
    const url = httpsOnly(item.url);
    if (url) lines.push(`   Product page: ${url}`);
    const image = httpsOnly(item.imageUrl);
    if (image) lines.push(`   Photo (link): ${image}`);
    return lines.join("\n");
  });
  const allPriced = order.items.every((i) => i.unitPrice && i.lineTotal);
  const totals =
    allPriced && order.subtotal
      ? [
          `Subtotal: ${order.subtotal}`,
          `Delivery: ${order.delivery ?? "to be confirmed"}`,
          order.delivery && order.total ? `Total: ${order.total}` : "Total: to be confirmed with the delivery charge",
        ]
      : ["Total: please confirm"];
  return [
    "Hello QALBI Naturals! I would like to order:",
    "",
    blocks.join("\n\n"),
    "",
    ...totals,
    "",
    "Deliver to:",
    `Name: ${order.customer.name}`,
    `Address: ${order.customer.address}`,
    `PIN code: ${order.customer.pinCode}`,
    "",
    "Please confirm availability, the final amount and how to pay. Thank you!",
  ].join("\n");
}

/** Absolute https URL for an image path, or null when it would not be publicly reachable. */
export function publicImageUrl(url: string | null | undefined, siteOrigin: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("https://")) return url;
  return siteOrigin && url.startsWith("/") && !url.startsWith("//") ? `${siteOrigin}${url}` : null;
}

/** wa.me link with a correctly encoded prefilled message. `digits` = international number without "+". */
export function whatsappUrl(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
