/**
 * Supabase project configuration. Only the URL and the publishable key are
 * used by the website — both are safe to expose. Row level security in
 * supabase/production/01_store_additions.sql enforces what each visitor or administrator may do.
 */
export const supabaseConfig = {
  url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, ""),
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  mediaBucket: process.env.NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET || "qalbi-naturals-media",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseConfig.url && supabaseConfig.publishableKey);
}

/** Public URL of an object in the media bucket. */
export function storagePublicUrl(path: string): string {
  return `${supabaseConfig.url}/storage/v1/object/public/${supabaseConfig.mediaBucket}/${path.replace(/^\/+/, "")}`;
}
