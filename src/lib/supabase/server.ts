import "server-only";
import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseConfig } from "./config";

/**
 * Request-scoped client that acts as the signed-in user (session cookie).
 * Use for anything that depends on who is asking — admin reads and writes are
 * then limited by row level security as well as by our server-side checks.
 */
export async function createSessionClient() {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const cookieStore = await cookies();
  // Session checks run only for the real request: the auth client reads the
  // current time to validate the token, which must never happen while prerendering.
  await connection();
  return createServerClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session cookie instead.
        }
      },
    },
  });
}

/**
 * Cookie-less client with visitor (anon) rights. Safe inside `use cache`
 * because it never reads the request. Used for the public catalogue and the
 * order confirmation lookup (which needs the secret order token).
 */
export function createPublicClient() {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  return createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Server-only secret key. Never prefix with NEXT_PUBLIC_. */
const serverSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** True when the website can create orders and store enquiries (see supabase/production/04). */
export function isServerWriteConfigured(): boolean {
  return isSupabaseConfigured() && serverSecretKey.length > 0;
}

/**
 * Server-only client for exactly two calls: place_order_checked() and
 * record_enquiry_checked(). Those are the only ways to create orders and
 * enquiries, are executable only with this key, and apply database rate limits.
 * Never use it for reads or for anything an admin session should do.
 */
export function createServerWriteClient() {
  if (!isServerWriteConfigured()) throw new Error("Server write access is not configured");
  return createClient(supabaseConfig.url, serverSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Rate-limit identity for the visitor: an HMAC of the client IP (never stored
 * in clear). On Vercel, x-real-ip / x-forwarded-for are set by the platform.
 */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHmac("sha256", serverSecretKey || "qalbi").update(ip).digest("hex");
}
