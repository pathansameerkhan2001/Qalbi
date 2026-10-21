import type { NavItem, NavLink } from "@/types/content";
import { mainNavigation, productCategoryLinks } from "@/data/navigation";
import { getCollections, getCommerceSource } from "@/lib/shopify";
import { BESTSELLERS_HANDLE } from "@/lib/store/catalog";

const customised: NavLink = { label: "Customised Skincare", href: "/customised-skincare" };

/**
 * Shop category links. With a real catalogue (Supabase or Shopify) they are the
 * live collections, so every link leads to an existing page; the preview
 * catalogue keeps the planned list from src/data/navigation.ts.
 */
export async function getCategoryLinks(): Promise<NavLink[]> {
  const source = getCommerceSource();
  if (source !== "supabase" && source !== "shopify") return productCategoryLinks;
  try {
    const collections = (await getCollections()).filter((c) => c.handle !== BESTSELLERS_HANDLE);
    return [...collections.map((c) => ({ label: c.title, href: `/collections/${c.handle}` })), customised];
  } catch {
    // The menu must render even if the catalogue is down; product pages show the error.
    return [customised];
  }
}

export async function getMainNavigation(): Promise<NavItem[]> {
  const children = await getCategoryLinks();
  return mainNavigation.map((item) => (item.children ? { ...item, children } : item));
}
