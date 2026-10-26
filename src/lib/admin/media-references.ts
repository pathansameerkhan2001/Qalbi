import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Where a media path is still used (so deleting the file would break the
 * website). Missing tables or columns (a migration not applied yet) are
 * ignored. Shared by the Media library delete and the hero slide clean-up.
 */
export async function mediaReferences(db: SupabaseClient, path: string, exceptHeroSlide?: string): Promise<string[]> {
  const checks: [string, string, string[]][] = [
    ["product_images", "a product photo", ["image_url"]],
    ["categories", "a category", ["image_url"]],
    ["hero_slides", "a hero slide", ["desktop_image_path", "mobile_image_path"]],
    ["hero_slides", "a hero video slide", ["desktop_video_path", "mobile_video_path"]],
    ["instagram_reels", "an Instagram Reel", ["thumbnail_path"]],
    ["blog_posts", "a blog post", ["cover_image_path"]],
    ["ingredients", "an ingredient", ["image_path"]],
  ];
  const found: string[] = [];
  await Promise.all(
    checks.map(async ([table, label, columns]) => {
      let query = db.from(table).select("id", { count: "exact", head: true }).or(columns.map((c) => `${c}.eq.${path}`).join(","));
      if (table === "hero_slides" && exceptHeroSlide) query = query.neq("id", exceptHeroSlide);
      const { count, error } = await query;
      if (!error && count) found.push(`${label}${count > 1 ? ` (${count})` : ""}`);
    }),
  );
  const { data } = await db.from("store_settings").select("setting_value").eq("setting_key", "checkout").maybeSingle();
  if ((data?.setting_value as { qrImagePath?: string } | undefined)?.qrImagePath === path) found.push("the payment QR setting");
  return found;
}
