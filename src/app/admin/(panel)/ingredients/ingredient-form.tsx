"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { saveIngredientAction } from "@/lib/admin/content-actions";
import { mediaUrl } from "@/lib/assets";
import { slugify } from "@/lib/content/rules";
import { ingredientIcons, type IngredientIcon } from "@/types/content";
import { ActionMessage, FieldError, SubmitButton, useAdminForm } from "@/components/admin/form-bits";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { IngredientSlide } from "@/components/home/ingredient-carousel";

export interface IngredientValues {
  id: string;
  name: string;
  slug: string;
  description: string;
  imagePath: string;
  imageAlt: string;
  icon: IngredientIcon;
  productHandles: string[];
  sort: number;
  active: boolean;
}

const iconLabels: Record<IngredientIcon, string> = {
  saffron: "Saffron flower",
  rose: "Rose",
  coconut: "Coconut",
  aloe: "Aloe vera",
  turmeric: "Turmeric root",
  neem: "Neem leaf",
  cardamom: "Cardamom pod",
  leaf: "Leaf (general)",
};

export function NewIngredient({ nextSort, products }: { nextSort: number; products: { handle: string; title: string }[] }) {
  const [key, setKey] = useState(0);
  return (
    <IngredientForm
      key={key}
      products={products}
      initial={{ id: "", name: "", slug: "", description: "", imagePath: "", imageAlt: "", icon: "leaf", productHandles: [], sort: nextSort, active: false }}
      onAddAnother={() => setKey((k) => k + 1)}
    />
  );
}

export function IngredientForm({ initial, products, onAddAnother }: { initial: IngredientValues; products: { handle: string; title: string }[]; onAddAnother?: () => void }) {
  const { state, pending, formProps } = useAdminForm(saveIngredientAction);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [icon, setIcon] = useState<IngredientIcon>(initial.icon);
  const [imageAlt, setImageAlt] = useState(initial.imageAlt);
  const [photo, setPhoto] = useState<string | null>(initial.imagePath ? mediaUrl(initial.imagePath) : null);
  const fid = (f: string) => `ingredient-${initial.id || "new"}-${f}`;

  if (!initial.id && state.ok) {
    return (
      <div className="space-y-3">
        <ActionMessage state={state} />
        <button type="button" onClick={onAddAnother} className="btn btn-outline btn-sm">
          <Plus className="size-4" aria-hidden /> Add another ingredient
        </button>
      </div>
    );
  }

  return (
    <form {...formProps} className="grid gap-6 md:grid-cols-[1fr_auto]">
      <input type="hidden" name="id" value={initial.id} />
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={fid("name")} className="label">Name</label>
            <input id={fid("name")} name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} placeholder="e.g. Saffron" className="field" aria-invalid={Boolean(state.fieldErrors?.name)} />
            <FieldError state={state} name="name" />
          </div>
          <div>
            <label htmlFor={fid("slug")} className="label">
              URL handle <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id={fid("slug")} name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={60} placeholder={slugify(name) || "saffron"} className="field" aria-invalid={Boolean(state.fieldErrors?.slug)} />
            <p className="mt-1 text-xs text-muted">Used for /ingredients#{slugify(slug || name) || "…"}</p>
            <FieldError state={state} name="slug" />
          </div>
        </div>
        <div>
          <label htmlFor={fid("description")} className="label">Short description</label>
          <textarea id={fid("description")} name="description" value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={160} rows={2} className="field" aria-invalid={Boolean(state.fieldErrors?.description)} />
          <p className="mt-1 text-xs text-muted">
            {description.length}/160 · A neutral note about the botanical. Avoid product or treatment claims.
          </p>
          <FieldError state={state} name="description" />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor={fid("icon")} className="label">Icon</label>
            <select id={fid("icon")} name="icon" value={icon} onChange={(e) => setIcon(e.target.value as IngredientIcon)} className="field">
              {ingredientIcons.map((value) => (
                <option key={value} value={value}>
                  {iconLabels[value]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">Shown in the small badge, and in place of the photo until one is uploaded.</p>
          </div>
        </div>
        <ImageUploadField
          name="image_path"
          label="Photo (optional)"
          folder="ingredients"
          defaultPath={initial.imagePath}
          hint="A real photograph of the ingredient, square, at least 600 × 600 px. It is shown in a circle, so keep the subject centred. Max 5 MB."
          aspectClass="aspect-square max-w-[9rem]"
          minWidth={600}
          onPathChange={(_, preview) => setPhoto(preview)}
        />
        <FieldError state={state} name="image_path" />
        <div>
          <label htmlFor={fid("alt")} className="label">Photo description</label>
          <input id={fid("alt")} name="image_alt" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} maxLength={200} placeholder="e.g. Saffron threads in a wooden bowl" className="field" aria-invalid={Boolean(state.fieldErrors?.image_alt)} />
          <FieldError state={state} name="image_alt" />
        </div>
        {products.length > 0 && (
          <fieldset>
            <legend className="label">Found in (only products whose confirmed formulation contains it)</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {products.map((p) => (
                <label key={p.handle} className="flex items-center gap-2">
                  <input type="checkbox" name="product_handles" value={p.handle} defaultChecked={initial.productHandles.includes(p.handle)} className="accent-[var(--color-forest)]" />
                  {p.title}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <label className="flex items-center gap-2">
            Order <input name="sort_order" type="number" defaultValue={initial.sort} className="field w-24" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked={initial.active} className="accent-[var(--color-forest)]" /> Show on the website
          </label>
        </div>
        <FieldError state={state} name="sort_order" />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pending={pending}>{initial.id ? "Save ingredient" : "Add ingredient"}</SubmitButton>
          <ActionMessage state={state} />
        </div>
      </div>

      <div>
        <p className="label">Preview</p>
        <div inert className="@container w-[12rem] rounded-[3px] bg-cream p-4">
          <IngredientSlide
            item={{
              slug: slugify(slug || name) || "preview",
              name: name || "Ingredient",
              description: description || "Short description",
              image: photo ? { src: photo, alt: imageAlt, width: 600, height: 600 } : null,
              icon,
            }}
          />
        </div>
      </div>
    </form>
  );
}
