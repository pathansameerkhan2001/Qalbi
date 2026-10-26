"use client";

import { useState } from "react";
import { Film, ImageIcon, Monitor, Plus, Smartphone } from "lucide-react";
import { saveHeroSlideAction } from "@/lib/admin/content-actions";
import { mediaUrl, storageUrl } from "@/lib/assets";
import { ActionMessage, FieldError, SubmitButton, useAdminForm } from "@/components/admin/form-bits";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { VideoUploadField } from "@/components/admin/video-upload-field";
import { HeroOverlay, hasHeroContent } from "@/components/home/hero-overlay";
import { cn } from "@/lib/utils";

export interface HeroSlideValues {
  id: string;
  mediaType: "image" | "video";
  heading: string;
  subtitle: string;
  buttonLabel: string;
  buttonHref: string;
  /** Image slides: the images. Video slides: the optional posters. */
  desktopImagePath: string;
  mobileImagePath: string;
  desktopVideoPath: string;
  mobileVideoPath: string;
  alt: string;
  sort: number;
  active: boolean;
}

export const emptyHeroSlide: HeroSlideValues = {
  id: "",
  mediaType: "image",
  heading: "",
  subtitle: "",
  buttonLabel: "",
  buttonHref: "",
  desktopImagePath: "",
  mobileImagePath: "",
  desktopVideoPath: "",
  mobileVideoPath: "",
  alt: "",
  sort: 0,
  active: false,
};

const toUrl = (path: string, video = false) => (path ? (video ? storageUrl(path) : mediaUrl(path)) : null);

/** Add form that clears itself after a successful save. */
export function NewHeroSlide({ nextSort, videoReady }: { nextSort: number; videoReady: boolean }) {
  const [key, setKey] = useState(0);
  return <HeroSlideForm key={key} initial={{ ...emptyHeroSlide, sort: nextSort }} videoReady={videoReady} onAddAnother={() => setKey((k) => k + 1)} />;
}

/**
 * One hero slide: an image slide (desktop + mobile image, both required) or a
 * video slide (desktop video required; mobile video and both posters optional).
 * Images and videos have their own fields, checks, uploads and previews.
 */
export function HeroSlideForm({ initial, videoReady, onAddAnother }: { initial: HeroSlideValues; videoReady: boolean; onAddAnother?: () => void }) {
  const { state, pending, formProps } = useAdminForm(saveHeroSlideAction);
  const [values, setValues] = useState(initial);
  const [preview, setPreview] = useState({
    desktopImage: toUrl(initial.desktopImagePath),
    mobileImage: toUrl(initial.mobileImagePath),
    desktopVideo: toUrl(initial.desktopVideoPath, true),
    mobileVideo: toUrl(initial.mobileVideoPath, true),
  });
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const fid = (f: string) => `hero-${initial.id || "new"}-${f}`;
  const set = (k: keyof HeroSlideValues) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const err = (name: string) => <FieldError state={state} name={name} />;
  const video = values.mediaType === "video";

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
  // Phones fall back to the desktop video / poster when there is no mobile one, as on the homepage.
  const stillSrc = device === "desktop" ? (preview.desktopImage ?? preview.mobileImage) : (preview.mobileImage ?? preview.desktopImage);
  const videoSrc = device === "desktop" ? preview.desktopVideo : (preview.mobileVideo ?? preview.desktopVideo);

  return (
    <form {...formProps} className="grid gap-6 lg:grid-cols-2">
      <input type="hidden" name="id" value={initial.id} />
      <input type="hidden" name="media_type" value={values.mediaType} />
      <div className="space-y-4">
        <fieldset>
          <legend className="label">Slide type</legend>
          <div className="inline-flex rounded-[3px] border border-line p-0.5" role="radiogroup">
            {(["image", "video"] as const).map((t) => {
              const disabled = t === "video" && !videoReady && !video;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={values.mediaType === t}
                  disabled={disabled}
                  onClick={() => setValues((v) => ({ ...v, mediaType: t }))}
                  className={cn("inline-flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 text-sm disabled:opacity-40", values.mediaType === t ? "bg-forest text-ivory" : "text-muted hover:text-ink")}
                >
                  {t === "image" ? <ImageIcon className="size-4" aria-hidden /> : <Film className="size-4" aria-hidden />} {t === "image" ? "Image slide" : "Video slide"}
                </button>
              );
            })}
          </div>
          {!videoReady && (
            <p className="mt-1 text-xs text-[#7a5418]">Video slides become available once the database update 20261026000000_hero_video_and_product_order.sql has been run in Supabase.</p>
          )}
        </fieldset>

        {video ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <VideoUploadField
                key="desktop-video"
                name="desktop_video_path"
                label="Desktop video"
                defaultPath={initial.desktopVideoPath}
                aspectClass="aspect-[16/9]"
                required
                poster={preview.desktopImage}
                hint="Tablets and computers (640 px and wider). 16:9, about 1280 × 720, no sound; ideally under 3 MB."
                onPathChange={(_, url) => setPreview((p) => ({ ...p, desktopVideo: url }))}
              />
              <VideoUploadField
                key="mobile-video"
                name="mobile_video_path"
                label="Mobile video (optional)"
                defaultPath={initial.mobileVideoPath}
                aspectClass="aspect-[4/5] max-w-[12rem]"
                poster={preview.mobileImage ?? preview.desktopImage}
                hint="Phones download only this one. Portrait 4:5, about 720 × 900; ideally under 2 MB. Empty: phones get the desktop video."
                onPathChange={(_, url) => setPreview((p) => ({ ...p, mobileVideo: url }))}
              />
            </div>
            {err("desktop_video_path")}
            {err("mobile_video_path")}
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUploadField
                key="desktop-poster"
                name="desktop_image_path"
                label="Desktop poster (recommended)"
                folder="hero"
                defaultPath={initial.desktopImagePath}
                hint="Shown at once while the video loads, and instead of it when it can't play. Use the video's first frame. Without a poster the slide is skipped for visitors who can't play video."
                minWidth={1280}
                aspectClass="aspect-[16/9]"
                onPathChange={(_, url) => setPreview((p) => ({ ...p, desktopImage: url }))}
              />
              <ImageUploadField
                key="mobile-poster"
                name="mobile_image_path"
                label="Mobile poster (optional)"
                folder="hero"
                defaultPath={initial.mobileImagePath}
                hint="The mobile video's first frame, 4:5. Empty: the desktop poster."
                minWidth={720}
                aspectClass="aspect-[4/5] max-w-[12rem]"
                onPathChange={(_, url) => setPreview((p) => ({ ...p, mobileImage: url }))}
              />
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploadField
              key="desktop-image"
              name="desktop_image_path"
              label="Desktop image"
              folder="hero"
              defaultPath={initial.desktopImagePath}
              hint="Landscape, at least 1600 × 860 px (1920 × 1032 ideal). JPEG, PNG, WebP or AVIF, max 5 MB."
              minWidth={1600}
              aspectClass="aspect-[160/86]"
              required
              onPathChange={(_, url) => setPreview((p) => ({ ...p, desktopImage: url }))}
            />
            <ImageUploadField
              key="mobile-image"
              name="mobile_image_path"
              label="Mobile image"
              folder="hero"
              defaultPath={initial.mobileImagePath}
              hint="Portrait 4:5, at least 1080 × 1350 px. JPEG, PNG, WebP or AVIF, max 5 MB."
              minWidth={1080}
              aspectClass="aspect-[4/5] max-w-[12rem]"
              required
              onPathChange={(_, url) => setPreview((p) => ({ ...p, mobileImage: url }))}
            />
          </div>
        )}
        {err("desktop_image_path")}
        {err("mobile_image_path")}

        <div>
          <label htmlFor={fid("alt")} className="label">
            {video ? "Video description" : "Image description"} <span className="font-normal text-muted">(alt text; also the slide&apos;s name in the list)</span>
          </label>
          <input id={fid("alt")} name="alt_text" value={values.alt} onChange={set("alt")} required maxLength={200} placeholder={video ? "What the video shows" : "What the photograph shows"} className="field" />
          {err("alt_text")}
        </div>
        <details className="rounded-[3px] border border-line p-3" open={Boolean(initial.heading || initial.subtitle || initial.buttonLabel)}>
          <summary className="cursor-pointer text-sm font-medium">Text over the slide (optional)</summary>
          <div className="mt-3 space-y-4">
            <div>
              <label htmlFor={fid("heading")} className="label">Heading</label>
              <input id={fid("heading")} name="heading" value={values.heading} onChange={set("heading")} maxLength={90} className="field" />
              {err("heading")}
            </div>
            <div>
              <label htmlFor={fid("subtitle")} className="label">Subtitle</label>
              <input id={fid("subtitle")} name="subtitle" value={values.subtitle} onChange={set("subtitle")} maxLength={200} className="field" />
              {err("subtitle")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={fid("button_label")} className="label">Button label</label>
                <input id={fid("button_label")} name="button_label" value={values.buttonLabel} onChange={set("buttonLabel")} maxLength={40} placeholder="Shop the collection" className="field" />
                {err("button_label")}
              </div>
              <div>
                <label htmlFor={fid("button_href")} className="label">Button destination</label>
                <input id={fid("button_href")} name="button_href" value={values.buttonHref} onChange={set("buttonHref")} placeholder="/products" className="field" />
                {err("button_href")}
              </div>
            </div>
          </div>
        </details>
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
          <SubmitButton pending={pending}>{initial.id ? "Save slide" : video ? "Add video slide" : "Add slide"}</SubmitButton>
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
        <div className={cn("relative mx-auto overflow-hidden rounded-[3px] bg-[#0b1a10] ring-1 ring-line", device === "desktop" ? "aspect-[16/9] w-full" : "aspect-[4/5] w-full max-w-[18rem]")}>
          {video && videoSrc ? (
            <video key={videoSrc} src={videoSrc} poster={stillSrc ?? undefined} muted playsInline autoPlay loop className="absolute inset-0 size-full object-cover" />
          ) : stillSrc && !video ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview of an unsaved upload
            <img src={stillSrc} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-ivory/70">Upload the {device} {video ? "video" : "image"} to preview</span>
          )}
          {hasHeroContent(content) && <HeroOverlay content={content} inert />}
        </div>
        <p className="text-xs text-muted">
          The frame matches the homepage shape (desktop 16:9, phone 4:5). Save with “Show on the website” unticked to keep a slide hidden until it is ready; the sequence preview above shows it in place.
        </p>
      </div>
    </form>
  );
}
