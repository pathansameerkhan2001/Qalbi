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

/** One product in a WhatsApp order request. */
export interface WhatsAppRequestItem {
  title: string;
  quantity: number;
  /** Formatted unit price, or null when the price is not confirmed (preview catalogue). */
  unitPrice: string | null;
  /** Public https product page, or null when the site has no public address yet. */
  url: string | null;
  /** Public https image URL, or null. Sent as a link: WhatsApp text links cannot attach files. */
  imageUrl: string | null;
  /** Short label text such as "Repair | Nourish | Brightens". */
  details?: string | null;
}

const httpsOnly = (value: string | null | undefined) => (value && /^https:\/\/[^\s]+$/.test(value) ? value : null);

/**
 * Message for a customer-initiated WhatsApp order request (product page or bag).
 * It contains only product information; the customer adds their own name and
 * address in WhatsApp before choosing to send it. Prices are included only when
 * confirmed, and nothing claims a photo is attached — photos are links.
 */
export function orderRequestWhatsAppMessage(items: WhatsAppRequestItem[], estimatedTotal: string | null): string {
  const blocks = items.map((item, i) => {
    const lines = [`${i + 1}. ${item.title} × ${item.quantity}`];
    lines.push(item.unitPrice ? `   Price: ${item.unitPrice} each` : "   Price: please confirm");
    if (item.details?.trim()) lines.push(`   Details: ${item.details.trim().slice(0, 160)}`);
    const url = httpsOnly(item.url);
    if (url) lines.push(`   Product page: ${url}`);
    const image = httpsOnly(item.imageUrl);
    if (image) lines.push(`   Photo (link): ${image}`);
    return lines.join("\n");
  });
  const allPriced = items.every((i) => i.unitPrice);
  return [
    "Hello QALBI Naturals! I would like to order:",
    "",
    blocks.join("\n\n"),
    "",
    ...(estimatedTotal && allPriced ? [`Estimated total: ${estimatedTotal} (delivery charge to be confirmed)`, ""] : []),
    "My name:",
    "Delivery address and PIN code:",
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
