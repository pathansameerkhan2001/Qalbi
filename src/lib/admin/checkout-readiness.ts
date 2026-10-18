import "server-only";
import { createSessionClient, isServerWriteConfigured } from "@/lib/supabase/server";
import { isSupabaseCommerce } from "@/lib/store/catalog";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { mediaUrl } from "@/lib/assets";

/**
 * Preconditions for taking orders on the website. Shown on the Store Settings
 * page and enforced when an administrator switches a payment method on, so
 * checkout can never be opened before it can actually work. Reports booleans
 * and counts only — never secret values.
 */

export interface CheckoutReadiness {
  /** COMMERCE_SOURCE=supabase and Shopify not configured: orders use the Supabase catalogue. */
  supabaseCatalogue: boolean;
  /** SUPABASE_SERVICE_ROLE_KEY is set on the server (required by place_order_checked). */
  serverKey: boolean;
  /** Published products with a price above ₹0 (null when the count could not be read). */
  pricedProducts: number | null;
}

export async function getCheckoutReadiness(): Promise<CheckoutReadiness> {
  const db = await createSessionClient();
  const { count, error } = await db.from("products").select("id", { count: "exact", head: true }).eq("is_published", true).gt("price", 0);
  if (error) console.error("[admin] readiness product count:", error.code ?? error.message);
  return {
    supabaseCatalogue: isSupabaseCommerce(isShopifyConfigured()),
    serverKey: isServerWriteConfigured(),
    pricedProducts: error ? null : (count ?? 0),
  };
}

/** Reasons Cash on Delivery cannot be switched on yet (empty = ready). */
export function codBlockers(r: CheckoutReadiness): string[] {
  const reasons: string[] = [];
  if (!r.supabaseCatalogue) reasons.push("the website is not using the Supabase catalogue (set COMMERCE_SOURCE=supabase in Vercel and redeploy)");
  if (!r.serverKey) reasons.push("the server key for placing orders is not configured (SUPABASE_SERVICE_ROLE_KEY in Vercel)");
  if (r.pricedProducts === null) reasons.push("the product catalogue could not be checked");
  else if (r.pricedProducts === 0) reasons.push("there is no published product with a price yet");
  return reasons;
}

/**
 * Confirms the payment QR is an uploaded image that is publicly reachable:
 * the path must be in uploads/ (Supabase Storage) and a HEAD request to its
 * public URL must return an image.
 */
export async function verifyQrImage(path: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!path) return { ok: false, message: "Upload the real payment QR image and enter its path first." };
  if (!/^uploads\/[a-z0-9/_.-]+$/.test(path) || path.includes("..")) return { ok: false, message: "The QR image must be uploaded through the Media library (a path starting with uploads/)." };
  try {
    const res = await fetch(mediaUrl(path), { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, message: `The QR image could not be found at that path (HTTP ${res.status}).` };
    if (!res.headers.get("content-type")?.startsWith("image/")) return { ok: false, message: "The file at the QR path is not an image." };
    return { ok: true };
  } catch {
    return { ok: false, message: "The QR image could not be checked right now. Please try again." };
  }
}
