import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string;
}

export type AdminCheck = { status: "ok"; user: AdminUser } | { status: "not-configured" } | { status: "signed-out" } | { status: "forbidden"; email: string };

/**
 * Data Access Layer for the admin area. Verifies the session token's signature
 * and expiry (getClaims: checked locally against the project's published ES256
 * signing keys, so a forged or expired cookie is rejected without a round trip
 * to Supabase Auth) and then checks the admin_users table with that token, so
 * the database itself confirms the administrator. Memoised per request.
 */
export const checkAdmin = cache(async (): Promise<AdminCheck> => {
  if (!isSupabaseConfigured()) return { status: "not-configured" };
  const supabase = await createSessionClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = authError ? undefined : auth?.claims.sub;
  if (!userId) return { status: "signed-out" };
  const email = typeof auth?.claims.email === "string" ? auth.claims.email : "";
  const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  if (error || !data) return { status: "forbidden", email };
  return { status: "ok", user: { id: userId, email } };
});

/** For admin pages and server actions: returns the admin or redirects to the login page. */
export async function requireAdmin(): Promise<AdminUser> {
  const result = await checkAdmin();
  if (result.status === "ok") return result.user;
  redirect(result.status === "forbidden" ? "/admin/login?error=forbidden" : "/admin/login");
}
