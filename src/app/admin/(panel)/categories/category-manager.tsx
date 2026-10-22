"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { addAllSuggestedCategoriesAction, addSuggestedCategoryAction, deleteCategoryAction, moveCategoryAction, saveCategoryAction, setCategoryActiveAction } from "@/lib/admin/actions";
import type { CategoryRow } from "@/lib/store/catalog";
import { mediaUrl } from "@/lib/assets";
import { Card } from "@/components/admin/ui";
import { RowForm } from "@/components/admin/row-form";
import { MoveButtons } from "@/components/admin/move-buttons";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { cn } from "@/lib/utils";

export type ManagedCategory = CategoryRow & { products: { total: number; live: number } };
type Suggestion = { name: string; slug: string; imagePath: string | null; basis: string };
type Filter = "all" | "visible" | "hidden" | "empty";

/** Homepage cards are up to ~180 px wide, so narrower files look soft on high-density screens. */
const MIN_IMAGE_WIDTH = 400;

const blank: CategoryRow = { id: "", handle: "", title: "", description: "", imagePath: null, sort: 0, active: false };

export function CategoryManager({ categories, builtInImage, suggestions }: { categories: ManagedCategory[]; builtInImage: Record<string, string>; suggestions: Suggestion[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      new Set(
        categories
          .filter((c) => !q || c.title.toLowerCase().includes(q) || c.handle.includes(q))
          .filter((c) => (filter === "visible" ? c.active : filter === "hidden" ? !c.active : filter === "empty" ? c.products.live === 0 : true))
          .map((c) => c.id),
      ),
    [categories, q, filter],
  );
  const filtering = Boolean(q) || filter !== "all";

  return (
    <div className="space-y-4">
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[14rem] flex-1">
            <span className="sr-only">Search categories</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or handle" className="field pl-9" />
          </label>
          <div role="group" aria-label="Filter categories" className="flex flex-wrap gap-1 text-sm">
            {(["all", "visible", "hidden", "empty"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn("rounded-full border px-3 py-1 capitalize transition", filter === f ? "border-forest bg-forest text-ivory" : "border-line bg-ivory text-ink hover:border-forest")}
              >
                {f === "empty" ? "No live products" : f}
              </button>
            ))}
          </div>
          <p className="w-full text-xs text-muted" aria-live="polite">
            {filtering ? `${matches.size} of ${categories.length} shown. Clear the search and filter to reorder.` : `${categories.length} categor${categories.length === 1 ? "y" : "ies"}, in website order.`}
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {categories.map((c, i) => (
          // Filtered-out rows are hidden, not unmounted, so unsaved edits survive a search.
          <li key={c.id} hidden={!matches.has(c.id)}>
            <CategoryCard c={c} others={categories.filter((o) => o.id !== c.id)} first={i === 0} last={i === categories.length - 1} canReorder={!filtering} suggested={builtInImage[c.handle]} />
          </li>
        ))}
      </ul>
      {categories.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted">
          <p className="font-serif text-xl text-ink">No categories yet</p>
          <p className="mt-1">Create your first one below, or add some from the suggestions. Products can also get a new category straight from the product editor.</p>
        </Card>
      )}

      <Card id="add-category" className="scroll-mt-6 border-dashed p-5 target:border-forest target:ring-2 target:ring-forest/20">
        <h2 className="mb-1 font-serif text-xl">Add a category</h2>
        <p className="mb-4 text-xs text-muted">New categories are saved hidden unless you tick “Visible on the website”.</p>
        <RowForm action={saveCategoryAction} submitLabel="Add category" className="grid gap-4" resetOnSuccess>
          <CategoryFields c={{ ...blank, sort: (categories.at(-1)?.sort ?? 0) + 10 }} />
        </RowForm>
      </Card>

      {suggestions.length > 0 && (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-serif text-xl">Suggested categories</h2>
            {suggestions.length > 1 && (
              <RowForm
                action={addAllSuggestedCategoriesAction}
                submitLabel={`Add all ${suggestions.length} as hidden`}
                pendingLabel="Adding…"
                variant="quiet"
                confirm={`Add ${suggestions.length} categories (${suggestions.map((s) => s.name).join(", ")})? They are saved hidden, stay empty until you assign products, and existing categories are not changed.`}
                className="flex"
              >
                {null}
              </RowForm>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            These are <strong className="font-medium text-ink">not in the database yet</strong>, so they are not in the product editor&apos;s Category list until added. Each is created{" "}
            <strong className="font-medium text-ink">hidden</strong>, with QALBI&apos;s own photo where one exists; rename, delete or show it afterwards.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {suggestions.map((s) => (
              <li key={s.slug} className="flex flex-wrap items-center gap-3 py-3">
                <Thumb src={s.imagePath ? mediaUrl(s.imagePath) : null} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{s.name}</span>
                  <span className="block text-xs text-muted">{s.basis}</span>
                </span>
                <RowForm action={addSuggestedCategoryAction} submitLabel="Add as hidden" pendingLabel="Adding…" variant="quiet" className="flex">
                  <input type="hidden" name="slug" value={s.slug} />
                </RowForm>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function CategoryCard({ c, others, first, last, canReorder, suggested }: { c: ManagedCategory; others: ManagedCategory[]; first: boolean; last: boolean; canReorder: boolean; suggested?: string }) {
  const n = c.products;
  const imagePath = c.imagePath ?? suggested ?? null;
  const showConfirm = n.live === 0 ? `No published products are in “${c.title}” yet, so its page on the website will be empty. Show it anyway?` : undefined;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Thumb src={imagePath ? mediaUrl(imagePath) : null} fallbackNote={!c.imagePath && suggested ? "website photo" : undefined} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{c.title}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", c.active ? "bg-botanical/15 text-forest" : "bg-line text-muted")}>{c.active ? "Visible" : "Hidden"}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            /collections/{c.handle} · {n.total} product{n.total === 1 ? "" : "s"} ({n.live} published) · order {c.sort}
            {c.active && (
              <a href={`/collections/${c.handle}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-forest">
                View <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </p>
        </div>
        <div>
          <MoveButtons id={c.id} action={moveCategoryAction} first={first} last={last} disabled={!canReorder} />
        </div>
        <RowForm
          action={setCategoryActiveAction}
          submitLabel={c.active ? "Hide from website" : "Show on website"}
          pendingLabel={c.active ? "Hiding…" : "Showing…"}
          variant="quiet"
          confirm={c.active ? `Hide “${c.title}” from the website menu and category pages?` : showConfirm}
          className="flex"
        >
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="active" value={c.active ? "false" : "true"} />
        </RowForm>
      </div>

      <details className="group mt-3 border-t border-line pt-3">
        <summary className="cursor-pointer list-none text-sm text-forest underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Edit details</span>
          <span className="hidden group-open:inline">Close editor</span>
        </summary>
        <RowForm action={saveCategoryAction} submitLabel="Save category" className="mt-4 grid gap-4">
          <CategoryFields c={c} suggested={suggested} />
        </RowForm>
        <DeleteCategory c={c} others={others} />
      </details>
    </Card>
  );
}

function CategoryFields({ c, suggested }: { c: CategoryRow; suggested?: string }) {
  const id = (f: string) => `cat-${c.id || "new"}-${f}`;
  return (
    <>
      <input type="hidden" name="id" value={c.id} />
      <div className="grid gap-4 sm:col-span-full sm:grid-cols-[9rem_1fr]">
        <ImageUploadField
          name="image_url"
          label="Image"
          folder="categories"
          defaultPath={c.imagePath ?? ""}
          aspectClass="aspect-square max-w-[9rem] rounded-full"
          minWidth={MIN_IMAGE_WIDTH}
          hint={suggested && !c.imagePath ? `Empty = QALBI's website photo (${suggested}).` : "Square, at least 600 × 600 px, no text in the image."}
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

function DeleteCategory({ c, others }: { c: ManagedCategory; others: ManagedCategory[] }) {
  const n = c.products.total;
  if (n === 0) {
    return (
      <RowForm action={deleteCategoryAction} submitLabel="Delete category" variant="danger" confirm={`Delete the “${c.title}” category? This cannot be undone.`} className="mt-4 flex justify-end border-t border-line pt-3">
        <input type="hidden" name="id" value={c.id} />
      </RowForm>
    );
  }
  return (
    <RowForm
      action={deleteCategoryAction}
      submitLabel={`Move ${n} product${n === 1 ? "" : "s"} & delete`}
      variant="danger"
      confirm={`Move the ${n} product${n === 1 ? "" : "s"} in “${c.title}” to the chosen category and delete “${c.title}”? This cannot be undone.`}
      className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3"
    >
      <input type="hidden" name="id" value={c.id} />
      <label className="flex flex-wrap items-center gap-2 text-xs text-muted">
        To delete, first move its {n} product{n === 1 ? "" : "s"} to
        <select name="reassign_to" required defaultValue="" className="field w-auto py-1 text-sm">
          <option value="" disabled>
            Choose…
          </option>
          {others.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
              {o.active ? "" : " (hidden)"}
            </option>
          ))}
          <option value="none">No category</option>
        </select>
      </label>
    </RowForm>
  );
}

/** Small round preview that flags a missing or low-resolution image (measured from the loaded file). */
function Thumb({ src, fallbackNote }: { src: string | null; fallbackNote?: string }) {
  const [width, setWidth] = useState<number | null>(null);
  const [broken, setBroken] = useState(false);
  const note = !src ? "No image" : broken ? "Image not found" : width !== null && width < MIN_IMAGE_WIDTH ? `Low resolution (${width}px)` : fallbackNote;
  return (
    <span className="flex w-16 shrink-0 flex-col items-center gap-1">
      <span className="relative block size-12 overflow-hidden rounded-full border border-line bg-sand">
        {src && !broken && (
          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail; its natural size is measured
          <img src={src} alt="" className="size-full object-cover" onLoad={(e) => setWidth(e.currentTarget.naturalWidth)} onError={() => setBroken(true)} />
        )}
      </span>
      {note && <span className={cn("text-center text-[0.6rem] leading-tight", !src || broken || (width !== null && width < MIN_IMAGE_WIDTH) ? "text-[#7a5418]" : "text-muted")}>{note}</span>}
    </span>
  );
}
