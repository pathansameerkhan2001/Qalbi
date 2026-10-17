import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { brandConfig } from "@/data/brand";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { STORE_TAG } from "./catalog";

/**
 * Administrator-editable settings (public.store_settings: setting_key → setting_value). Every reader falls
 * back to safe defaults when Supabase is not configured or a key is missing,
 * so the website never depends on a row existing.
 */

export const checkoutSettingsSchema = z.object({
  codEnabled: z.boolean().default(true),
  phoneEnabled: z.boolean().default(true),
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

export const announcementsSchema = z.array(z.object({ id: z.string(), text: z.string().min(1).max(80), href: z.string().max(200).optional() })).max(5);

export const heroSettingsSchema = z.object({
  /** Optional replacement for the first hero slide (media paths). */
  desktopPath: z.string().max(300).nullable().default(null),
  mobilePath: z.string().max(300).nullable().default(null),
  alt: z.string().max(200).default("QALBI Naturals skincare"),
});

export const reelsSchema = z
  .array(z.object({ id: z.string(), title: z.string().min(1).max(60), reelUrl: z.url(), thumbnailPath: z.string().min(1).max(300) }))
  .max(12);

export const trustBadgeSettingsSchema = z.record(z.string(), z.boolean());

export const featuredSettingsSchema = z.object({ collectionHandle: z.string().max(80).default("bestsellers") });

export const brandClaimsSchema = z.object({ verified: z.boolean().default(false), note: z.string().max(500).default("") });

export const settingSchemas = {
  checkout: checkoutSettingsSchema,
  contact: contactSettingsSchema,
  announcements: announcementsSchema,
  hero: heroSettingsSchema,
  instagram_reels: reelsSchema,
  trust_badges: trustBadgeSettingsSchema,
  featured: featuredSettingsSchema,
  brand_claims: brandClaimsSchema,
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

export async function getContactSettings(): Promise<SettingValue<"contact">> {
  return (await getSetting("contact")) ?? contactSettingsSchema.parse({});
}

/** QR payment is offered only when switched on AND a QR image is configured (the database enforces the same rule). */
export function qrPaymentReady(settings: SettingValue<"checkout">): boolean {
  return settings.phoneEnabled && Boolean(settings.qrImagePath);
}

/** Delivery charge for a subtotal — display only; the database computes the charged amount. */
export function deliveryChargeFor(subtotal: number, settings: SettingValue<"checkout">): number {
  if (settings.freeDeliveryOver !== null && subtotal >= settings.freeDeliveryOver) return 0;
  return settings.deliveryCharge;
}
