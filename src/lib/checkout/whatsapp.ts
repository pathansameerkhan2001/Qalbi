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

/** wa.me link with a correctly encoded prefilled message. `digits` = international number without "+". */
export function whatsappUrl(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
