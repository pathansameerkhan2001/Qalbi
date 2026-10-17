"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { saveProductAction } from "@/lib/admin/actions";
import { ActionMessage, FieldError, initialActionState, SubmitButton } from "@/components/admin/form-bits";

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
  categories: { id: string; title: string; active: boolean }[];
  /** Base URLs used only for previews: [localAssetsBase, supabaseUploadsBase]. */
  mediaBase: { assets: string; uploads: string };
  readOnly: boolean;
}) {
  const [state, action] = useActionState(saveProductAction, initialActionState);
  const [handle, setHandle] = useState(initial.slug);
  const [handleTouched, setHandleTouched] = useState(Boolean(initial.id));
  const [images, setImages] = useState(initial.images);

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

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
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
            <label htmlFor="p-description" className="label">Description</label>
            <textarea id="p-description" name="description" rows={4} defaultValue={initial.description} className="field resize-y" />
            {err("description")}
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
          <button type="button" onClick={() => setImages((l) => [...l, { path: "", alt: "" }])} className="btn btn-outline btn-sm">
            <ImagePlus className="size-4" aria-hidden /> Add image
          </button>
          {err("images")}
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
            <input id="p-inventory" name="stock_quantity" type="number" min="0" step="1" defaultValue={initial.stock_quantity} className="field" />
            {err("stock_quantity")}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_published" defaultChecked={initial.is_published} className="accent-[var(--color-forest)]" /> Published on the website
          </label>
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
          <select id="p-category" name="category_id" defaultValue={initial.category_id} className="field">
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.active ? "" : " (hidden)"}
              </option>
            ))}
          </select>
          {err("category_id")}
        </fieldset>

        {!readOnly && (
          <div className="space-y-3">
            <ActionMessage state={state} />
            <SubmitButton className="w-full">{initial.id ? "Save product" : "Create product"}</SubmitButton>
          </div>
        )}
      </div>
    </form>
  );
}
