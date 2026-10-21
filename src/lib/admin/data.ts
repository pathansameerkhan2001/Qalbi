import "server-only";
import { createSessionClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { queryCategories, queryProducts, StoreQueryError, type CategoryRow, type ProductRow } from "@/lib/store/catalog";
import { queryBlogPosts, queryHeroSlides, queryIngredients, queryReels, type BlogPostRow, type HeroSlideRow, type IngredientRow, type ReelRow } from "@/lib/store/cms";
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

/** Row count for the dashboard; null when the table does not exist yet (migration not applied). */
/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST builder chain for an optional filter */
async function countRows(db: Awaited<ReturnType<typeof adminClient>>, table: string, filter?: (q: any) => any): Promise<number | null> {
  let query: any = db.from(table).select("id", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error?.code && MISSING_OBJECT.has(error.code)) return null;
  if (error) fail(table, error);
  return count ?? 0;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getDashboard() {
  const db = await adminClient();
  const [products, published, outOfStock, categories, heroLive, reelsLive, postsLive, postsDraft, ingredientsLive, claims] = await Promise.all([
    countRows(db, "products"),
    countRows(db, "products", (q) => q.eq("is_published", true)),
    countRows(db, "products", (q) => q.eq("is_published", true).eq("stock_quantity", 0)),
    countRows(db, "categories", (q) => q.eq("is_active", true)),
    countRows(db, "hero_slides", (q) => q.eq("is_active", true)),
    countRows(db, "instagram_reels", (q) => q.eq("is_published", true)),
    countRows(db, "blog_posts", (q) => q.eq("status", "published")),
    countRows(db, "blog_posts", (q) => q.eq("status", "draft")),
    countRows(db, "ingredients", (q) => q.eq("is_active", true)),
    db.from("store_settings").select("setting_value").eq("setting_key", "brand_claims").limit(1).maybeSingle(),
  ]);
  return {
    counts: { products, published, outOfStock, categories, heroLive, reelsLive, postsLive, postsDraft, ingredientsLive },
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

/** Products per category id ({ total, live = published }), from one two-column query. */
export async function categoryProductCounts(): Promise<Map<string, { total: number; live: number }>> {
  const db = await adminClient();
  const { data, error } = await db.from("products").select("category_id, is_published").not("category_id", "is", null);
  if (error) fail("products", error);
  const counts = new Map<string, { total: number; live: number }>();
  for (const p of data ?? []) {
    const c = counts.get(p.category_id as string) ?? { total: 0, live: 0 };
    c.total++;
    if (p.is_published) c.live++;
    counts.set(p.category_id as string, c);
  }
  return counts;
}

export async function listHeroSlides(): Promise<HeroSlideRow[]> {
  const db = await adminClient();
  return loadCatalog(() => queryHeroSlides(db));
}

export async function listReels(): Promise<ReelRow[]> {
  const db = await adminClient();
  return loadCatalog(() => queryReels(db));
}

export async function listIngredients(): Promise<IngredientRow[]> {
  const db = await adminClient();
  return loadCatalog(() => queryIngredients(db));
}

export async function listBlogPosts(): Promise<BlogPostRow[]> {
  const db = await adminClient();
  return loadCatalog(() => queryBlogPosts(db));
}

export async function getBlogPost(id: string): Promise<BlogPostRow | null> {
  const db = await adminClient();
  return (await loadCatalog(() => queryBlogPosts(db, { id })))[0] ?? null;
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
