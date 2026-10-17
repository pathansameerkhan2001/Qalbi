/**
 * Privacy-conscious analytics abstraction.
 *
 * Events are sent only when:
 *  1. NEXT_PUBLIC_GA_MEASUREMENT_ID is configured, and
 *  2. the visitor has granted analytics consent.
 * Event payloads must never include personal data (names, emails, phone
 * numbers, enquiry contents). Only product/content identifiers are allowed.
 */

export type AnalyticsEvent =
  | { name: "product_viewed"; params: { product_handle: string } }
  | { name: "product_clicked"; params: { product_handle: string; list: string } }
  | { name: "add_to_cart"; params: { product_handle: string; quantity: number } }
  | { name: "cart_updated"; params: { quantity: number } }
  | { name: "checkout_initiated"; params: { item_count: number } }
  | { name: "instagram_profile_clicked"; params: { location: string } }
  | { name: "instagram_reel_clicked"; params: { reel_id: string } }
  | { name: "custom_enquiry_submitted"; params: { category: string } }
  | { name: "contact_submitted"; params: Record<string, never> }
  | { name: "newsletter_signup"; params: { location: string } }
  | { name: "whatsapp_clicked"; params: { location: string } };

export const CONSENT_STORAGE_KEY = "qalbi-analytics-consent";
export const analyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

type Gtag = (...args: unknown[]) => void;

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) === "granted";
  } catch {
    return false;
  }
}

export function track(event: AnalyticsEvent): void {
  if (!analyticsId || typeof window === "undefined" || !hasAnalyticsConsent()) return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  gtag?.("event", event.name, event.params);
}
