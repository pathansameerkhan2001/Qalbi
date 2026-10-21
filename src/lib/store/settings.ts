import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { brandConfig } from "@/data/brand";
import { isSafeSiteLink } from "@/lib/content/rules";
import { homepageSectionIds } from "@/lib/content/homepage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { deliveryChargeFor as chargeForTerms, type DeliveryTerms } from "@/lib/checkout/delivery";
import { STORE_TAG } from "./catalog";

/**
 * Administrator-editable settings (public.store_settings: setting_key → setting_value). Every reader falls
 * back to safe defaults when Supabase is not configured or a key is missing,
 * so the website never depends on a row existing.
 */

export const checkoutSettingsSchema = z.object({
  // Payment methods stay off unless an administrator switched them on (also when the setting can't be read).
  codEnabled: z.boolean().default(false),
  phoneEnabled: z.boolean().default(false),
  deliveryCharge: z.number().min(0).max(10000).default(0),
  freeDeliveryOver: z.number().min(0).max(1000000).nullable().default(null),
  /** Media path of the business's real UPI QR code. QR payment is offered only when this is set. */
  qrImagePath: z.string().trim().min(1).max(300).nullable().default(null),
});

export const contactSettingsSchema = z.object({
  whatsappDigits: z.string().regex(/^[1-9][0-9]{9,14}$/).default(brandConfig.whatsappDigits),
  whatsappDisplay: z.string().min(5).max(30).default(brandConfig.whatsappNumber),
  email: z.email().default(brandConfig.email),
});

const siteLink = z.string().max(300).refine(isSafeSiteLink, "links must be a website path such as /products or a full https:// link");

export const announcementsSchema = z.array(z.object({ id: z.string(), text: z.string().min(1).max(80), href: siteLink.optional() })).max(5);

/** Slim offer bar shown directly after the hero. Off until an administrator enables it with real messages. */
export const offerBarSchema = z.object({
  enabled: z.boolean().default(false),
  /** Gentle scrolling for several messages; never runs for reduced-motion visitors. */
  animate: z.boolean().default(false),
  messages: z.array(z.object({ id: z.string().max(40), text: z.string().trim().min(1, "each message needs text").max(120, "keep each message under 120 characters"), href: siteLink.optional() })).max(6, "use at most 6 messages").default([]),
});

export const homepageSectionsSchema = z.object({
  sections: z.array(z.object({ id: z.enum(homepageSectionIds), visible: z.boolean() })).max(homepageSectionIds.length).default([]),
});

export const trustBadgeSettingsSchema = z.record(z.string(), z.boolean());

export const featuredSettingsSchema = z.object({ collectionHandle: z.string().max(80).default("bestsellers") });

export const brandClaimsSchema = z.object({ verified: z.boolean().default(false), note: z.string().max(500).default("") });

export const settingSchemas = {
  checkout: checkoutSettingsSchema,
  contact: contactSettingsSchema,
  announcements: announcementsSchema,
  trust_badges: trustBadgeSettingsSchema,
  featured: featuredSettingsSchema,
  brand_claims: brandClaimsSchema,
  offer_bar: offerBarSchema,
  homepage_sections: homepageSectionsSchema,
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.output<(typeof settingSchemas)[K]>;

async function readAllSettings(): Promise<Record<string, unknown>> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  if (!isSupabaseConfigured()) return {};
  const { data, error } = await createPublicClient().from("store_settings").select("setting_key, setting_value");
  if (error) {
    // Missing table (migration not run yet) is expected during setup — fall back to defaults.
    if (error.code !== "PGRST205" && error.code !== "42P01") console.error("[settings] read failed:", error.code);
    return {};
  }
  return Object.fromEntries((data ?? []).map((row) => [row.setting_key as string, row.setting_value as unknown]));
}

/** Validated setting, or null when it is not set / invalid. */
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K> | null> {
  const raw = (await readAllSettings())[key];
  if (raw === undefined) return null;
  const parsed = settingSchemas[key].safeParse(raw);
  return parsed.success ? (parsed.data as SettingValue<K>) : null;
}

export async function getCheckoutSettings(): Promise<SettingValue<"checkout">> {
  return (await getSetting("checkout")) ?? checkoutSettingsSchema.parse({});
}

/** Delivery terms saved in Store Settings → Checkout, or null when that setting can't be read (never guessed). */
export async function getDeliveryTerms(): Promise<DeliveryTerms | null> {
  const settings = await getSetting("checkout");
  return settings ? { charge: settings.deliveryCharge, freeOver: settings.freeDeliveryOver } : null;
}

export async function getContactSettings(): Promise<SettingValue<"contact">> {
  return (await getSetting("contact")) ?? contactSettingsSchema.parse({});
}

/** QR payment is offered only when switched on AND a QR image is configured (the database enforces the same rule). */
export function qrPaymentReady(settings: SettingValue<"checkout">): boolean {
  return settings.phoneEnabled && Boolean(settings.qrImagePath);
}

/** Delivery charge for a subtotal — display only; the database computes the charged amount. */
export function deliveryChargeFor(subtotal: number, settings: SettingValue<"checkout">): number {
  return chargeForTerms(subtotal, { charge: settings.deliveryCharge, freeOver: settings.freeDeliveryOver });
}
