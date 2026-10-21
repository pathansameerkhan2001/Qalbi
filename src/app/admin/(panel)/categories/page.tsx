import type { Metadata } from "next";
import { listAdminCategories } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/admin/actions";
import { mediaUrl } from "@/lib/assets";
import type { CategoryRow } from "@/lib/store/catalog";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { RowForm } from "@/components/admin/row-form";

export const metadata: Metadata = { title: "Categories" };

const blank: CategoryRow = { id: "", handle: "", title: "", description: "", imagePath: null, sort: 0, active: true };

function CategoryFields({ c }: { c: CategoryRow }) {
  const id = (f: string) => `cat-${c.id || "new"}-${f}`;
  return (
    <>
      <input type="hidden" name="id" value={c.id} />
      <div className="flex items-start gap-4 sm:col-span-full">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-full border border-line bg-sand">
          {c.imagePath && (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of a media path
            <img src={mediaUrl(c.imagePath)} alt="" className="size-full object-cover" />
          )}
        </span>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={id("name")} className="label">Name</label>
            <input id={id("name")} name="name" defaultValue={c.title} required className="field" />
          </div>
          <div>
            <label htmlFor={id("slug")} className="label">URL handle</label>
            <input id={id("slug")} name="slug" defaultValue={c.handle} required className="field" placeholder="e.g. body-care" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={id("description")} className="label">Description <span className="font-normal text-muted">(optional)</span></label>
            <input id={id("description")} name="description" defaultValue={c.description} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={id("image")} className="label">Image path</label>
            <input id={id("image")} name="image_url" defaultValue={c.imagePath ?? ""} placeholder="categories/…webp or uploads/…" className="field" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-5 text-sm sm:col-span-full">
        <label className="flex items-center gap-2">
          Sort <input name="sort_order" type="number" defaultValue={c.sort} className="field w-24" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked={c.active} className="accent-[var(--color-forest)]" /> Visible on the website
        </label>
      </div>
    </>
  );
}

export default async function AdminCategoriesPage() {
  await requireAdmin();
  let categories: CategoryRow[];
  try {
    categories = await listAdminCategories();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Categories" />
        <SetupNotice error={error} migration="store" />
      </>
    );
  }
  return (
    <>
      <AdminHeading title="Categories" description="Collections shown in navigation and the homepage “Shop by Category” row." />
      <div className="space-y-4">
        {categories.map((c) => (
          <Card key={c.id} className="p-5">
            <RowForm action={saveCategoryAction} className="grid gap-4">
              <CategoryFields c={c} />
            </RowForm>
            <RowForm action={deleteCategoryAction} submitLabel="Delete category" variant="danger" confirm={`Delete the “${c.title}” category?`} className="mt-3 flex justify-end">
              <input type="hidden" name="id" value={c.id} />
            </RowForm>
          </Card>
        ))}
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
