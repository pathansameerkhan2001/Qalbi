"use client";

import { useActionState, useState } from "react";
import { Monitor, Plus, Smartphone } from "lucide-react";
import { saveHeroSlideAction } from "@/lib/admin/content-actions";
import { mediaUrl } from "@/lib/assets";
import { ActionMessage, FieldError, initialActionState, SubmitButton } from "@/components/admin/form-bits";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { HeroOverlay, hasHeroContent } from "@/components/home/hero-overlay";
import { cn } from "@/lib/utils";

export interface HeroSlideValues {
  id: string;
  heading: string;
  subtitle: string;
  buttonLabel: string;
  buttonHref: string;
  desktopImagePath: string;
  mobileImagePath: string;
  alt: string;
  sort: number;
  active: boolean;
}

export const emptyHeroSlide: HeroSlideValues = { id: "", heading: "", subtitle: "", buttonLabel: "", buttonHref: "", desktopImagePath: "", mobileImagePath: "", alt: "", sort: 0, active: false };

/** Add form that clears itself after a successful save. */
export function NewHeroSlide({ nextSort }: { nextSort: number }) {
  const [key, setKey] = useState(0);
  return <HeroSlideForm key={key} initial={{ ...emptyHeroSlide, sort: nextSort }} onAddAnother={() => setKey((k) => k + 1)} />;
}

export function HeroSlideForm({ initial, onAddAnother }: { initial: HeroSlideValues; onAddAnother?: () => void }) {
  const [state, action] = useActionState(saveHeroSlideAction, initialActionState);
  const [values, setValues] = useState(initial);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(initial.desktopImagePath ? mediaUrl(initial.desktopImagePath) : null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(initial.mobileImagePath ? mediaUrl(initial.mobileImagePath) : null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const fid = (f: string) => `hero-${initial.id || "new"}-${f}`;
  const set = (k: keyof HeroSlideValues) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const err = (name: string) => <FieldError state={state} name={name} />;

  if (!initial.id && state.ok) {
    return (
      <div className="space-y-3">
        <ActionMessage state={state} />
        <button type="button" onClick={onAddAnother} className="btn btn-outline btn-sm">
          <Plus className="size-4" aria-hidden /> Add another slide
        </button>
      </div>
    );
  }

  const content = { heading: values.heading || null, subtitle: values.subtitle || null, buttonLabel: values.buttonLabel || null, buttonHref: values.buttonHref || null };
  const previewSrc = device === "desktop" ? desktopPreview : mobilePreview;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-2">
      <input type="hidden" name="id" value={initial.id} />
      <div className="space-y-4">
        <div>
          <label htmlFor={fid("heading")} className="label">Heading <span className="font-normal text-muted">(optional)</span></label>
          <input id={fid("heading")} name="heading" value={values.heading} onChange={set("heading")} maxLength={90} className="field" />
          {err("heading")}
        </div>
        <div>
          <label htmlFor={fid("subtitle")} className="label">Subtitle <span className="font-normal text-muted">(optional)</span></label>
          <input id={fid("subtitle")} name="subtitle" value={values.subtitle} onChange={set("subtitle")} maxLength={200} className="field" />
          {err("subtitle")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={fid("button_label")} className="label">Button label <span className="font-normal text-muted">(optional)</span></label>
            <input id={fid("button_label")} name="button_label" value={values.buttonLabel} onChange={set("buttonLabel")} maxLength={40} placeholder="Shop the collection" className="field" />
            {err("button_label")}
          </div>
          <div>
            <label htmlFor={fid("button_href")} className="label">Button destination</label>
            <input id={fid("button_href")} name="button_href" value={values.buttonHref} onChange={set("buttonHref")} placeholder="/products" className="field" />
            {err("button_href")}
          </div>
        </div>
        <div>
          <label htmlFor={fid("alt")} className="label">Image description (alt text)</label>
          <input id={fid("alt")} name="alt_text" value={values.alt} onChange={set("alt")} required maxLength={200} placeholder="What the photograph shows" className="field" />
          {err("alt_text")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            name="desktop_image_path"
            label="Desktop image"
            folder="hero"
            defaultPath={initial.desktopImagePath}
            hint="Landscape, about 1600 × 860 px. Max 5 MB."
            aspectClass="aspect-[160/86]"
            required
            onPathChange={(_, url) => setDesktopPreview(url)}
          />
          <ImageUploadField
            name="mobile_image_path"
            label="Mobile image"
            folder="hero"
            defaultPath={initial.mobileImagePath}
            hint="Portrait 4:5, about 1080 × 1350 px. Max 5 MB."
            aspectClass="aspect-[4/5] max-w-[12rem]"
            required
            onPathChange={(_, url) => setMobilePreview(url)}
          />
        </div>
        {err("desktop_image_path")}
        {err("mobile_image_path")}
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <label className="flex items-center gap-2">
            Order <input name="sort_order" type="number" defaultValue={initial.sort} className="field w-24" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked={initial.active} className="accent-[var(--color-forest)]" /> Show on the website
          </label>
        </div>
        {err("sort_order")}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton>{initial.id ? "Save slide" : "Add slide"}</SubmitButton>
          <ActionMessage state={state} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="label mb-0">Preview</p>
          <div role="group" aria-label="Preview size" className="inline-flex rounded-[3px] border border-line p-0.5">
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={device === d}
                onClick={() => setDevice(d)}
                className={cn("inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-1 text-xs capitalize", device === d ? "bg-forest text-ivory" : "text-muted hover:text-ink")}
              >
                {d === "desktop" ? <Monitor className="size-3.5" aria-hidden /> : <Smartphone className="size-3.5" aria-hidden />} {d}
              </button>
            ))}
          </div>
        </div>
        <div className={cn("relative mx-auto overflow-hidden rounded-[3px] bg-sand ring-1 ring-line", device === "desktop" ? "aspect-[160/86] w-full" : "aspect-[4/5] w-full max-w-[18rem]")}>
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview of an unsaved upload
            <img src={previewSrc} alt="" className="absolute inset-0 size-full object-cover object-[50%_55%]" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">Upload the {device} image to preview</span>
          )}
          {hasHeroContent(content) && <HeroOverlay content={content} inert />}
        </div>
        <p className="text-xs text-muted">The preview uses the same layout as the homepage. Save with “Show on the website” unticked to keep a slide hidden until it is ready.</p>
      </div>
    </form>
  );
}
