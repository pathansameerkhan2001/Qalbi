/**
 * Delivery charge as configured in Store Settings → Checkout. Pure, so the bag
 * (browser) and the WhatsApp order action (server) compute the same amount.
 * `null` terms mean the setting could not be read: callers then say the charge
 * is "to be confirmed" instead of assuming one.
 */
export interface DeliveryTerms {
  charge: number;
  /** Order subtotal from which delivery is free, or null for no free-delivery threshold. */
  freeOver: number | null;
}

export function deliveryChargeFor(subtotal: number, terms: DeliveryTerms): number {
  if (terms.freeOver !== null && subtotal >= terms.freeOver) return 0;
  return terms.charge;
}
