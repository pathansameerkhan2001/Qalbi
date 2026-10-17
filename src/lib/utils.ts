import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import type { Money } from "@/types/commerce";
import { brandConfig } from "@/data/brand";

/** Registers the custom type scale so `text-h2` isn't mistaken for a colour and dropped. */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["display", "h2", "h3"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(money: Money): string {
  return new Intl.NumberFormat(brandConfig.locale, {
    style: "currency",
    currency: money.currencyCode,
    maximumFractionDigits: Number.isInteger(money.amount) ? 0 : 2,
  }).format(money.amount);
}

/** WhatsApp click-to-chat URL with a correctly encoded prefilled message. */
export function whatsappLink(message: string = brandConfig.defaultWhatsappMessage): string {
  return `${brandConfig.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

/** True for absolute https URLs on an allowed host list (or any host when list is empty). */
export function isSafeExternalUrl(value: string, allowedHosts: string[] = []): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (allowedHosts.length === 0) return true;
    return allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/**
 * Minimal defence-in-depth sanitiser for merchant-authored HTML from Shopify
 * (product descriptions, policies). Strips executable content and inline handlers.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form|input|button|link|meta)[\s\S]*?(<\/\1>|\/?>)/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '$1="#"');
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(brandConfig.locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}
