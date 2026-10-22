"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, X } from "lucide-react";
import { createCategoryFromEditorAction, type ActionState } from "@/lib/admin/actions";
import { slugify } from "@/lib/content/rules";
import { ImageUploadField } from "@/components/admin/image-upload-field";

export type EditorCategory = { id: string; title: string; active: boolean };

/**
 * "Create new category" from the product editor. A modal <dialog> rendered into
 * <body> (outside the product <form>, so its fields are never posted with the
 * product). The category is saved by the server action and handed back to the
 * editor, which adds it to the dropdown and selects it — no page reload, so the
 * administrator's unsaved product edits stay as they are.
 */
export function NewCategoryDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (category: EditorCategory, message: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // React events bubble through portals: keep this submit away from the product form.
    e.stopPropagation();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const r = await createCategoryFromEditorAction(data);
        if (r.ok && r.category) onCreated(r.category, r.message);
        else setResult(r);
      } catch {
        setResult({ ok: false, message: "Could not reach the server, so the category was not created. Check your connection and try again." });
      }
    });
  };

  const fieldError = (k: string) => result?.fieldErrors?.[k] && <p className="mt-1 text-xs text-danger">{result.fieldErrors[k]}</p>;

  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby="new-category-title"
      onCancel={(e) => {
        if (pending) e.preventDefault();
        else onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-line bg-ivory p-0 text-ink shadow-soft backdrop:bg-ink/40"
    >
      <form onSubmit={onSubmit} className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="new-category-title" className="font-serif text-2xl text-forest">
              New category
            </h2>
            <p className="mt-0.5 text-xs text-muted">Saved straight to the database and selected for this product.</p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close" className="rounded p-1 text-muted hover:text-ink disabled:opacity-50">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div>
          <label htmlFor="nc-name" className="label">
            Name
          </label>
          <input
            id="nc-name"
            name="name"
            required
            maxLength={80}
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className="field"
            placeholder="e.g. Sunscreen"
          />
          {fieldError("name")}
        </div>
        <div>
          <label htmlFor="nc-slug" className="label">
            URL handle <span className="font-normal text-muted">(/collections/{slug || "…"})</span>
          </label>
          <input
            id="nc-slug"
            name="slug"
            required
            maxLength={100}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers and hyphens"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className="field"
          />
          {fieldError("slug")}
        </div>
        <div>
          <label htmlFor="nc-description" className="label">
            Description <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea id="nc-description" name="description" rows={2} maxLength={400} className="field resize-y" />
          {fieldError("description")}
        </div>
        <ImageUploadField name="image_url" label="Image (optional)" folder="categories" aspectClass="aspect-square max-w-[8rem] rounded-full" minWidth={400} hint="Square, at least 600 × 600 px, no text in the image." />
        {fieldError("image_url")}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="is_active" className="mt-1 accent-[var(--color-forest)]" />
          <span>
            Show on the website
            <span className="block text-xs text-muted">Leave unticked to keep it hidden until it has published products.</span>
          </span>
        </label>

        {result && !result.ok && (
          <p role="alert" className="rounded-[3px] border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {result.message}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} disabled={pending} className="btn btn-outline btn-sm disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={pending} aria-busy={pending || undefined} className="btn btn-primary btn-sm">
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {pending ? "Creating…" : "Create category"}
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
