import "server-only";
import type { AnnouncementMessage, Category, Ingredient, TrustBadge } from "@/types/content";
import { announcements as defaultAnnouncements } from "@/data/navigation";
import { homeCategories } from "@/data/categories";
import { ingredients as defaultIngredients } from "@/data/ingredients";
import { trustBadges } from "@/data/trust-badges";
import { mediaUrl } from "@/lib/assets";
import { getStoreCategories, isSupabaseCommerce } from "./catalog";
import { getActiveIngredients } from "./cms";
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

/**
 * "Shop by Category". With the database catalogue only its active categories are
 * shown (never the planned built-in list, whose links would not exist); a
 * category without its own image uses QALBI's matching website photo. If the
 * catalogue cannot be read the row is simply left out.
 */
export async function getHomeCategories(): Promise<Category[]> {
  if (!isSupabaseCommerce(false)) return homeCategories;
  let rows: Awaited<ReturnType<typeof getStoreCategories>>;
  try {
    rows = (await getStoreCategories()).filter((c) => c.active);
  } catch {
    return [];
  }
  const builtIn = new Map(homeCategories.map((c) => [c.collectionHandle, c]));
  const categories: Category[] = rows.flatMap((c) => {
    const image = c.imagePath ? { src: mediaUrl(c.imagePath), alt: c.title, width: 600, height: 600, placeholder: false } : builtIn.get(c.handle)?.image;
    return image ? [{ label: c.title, collectionHandle: c.handle, href: `/collections/${c.handle}`, image }] : [];
  });
  const custom = homeCategories.find((c) => c.collectionHandle === null);
  return categories.length && custom ? [...categories, custom] : categories;
}

/**
 * Active ingredients from /admin/ingredients (table public.ingredients). Until
 * one is added — or before the migration has been applied — the built-in
 * confirmed list in src/data/ingredients.ts is shown.
 */
export async function getIngredients(): Promise<Ingredient[]> {
  const rows = await getActiveIngredients();
  if (rows.length === 0) return defaultIngredients;
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    // Uploads are cropped square for the carousel circle; dimensions are an aspect hint only.
    image: r.imagePath ? { src: mediaUrl(r.imagePath), alt: r.imageAlt || r.name, width: 600, height: 600 } : null,
    icon: r.icon,
    productHandles: r.productHandles,
  }));
}
