import "server-only";
import { getCommerceSource } from "@/lib/shopify";
import { getContactSettings } from "@/lib/store/settings";
import { isProductionSiteUrl, siteUrl } from "@/lib/site";
import type { WhatsAppOrderConfig } from "@/lib/checkout/whatsapp";

export type { WhatsAppOrderConfig };

export async function getWhatsAppOrderConfig(): Promise<WhatsAppOrderConfig> {
  const contact = await getContactSettings();
  const source = getCommerceSource();
  return {
    digits: contact.whatsappDigits,
    siteOrigin: isProductionSiteUrl ? siteUrl : null,
    priceConfirmed: source === "supabase" || source === "shopify",
  };
}
