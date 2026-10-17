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
 * Data Access Layer for the admin area. Verifies the session with Supabase
 * Auth (getUser contacts the auth server, so a forged cookie is rejected) and
 * then checks the admin_users table. Memoised per request.
 */
export const checkAdmin = cache(async (): Promise<AdminCheck> => {
  if (!isSupabaseConfigured()) return { status: "not-configured" };
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "signed-out" };
  const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !data) return { status: "forbidden", email: user.email ?? "" };
  return { status: "ok", user: { id: user.id, email: user.email ?? "" } };
});

/** For admin pages and server actions: returns the admin or redirects to the login page. */
export async function requireAdmin(): Promise<AdminUser> {
  const result = await checkAdmin();
  if (result.status === "ok") return result.user;
  redirect(result.status === "forbidden" ? "/admin/login?error=forbidden" : "/admin/login");
}
