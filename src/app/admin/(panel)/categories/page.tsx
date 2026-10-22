import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { categoryProductCounts, listAdminCategories } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { getCommerceSource } from "@/lib/shopify";
import type { CategoryRow } from "@/lib/store/catalog";
import { homeCategories } from "@/data/categories";
import { missingSuggestions, suggestedCategories } from "@/data/category-suggestions";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Categories" };

/** QALBI's existing website photo for a category handle (storage path), if there is one. */
const builtInImage: Record<string, string> = Object.fromEntries([
  ...homeCategories.flatMap((c) => {
    const path = c.image && /(categories\/[a-z0-9-]+\.webp)$/.exec(c.image.src)?.[1];
    return c.collectionHandle && path ? [[c.collectionHandle, path]] : [];
  }),
  ...suggestedCategories.flatMap((s) => (s.imagePath ? [[s.slug, s.imagePath]] : [])),
]);

export default async function AdminCategoriesPage() {
  await requireAdmin();
  let categories: CategoryRow[];
  let counts: Map<string, { total: number; live: number }>;
  try {
    [categories, counts] = await Promise.all([listAdminCategories(), categoryProductCounts()]);
  } catch (error) {
    return (
      <>
        <AdminHeading title="Categories" />
        <SetupNotice error={error} migration="store" />
      </>
    );
  }
  const active = categories.filter((c) => c.active).length;
  const live = getCommerceSource() === "supabase";
  const suggestions = missingSuggestions(categories);

  return (
    <>
      <AdminHeading title="Categories" description="Collections shown in the shop menu, the “Shop by Category” row and on /products.">
        <a href="#add-category" className="btn btn-primary btn-sm">
          <Plus className="size-4" aria-hidden /> Add category
        </a>
      </AdminHeading>
      <Card className="mb-4 p-4 text-sm text-muted">
        {active} of {categories.length} categor{categories.length === 1 ? "y is" : "ies are"} visible.{" "}
        {live
          ? "Visible categories appear on the website straight away; a category page lists only its published products."
          : "They appear on the website once COMMERCE_SOURCE=supabase is set (see the Dashboard checklist)."}{" "}
        New categories start hidden — show one when it has published products.
        {categories.length > 0 && active === 0 && (
          <span className="mt-2 block text-ink">
            All categories are hidden. Categories added by the product import script start hidden on purpose — use “Show on website” on each one you want customers to see.
          </span>
        )}
      </Card>
      <CategoryManager
        categories={categories.map((c) => ({ ...c, products: counts.get(c.id) ?? { total: 0, live: 0 } }))}
        builtInImage={builtInImage}
        suggestions={suggestions}
      />
    </>
  );
}
