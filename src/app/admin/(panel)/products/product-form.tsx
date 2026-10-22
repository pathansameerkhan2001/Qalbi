"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Plus, Trash2, Upload } from "lucide-react";
import { saveProductAction, uploadImageAction } from "@/lib/admin/actions";
import { ActionMessage, FieldError, SubmitButton, useAdminForm } from "@/components/admin/form-bits";
import { DescriptionEditor } from "./description-editor";
import { NewCategoryDialog, type EditorCategory } from "./new-category-dialog";

export interface ProductFormValues {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  compare_at_price: string;
  stock_quantity: string;
  sku: string;
  category_id: string;
  is_published: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  seo_title: string;
  seo_description: string;
  images: { path: string; alt: string }[];
}

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function ProductForm({
  initial,
  categories,
  mediaBase,
  readOnly,
}: {
  initial: ProductFormValues;
  categories: EditorCategory[];
  /** Base URLs used only for previews: [localAssetsBase, supabaseUploadsBase]. */
  mediaBase: { assets: string; uploads: string };
  readOnly: boolean;
}) {
  const { state, pending, formProps } = useAdminForm(saveProductAction);
  const [handle, setHandle] = useState(initial.slug);
  const [handleTouched, setHandleTouched] = useState(Boolean(initial.id));
  const [images, setImages] = useState(initial.images);
  const [categoryId, setCategoryId] = useState(initial.category_id);
  // Categories created in this editor, kept until the server's list (props) includes them.
  const [created, setCreated] = useState<EditorCategory[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryNotice, setCategoryNotice] = useState("");
  const categoryList = [...categories, ...created.filter((c) => !categories.some((x) => x.id === c.id))];
  const selectedCategory = categoryList.find((c) => c.id === categoryId);

  const preview = (path: string) => {
    if (!path) return "";
    if (/^https:\/\//.test(path)) return path;
    const clean = path.replace(/^\/+/, "");
    return clean.startsWith("uploads/") ? `${mediaBase.uploads}/${clean}` : `${mediaBase.assets}/${clean}`;
  };
  const move = (i: number, d: -1 | 1) =>
    setImages((list) => {
      const next = [...list];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const err = (name: string) => <FieldError state={state} name={name} />;
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadImage = (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) return setUploadError("Choose a JPEG, PNG, WebP or AVIF image.");
    if (file.size > 5 * 1024 * 1024) return setUploadError("Images must be 5 MB or smaller.");
    setUploadError("");
    const data = new FormData();
    data.set("file", file);
    data.set("folder", "products");
    startUpload(async () => {
      const result = await uploadImageAction({ ok: false, message: "" }, data);
      if (result.ok && result.path) setImages((list) => [...list, { path: result.path!, alt: "" }]);
      else setUploadError(result.message || "Upload failed.");
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <form {...formProps} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="id" value={initial.id} />
      <input type="hidden" name="images" value={JSON.stringify(images.filter((img) => img.path.trim()))} />
      <fieldset disabled={readOnly} className="space-y-6">
        <section className="space-y-4 rounded-[3px] border border-line bg-ivory p-5">
          <div>
            <label htmlFor="p-title" className="label">Name</label>
            <input
              id="p-title"
              name="name"
              defaultValue={initial.name}
              required
              className="field"
              onChange={(e) => {
                if (!handleTouched) setHandle(slugify(e.target.value));
              }}
            />
            {err("name")}
          </div>
          <div>
            <label htmlFor="p-handle" className="label">URL handle</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">/products/</span>
              <input id="p-handle" name="slug" value={handle} onChange={(e) => (setHandleTouched(true), setHandle(e.target.value))} required className="field" />
            </div>
            {err("slug")}
          </div>
          <div>
            <DescriptionEditor defaultValue={initial.description} productName={initial.name} error={err("description")} />
          </div>
          <div>
            <label htmlFor="p-sku" className="label">SKU <span className="font-normal text-muted">(optional)</span></label>
            <input id="p-sku" name="sku" defaultValue={initial.sku} className="field" />
            {err("sku")}
          </div>
        </section>

        <section className="space-y-4 rounded-[3px] border border-line bg-ivory p-5">
          <h2 className="font-serif text-xl">Images</h2>
          <p className="text-sm text-muted">
            The first image is the main product photo. Use a path from the{" "}
            <Link href="/admin/media" target="_blank" className="text-forest underline">
              media library
            </Link>{" "}
            (e.g. <code>products/serum-studio.webp</code> or <code>uploads/products/…</code>).
          </p>
          <ul className="space-y-3">
            {images.map((img, i) => (
              <li key={i} className="flex gap-3 rounded-[3px] border border-line p-3">
                <span className="relative size-20 shrink-0 overflow-hidden rounded-[3px] bg-sand">
                  {img.path && (
                    // eslint-disable-next-line @next/next/no-img-element -- live preview of an arbitrary media path
                    <img src={preview(img.path)} alt="" className="size-full object-cover" />
                  )}
                </span>
                <div className="grid flex-1 gap-2">
                  <input aria-label={`Image ${i + 1} path`} value={img.path} onChange={(e) => setImages((l) => l.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)))} placeholder="products/…webp" className="field" />
                  <input aria-label={`Image ${i + 1} description (alt text)`} value={img.alt} onChange={(e) => setImages((l) => l.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Describe the photo" className="field" />
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="rounded p-1 hover:bg-sand disabled:opacity-30">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="rounded p-1 hover:bg-sand disabled:opacity-30">
                    <ArrowDown className="size-4" />
                  </button>
                  <button type="button" onClick={() => setImages((l) => l.filter((_, j) => j !== i))} aria-label="Remove image" className="rounded p-1 text-danger hover:bg-danger/10">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <label className={`btn btn-primary btn-sm cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
              {uploading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />} {uploading ? "Uploading…" : "Upload image"}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />
            </label>
            <button type="button" onClick={() => setImages((l) => [...l, { path: "", alt: "" }])} className="btn btn-outline btn-sm">
              <ImagePlus className="size-4" aria-hidden /> Add by media path
            </button>
          </div>
          {uploadError && (
            <p role="alert" className="text-xs text-danger">
              {uploadError}
            </p>
          )}
          {images.some((img) => img.path && !img.alt.trim()) && <p className="text-xs text-[#7a5418]">Describe every photo (alt text) — it helps customers using screen readers and search engines.</p>}
          {err("images")}
        </section>

        <section className="space-y-4 rounded-[3px] border border-line bg-ivory p-5">
          <h2 className="font-serif text-xl">Search engines</h2>
          <p className="text-sm text-muted">Optional. Without these, Google is shown the product name and the start of the description.</p>
          <input type="hidden" name="seo_present" value={initial.seo_title || initial.seo_description ? "1" : ""} />
          <div>
            <label htmlFor="p-seo-title" className="label">SEO title <span className="font-normal text-muted">(about 60 characters)</span></label>
            <input id="p-seo-title" name="seo_title" defaultValue={initial.seo_title} maxLength={120} placeholder="e.g. Radiance Glow Cream — Natural Face Cream | QALBI Naturals" className="field" />
            {err("seo_title")}
          </div>
          <div>
            <label htmlFor="p-seo-description" className="label">Meta description <span className="font-normal text-muted">(about 155 characters)</span></label>
            <textarea id="p-seo-description" name="seo_description" defaultValue={initial.seo_description} rows={2} maxLength={320} className="field resize-y" />
            {err("seo_description")}
          </div>
        </section>
      </fieldset>

      <div className="space-y-6">
        <fieldset disabled={readOnly} className="space-y-4 rounded-[3px] border border-line bg-ivory p-5">
          <h2 className="font-serif text-xl">Pricing &amp; stock</h2>
          <div>
            <label htmlFor="p-price" className="label">Price (₹)</label>
            <input id="p-price" name="price" type="number" min="0" step="0.01" defaultValue={initial.price} required className="field" />
            {err("price")}
          </div>
          <div>
            <label htmlFor="p-compare" className="label">Compare-at price (₹) <span className="font-normal text-muted">(optional)</span></label>
            <input id="p-compare" name="compare_at_price" type="number" min="0" step="0.01" defaultValue={initial.compare_at_price} className="field" />
            {err("compare_at_price")}
          </div>
          <div>
            <label htmlFor="p-inventory" className="label">Units in stock</label>
            <input id="p-inventory" name="stock_quantity" type="number" min="0" step="1" defaultValue={initial.stock_quantity} className="field" aria-describedby="p-inventory-hint" />
            <p id="p-inventory-hint" className="mt-1 text-xs text-muted">Leave empty if you don&apos;t track stock. 0 shows the product as out of stock.</p>
            {err("stock_quantity")}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_published" defaultChecked={initial.is_published} className="accent-[var(--color-forest)]" /> Published on the website
          </label>
          <p className="-mt-2 pl-6 text-xs text-muted">Needs a price above ₹0 and at least one photo. Unticked = draft, hidden from customers.</p>
          {err("is_published")}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_featured" defaultChecked={initial.is_featured} className="accent-[var(--color-forest)]" /> Featured (listed first)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_best_seller" defaultChecked={initial.is_best_seller} className="accent-[var(--color-forest)]" /> Best seller (The QALBI Favourites)
          </label>
        </fieldset>

        <fieldset disabled={readOnly} className="space-y-2 rounded-[3px] border border-line bg-ivory p-5">
          <h2 className="font-serif text-xl">
            <label htmlFor="p-category">Category</label>
          </h2>
          <select id="p-category" name="category_id" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field">
            <option value="">No category</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.active ? "" : " (Hidden)"}
              </option>
            ))}
          </select>
          {err("category_id")}
          {!readOnly && (
            <button type="button" onClick={() => setCreatingCategory(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-forest underline-offset-2 hover:underline">
              <Plus className="size-4" aria-hidden /> Create new category
            </button>
          )}
          {categoryNotice && (
            <p role="status" className="text-xs text-botanical">
              {categoryNotice}
            </p>
          )}
          {selectedCategory && !selectedCategory.active && (
            <p className="text-xs text-[#7a5418]">“{selectedCategory.title}” is hidden: customers won&apos;t see it in the menu or on category pages until you show it in Categories.</p>
          )}
          <p className="text-xs text-muted">
            {categoryList.length} categor{categoryList.length === 1 ? "y" : "ies"} saved, hidden ones included.{" "}
            <Link href="/admin/categories" className="text-forest underline underline-offset-2">
              Manage categories
            </Link>
          </p>
          {creatingCategory && (
            <NewCategoryDialog
              onClose={() => setCreatingCategory(false)}
              onCreated={(category, message) => {
                setCreated((l) => [...l, category]);
                setCategoryId(category.id);
                setCategoryNotice(message);
                setCreatingCategory(false);
              }}
            />
          )}
        </fieldset>

        {!readOnly && (
          <div className="space-y-3">
            <ActionMessage state={state} />
            <SubmitButton pending={pending} className="w-full">{initial.id ? "Save product" : "Create product"}</SubmitButton>
          </div>
        )}
      </div>
    </form>
  );
}
