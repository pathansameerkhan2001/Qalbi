import "server-only";
import { cookies } from "next/headers";
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
 * because it never reads the request. Used for the public catalogue and for
 * the checkout functions that are granted to anon.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  return createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
