import "server-only";
import type { AnnouncementMessage, Category, Ingredient, TrustBadge } from "@/types/content";
import { announcements as defaultAnnouncements } from "@/data/navigation";
import { homeCategories } from "@/data/categories";
import { ingredients as defaultIngredients } from "@/data/ingredients";
import { trustBadges } from "@/data/trust-badges";
import { mediaUrl } from "@/lib/assets";
import { getStoreCategories, isSupabaseCommerce } from "./catalog";
import { getSetting } from "./settings";

/**
 * Website content that administrators can edit in /admin. Each getter falls back
 * to the built-in content in src/data when nothing is configured, so the site
 * works before the database migration has been run.
 */

export async function getAnnouncements(): Promise<AnnouncementMessage[]> {
  const configured = await getSetting("announcements");
  return configured && configured.length > 0 ? configured : defaultAnnouncements;
}

export async function getTrustBadges(): Promise<TrustBadge[]> {
  const overrides = (await getSetting("trust_badges")) ?? {};
  return trustBadges.filter((b) => !b.isClaim || (overrides[b.id] ?? b.verified));
}

export async function getHomeCategories(): Promise<Category[]> {
  if (!isSupabaseCommerce(false)) return homeCategories;
  const rows = (await getStoreCategories()).filter((c) => c.active && c.imagePath);
  if (rows.length === 0) return homeCategories;
  const custom = homeCategories.find((c) => c.collectionHandle === null);
  return [
    ...rows.map((c) => ({
      label: c.title,
      collectionHandle: c.handle,
      href: `/collections/${c.handle}`,
      image: { src: mediaUrl(c.imagePath!), alt: c.title, width: 600, height: 600, placeholder: false },
    })),
    ...(custom ? [custom] : []),
  ];
}

/**
 * Ingredients come from the built-in confirmed list (src/data/ingredients.ts).
 * The production database has no ingredients table.
 */
export async function getIngredients(): Promise<Ingredient[]> {
  return defaultIngredients;
}
