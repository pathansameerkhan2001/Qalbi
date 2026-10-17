import "server-only";
import { createSessionClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { queryCategories, queryProducts, StoreQueryError, type CategoryRow, type ProductRow } from "@/lib/store/catalog";
import { requireAdmin } from "./auth";

/**
 * Admin reads. Each function re-verifies the administrator and queries as the
 * signed-in user, so row level security applies as a second check.
 */

async function adminClient() {
  await requireAdmin();
  return createSessionClient();
}

/** Database setup that a missing table/function points to (PostgREST / Postgres codes). */
const MISSING_OBJECT = new Set(["PGRST205", "PGRST202", "42P01", "42883"]);

function fail(scope: string, error: { code?: string; message: string }): never {
  console.error(`[admin] ${scope} failed:`, error.code ?? error.message);
  if (error.code && MISSING_OBJECT.has(error.code)) throw new Error(`Could not load ${scope}: the database setup for this section has not been applied yet.`);
  if (error.code === "42501") throw new Error(`Could not load ${scope}: this account does not have permission.`);
  throw new Error(`Could not load ${scope}. Please try again.`);
}

async function loadCatalog<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof StoreQueryError) fail(error.scope, error.dbError);
    throw error;
  }
}

export interface OrderRow {
  id: string;
  order_number: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  payment_method: "COD" | "PHONE";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  customer_name: string;
  phone: string;
  email: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  notes: string | null;
  subtotal: number;
  delivery_charge: number;
  total: number;
  currency: string;
  created_at: string;
  updated_at: string;
  order_items: { id: string; title: string; product_handle: string; image_path: string | null; unit_price: number; quantity: number; line_total: number }[];
}

export const orderStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
export const paymentStatuses = ["pending", "paid", "failed", "refunded"] as const;

export async function getDashboard() {
  const db = await adminClient();
  const count = async (q: PromiseLike<{ count: number | null; error: { code?: string; message: string } | null }>, scope: string) => {
    const { count: n, error } = await q;
    if (error) fail(scope, error);
    return n ?? 0;
  };
  const [total, pending, completed, products, recentOrders, recentEnquiries, claims] = await Promise.all([
    count(db.from("orders").select("id", { count: "exact", head: true }), "orders"),
    count(db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"), "orders"),
    count(db.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"), "orders"),
    count(db.from("products").select("id", { count: "exact", head: true }), "products"),
    db.from("orders").select("id, order_number, customer_name, total, currency, status, payment_method, payment_status, created_at").order("created_at", { ascending: false }).limit(5),
    db.from("enquiries").select("id, kind, name, subject, created_at, handled").order("created_at", { ascending: false }).limit(5),
    db.from("store_settings").select("setting_value").eq("setting_key", "brand_claims").limit(1).maybeSingle(),
  ]);
  if (recentOrders.error) fail("orders", recentOrders.error);
  if (recentEnquiries.error) fail("enquiries", recentEnquiries.error);
  return {
    counts: { total, pending, completed, products },
    recentOrders: recentOrders.data ?? [],
    recentEnquiries: recentEnquiries.data ?? [],
    claimsVerified: Boolean((claims.data?.setting_value as { verified?: boolean } | undefined)?.verified),
  };
}

export async function listOrders(status: string | null) {
  const db = await adminClient();
  let query = db.from("orders").select("id, order_number, customer_name, phone, total, currency, status, payment_method, payment_status, created_at, order_items (quantity)").order("created_at", { ascending: false }).limit(200);
  if (status && (orderStatuses as readonly string[]).includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) fail("orders", error);
  return data ?? [];
}

export async function getOrder(id: string): Promise<OrderRow | null> {
  const db = await adminClient();
  const { data, error } = await db.from("orders").select("*, order_items (id, title, product_handle, image_path, unit_price, quantity, line_total)").eq("id", id).maybeSingle();
  if (error) fail("order", error);
  return (data as OrderRow | null) ?? null;
}

export async function listAdminProducts(): Promise<ProductRow[]> {
  const db = await adminClient();
  return loadCatalog(() => queryProducts(db));
}

export async function getAdminProduct(id: string): Promise<ProductRow | null> {
  const db = await adminClient();
  return (await loadCatalog(() => queryProducts(db, { id })))[0] ?? null;
}

export async function listAdminCategories(): Promise<CategoryRow[]> {
  const db = await adminClient();
  return loadCatalog(() => queryCategories(db));
}

export async function listEnquiries() {
  const db = await adminClient();
  const { data, error } = await db.from("enquiries").select("id, kind, name, email, phone, subject, details, handled, created_at").order("created_at", { ascending: false }).limit(200);
  if (error) fail("enquiries", error);
  return data ?? [];
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const db = await adminClient();
  const { data, error } = await db.from("store_settings").select("setting_key, setting_value");
  if (error) fail("settings", error);
  return Object.fromEntries((data ?? []).map((r) => [r.setting_key as string, r.setting_value as unknown]));
}

export interface MediaItem {
  path: string;
  name: string;
  size: number | null;
  updatedAt: string | null;
  isFolder: boolean;
}

/** Lists one folder level of the media bucket. */
export async function listMedia(prefix: string): Promise<MediaItem[]> {
  const db = await adminClient();
  const clean = prefix.replace(/^\/+|\/+$/g, "");
  const { data, error } = await db.storage.from(supabaseConfig.mediaBucket).list(clean, { limit: 500, sortBy: { column: "name", order: "asc" } });
  if (error) fail("media", { message: error.message });
  return (data ?? [])
    .filter((o) => o.name !== ".emptyFolderPlaceholder")
    .map((o) => ({
      path: clean ? `${clean}/${o.name}` : o.name,
      name: o.name,
      size: (o.metadata as { size?: number } | null)?.size ?? null,
      updatedAt: o.updated_at ?? null,
      isFolder: o.id === null,
    }));
}
