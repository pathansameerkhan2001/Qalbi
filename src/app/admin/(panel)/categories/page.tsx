import type { Metadata } from "next";
import { listAdminCategories, listAdminProducts } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteCategoryAction, saveCategoryAction, setCategoryActiveAction } from "@/lib/admin/actions";
import { getCommerceSource } from "@/lib/shopify";
import type { CategoryRow } from "@/lib/store/catalog";
import { homeCategories } from "@/data/categories";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { RowForm } from "@/components/admin/row-form";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Categories" };

const blank: CategoryRow = { id: "", handle: "", title: "", description: "", imagePath: null, sort: 0, active: true };

/** QALBI's existing website photo for a category handle (storage path), if there is one. */
const builtInImage = new Map(
  homeCategories.flatMap((c) => {
    const path = /(categories\/[a-z0-9-]+\.webp)$/.exec(c.image.src)?.[1];
    return c.collectionHandle && path ? [[c.collectionHandle, path] as const] : [];
  }),
);

function CategoryFields({ c }: { c: CategoryRow }) {
  const id = (f: string) => `cat-${c.id || "new"}-${f}`;
  const suggested = c.handle ? builtInImage.get(c.handle) : undefined;
  return (
    <>
      <input type="hidden" name="id" value={c.id} />
      <div className="grid gap-4 sm:grid-cols-[9rem_1fr] sm:col-span-full">
        <ImageUploadField
          name="image_url"
          label="Image"
          folder="categories"
          defaultPath={c.imagePath ?? ""}
          aspectClass="aspect-square max-w-[9rem] rounded-full"
          minWidth={400}
          hint={suggested && !c.imagePath ? `QALBI's website photo for this category: ${suggested}` : "Square, at least 600 × 600 px."}
        />
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={id("name")} className="label">Name</label>
            <input id={id("name")} name="name" defaultValue={c.title} required maxLength={80} className="field" />
          </div>
          <div>
            <label htmlFor={id("slug")} className="label">URL handle</label>
            <input id={id("slug")} name="slug" defaultValue={c.handle} required className="field" placeholder="e.g. face-wash-cleansers" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={id("description")} className="label">
              Description <span className="font-normal text-muted">(optional, shown on the category page)</span>
            </label>
            <input id={id("description")} name="description" defaultValue={c.description} maxLength={400} className="field" />
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm sm:col-span-2">
            <label className="flex items-center gap-2">
              Order <input name="sort_order" type="number" defaultValue={c.sort} className="field w-24" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_active" defaultChecked={c.active} className="accent-[var(--color-forest)]" /> Visible on the website
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

export default async function AdminCategoriesPage() {
  await requireAdmin();
  let categories: CategoryRow[];
  let counts: Map<string, { total: number; live: number }>;
  try {
    const [rows, products] = await Promise.all([listAdminCategories(), listAdminProducts()]);
    categories = rows;
    counts = new Map();
    for (const p of products) {
      if (!p.categoryId) continue;
      const c = counts.get(p.categoryId) ?? { total: 0, live: 0 };
      c.total++;
      if (p.published) c.live++;
      counts.set(p.categoryId, c);
    }
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

  return (
    <>
      <AdminHeading title="Categories" description="Collections shown in the shop menu, the “Shop by Category” row and on /products." />
      <Card className="mb-4 p-4 text-sm text-muted">
        {active} of {categories.length} categor{categories.length === 1 ? "y is" : "ies are"} visible.{" "}
        {live
          ? "Visible categories appear on the website straight away; a category page lists only its published products."
          : "They appear on the website once COMMERCE_SOURCE=supabase is set (see the Dashboard checklist)."}{" "}
        A category with products cannot be deleted — move its products to another category first, or untick “Visible” to hide it.
        {categories.length > 0 && active === 0 && (
          <span className="mt-2 block text-ink">
            All categories are hidden. Categories added by the product import script start hidden on purpose — use “Show on website” on each one you want customers to see.
          </span>
        )}
      </Card>
      <div className="space-y-4">
        {categories.map((c) => {
          const n = counts.get(c.id) ?? { total: 0, live: 0 };
          return (
            <Card key={c.id} className="p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                <span className={cn("rounded-full px-2 py-0.5 font-medium", c.active ? "bg-botanical/15 text-forest" : "bg-line text-muted")}>{c.active ? "Visible" : "Hidden"}</span>
                <span className="text-muted">
                  /collections/{c.handle} · {n.total} product{n.total === 1 ? "" : "s"} ({n.live} published)
                </span>
                <RowForm
                  action={setCategoryActiveAction}
                  submitLabel={c.active ? "Hide from website" : "Show on website"}
                  confirm={c.active ? `Hide “${c.title}” from the website menu and category pages?` : undefined}
                  className="ml-auto flex justify-end"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                </RowForm>
              </div>
              <RowForm action={saveCategoryAction} submitLabel="Save category" className="grid gap-4">
                <CategoryFields c={c} />
              </RowForm>
              {n.total === 0 ? (
                <RowForm action={deleteCategoryAction} submitLabel="Delete category" variant="danger" confirm={`Delete the “${c.title}” category?`} className="mt-3 flex justify-end">
                  <input type="hidden" name="id" value={c.id} />
                </RowForm>
              ) : (
                <p className="mt-3 text-right text-xs text-muted">Can&apos;t delete while {n.total} product{n.total === 1 ? " is" : "s are"} assigned.</p>
              )}
            </Card>
          );
        })}
        {categories.length === 0 && <Card className="p-6 text-sm text-muted">No categories yet. Add the first one below.</Card>}
        <Card className="border-dashed p-5">
          <h2 className="mb-4 font-serif text-xl">Add a category</h2>
          <RowForm action={saveCategoryAction} submitLabel="Add category" className="grid gap-4">
            <CategoryFields c={blank} />
          </RowForm>
        </Card>
      </div>
    </>
  );
}
