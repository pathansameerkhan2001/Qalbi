"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { saveReelAction } from "@/lib/admin/content-actions";
import { mediaUrl } from "@/lib/assets";
import { normalizeReelUrl } from "@/lib/content/rules";
import { ActionMessage, FieldError, initialActionState, SubmitButton } from "@/components/admin/form-bits";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { CardOverlay, cardClass } from "@/components/home/reel-card";

export interface ReelValues {
  id: string;
  reelUrl: string;
  caption: string;
  thumbnailPath: string;
  sort: number;
  published: boolean;
}

export function NewReel({ nextSort }: { nextSort: number }) {
  const [key, setKey] = useState(0);
  return <ReelForm key={key} initial={{ id: "", reelUrl: "", caption: "", thumbnailPath: "", sort: nextSort, published: false }} onAddAnother={() => setKey((k) => k + 1)} />;
}

export function ReelForm({ initial, onAddAnother }: { initial: ReelValues; onAddAnother?: () => void }) {
  const [state, action] = useActionState(saveReelAction, initialActionState);
  const [caption, setCaption] = useState(initial.caption);
  const [url, setUrl] = useState(initial.reelUrl);
  const [thumb, setThumb] = useState<string | null>(initial.thumbnailPath ? mediaUrl(initial.thumbnailPath) : null);
  const fid = (f: string) => `reel-${initial.id || "new"}-${f}`;
  const normalized = url.trim() ? normalizeReelUrl(url) : null;

  if (!initial.id && state.ok) {
    return (
      <div className="space-y-3">
        <ActionMessage state={state} />
        <button type="button" onClick={onAddAnother} className="btn btn-outline btn-sm">
          <Plus className="size-4" aria-hidden /> Add another Reel
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-6 md:grid-cols-[1fr_auto]">
      <input type="hidden" name="id" value={initial.id} />
      <div className="space-y-4">
        <div>
          <label htmlFor={fid("url")} className="label">Instagram Reel link</label>
          <input id={fid("url")} name="reel_url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://www.instagram.com/reel/…" className="field" />
          {url.trim() && !normalized && <p className="mt-1 text-xs text-danger">This doesn&apos;t look like a public Reel or post link.</p>}
          {normalized && normalized !== url.trim() && <p className="mt-1 text-xs text-muted">Will be saved as {normalized}</p>}
          <FieldError state={state} name="reel_url" />
        </div>
        <div>
          <label htmlFor={fid("caption")} className="label">Caption on the card</label>
          <input id={fid("caption")} name="caption" value={caption} onChange={(e) => setCaption(e.target.value)} required maxLength={80} placeholder="e.g. My evening ritual" className="field" />
          <FieldError state={state} name="caption" />
        </div>
        <ImageUploadField
          name="thumbnail_path"
          label="Thumbnail"
          folder="reels"
          defaultPath={initial.thumbnailPath}
          hint="Portrait 9:16, about 720 × 1280 px — a frame from the Reel works well. Max 5 MB."
          aspectClass="aspect-[9/16] max-w-[9rem]"
          minWidth={540}
          required
          onPathChange={(_, preview) => setThumb(preview)}
        />
        <FieldError state={state} name="thumbnail_path" />
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <label className="flex items-center gap-2">
            Order <input name="sort_order" type="number" defaultValue={initial.sort} className="field w-24" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_published" defaultChecked={initial.published} className="accent-[var(--color-forest)]" /> Show on the website
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton>{initial.id ? "Save Reel" : "Add Reel"}</SubmitButton>
          <ActionMessage state={state} />
        </div>
      </div>

      <div>
        <p className="label">Preview</p>
        <div className="flex items-end gap-4 rounded-[3px] bg-forest p-4">
          {[
            { label: "Mobile", width: "w-[9.5rem]" },
            { label: "Desktop", width: "w-[12rem]" },
          ].map((size) => (
            <figure key={size.label} className={size.width}>
              <div className={cardClass}>
                {thumb && (
                  // eslint-disable-next-line @next/next/no-img-element -- preview of an unsaved upload
                  <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" />
                )}
                <CardOverlay title={caption || "Caption"} video />
              </div>
              <figcaption className="mt-2 text-center text-[0.7rem] text-ivory/70">{size.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </form>
  );
}
