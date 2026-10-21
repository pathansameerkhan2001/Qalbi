"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { saveBlogPostAction } from "@/lib/admin/content-actions";
import { slugify } from "@/lib/content/rules";
import { ActionMessage, FieldError, initialActionState } from "@/components/admin/form-bits";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { cn } from "@/lib/utils";

export interface BlogPostValues {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  coverImagePath: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  /** datetime-local value in India Standard Time. */
  publishedAt: string;
  status: "draft" | "published";
}

function Counter({ value, max, recommended }: { value: string; max: number; recommended?: number }) {
  const over = recommended !== undefined && value.length > recommended;
  return (
    <span className={cn("text-xs", over ? "text-[#7a5418]" : "text-muted")}>
      {value.length}/{recommended ?? max}
      {over && " — may be shortened in search results"}
    </span>
  );
}

function IntentButton({ intent, children, variant }: { intent: "draft" | "publish"; children: React.ReactNode; variant: "primary" | "outline" }) {
  const { pending, data } = useFormStatus();
  const active = pending && data?.get("intent") === intent;
  return (
    <button type="submit" name="intent" value={intent} disabled={pending} className={cn("btn btn-sm", variant === "primary" ? "btn-primary" : "btn-outline")}>
      {active && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {active ? "Saving…" : children}
    </button>
  );
}

export function BlogPostForm({ initial }: { initial: BlogPostValues }) {
  const [state, action] = useActionState(saveBlogPostAction, initialActionState);
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const set = (k: keyof BlogPostValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const err = (name: string) => <FieldError state={state} name={name} />;
  const fid = (f: string) => `post-${f}`;
  const published = initial.status === "published";

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="id" value={initial.id} />
      <div className="space-y-6">
        <section className="space-y-4 rounded-[3px] border border-line bg-ivory p-5">
          <div>
            <label htmlFor={fid("title")} className="label">Title</label>
            <input
              id={fid("title")}
              name="title"
              value={values.title}
              onChange={(e) => {
                const title = e.target.value;
                setValues((v) => ({ ...v, title, slug: slugTouched ? v.slug : slugify(title) }));
              }}
              required
              maxLength={140}
              className="field"
            />
            {err("title")}
          </div>
          <div>
            <label htmlFor={fid("slug")} className="label">URL handle</label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted">/journal/</span>
              <input
                id={fid("slug")}
                name="slug"
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setValues((v) => ({ ...v, slug: e.target.value }));
                }}
                className="field"
              />
            </div>
            {published && values.slug !== initial.slug && <p className="mt-1 text-xs text-[#7a5418]">Changing the handle of a published post breaks existing links to it.</p>}
            {err("slug")}
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={fid("excerpt")} className="label">Excerpt</label>
              <Counter value={values.excerpt} max={320} />
            </div>
            <textarea id={fid("excerpt")} name="excerpt" value={values.excerpt} onChange={set("excerpt")} rows={2} maxLength={320} className="field resize-y" placeholder="One or two sentences shown on the journal cards." />
            {err("excerpt")}
          </div>
          <div>
            <label htmlFor={fid("body")} className="label">Article</label>
            <textarea id={fid("body")} name="body" value={values.body} onChange={set("body")} rows={18} className="field resize-y font-[inherit] leading-relaxed" />
            <p className="mt-1 text-xs text-muted">
              Leave a blank line between paragraphs. Start a line with <code>## </code> for a heading, <code>### </code> for a sub-heading and <code>- </code> for a bullet point. Formatting codes and HTML are shown as plain text.
            </p>
            {err("body")}
          </div>
        </section>

        <section className="space-y-4 rounded-[3px] border border-line bg-ivory p-5">
          <h2 className="font-serif text-xl">Search engines</h2>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={fid("seo-title")} className="label">SEO title <span className="font-normal text-muted">(optional)</span></label>
              <Counter value={values.seoTitle} max={120} recommended={60} />
            </div>
            <input id={fid("seo-title")} name="seo_title" value={values.seoTitle} onChange={set("seoTitle")} maxLength={120} placeholder={values.title} className="field" />
            {err("seo_title")}
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={fid("seo-description")} className="label">Meta description <span className="font-normal text-muted">(optional)</span></label>
              <Counter value={values.seoDescription} max={320} recommended={160} />
            </div>
            <textarea id={fid("seo-description")} name="seo_description" value={values.seoDescription} onChange={set("seoDescription")} rows={2} maxLength={320} placeholder={values.excerpt} className="field resize-y" />
            {err("seo_description")}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="space-y-4 rounded-[3px] border border-line bg-ivory p-5">
          <ImageUploadField name="cover_image_path" label="Cover image" folder="blog" defaultPath={initial.coverImagePath} hint="Landscape, at least 1600 × 900 px. Required to publish." aspectClass="aspect-[16/9]" minWidth={1600} />
          {err("cover_image_path")}
          <div>
            <label htmlFor={fid("cover-alt")} className="label">Cover description (alt text)</label>
            <input id={fid("cover-alt")} name="cover_alt" defaultValue={initial.coverAlt} maxLength={200} className="field" />
            {err("cover_alt")}
          </div>
        </section>

        <section className="space-y-4 rounded-[3px] border border-line bg-ivory p-5">
          <div>
            <label htmlFor={fid("category")} className="label">Category <span className="font-normal text-muted">(optional)</span></label>
            <input id={fid("category")} name="category" defaultValue={initial.category} maxLength={40} placeholder="e.g. Skincare routines" className="field" />
            {err("category")}
          </div>
          <div>
            <label htmlFor={fid("author")} className="label">Author <span className="font-normal text-muted">(optional)</span></label>
            <input id={fid("author")} name="author" defaultValue={initial.author} maxLength={80} className="field" />
            {err("author")}
          </div>
          <div>
            <label htmlFor={fid("published-at")} className="label">Publication date (India time)</label>
            <input id={fid("published-at")} name="published_at" type="datetime-local" defaultValue={initial.publishedAt} className="field" />
            <p className="mt-1 text-xs text-muted">Leave empty to publish immediately. A future date schedules the post.</p>
            {err("published_at")}
          </div>
        </section>

        <div className="space-y-3 rounded-[3px] border border-line bg-ivory p-5">
          <p className="text-sm">
            Status: <strong className="font-medium">{published ? "Published" : "Draft"}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {published ? (
              <>
                <IntentButton intent="publish" variant="primary">
                  Save changes
                </IntentButton>
                <IntentButton intent="draft" variant="outline">
                  Unpublish
                </IntentButton>
              </>
            ) : (
              <>
                <IntentButton intent="publish" variant="primary">
                  Publish
                </IntentButton>
                <IntentButton intent="draft" variant="outline">
                  Save draft
                </IntentButton>
              </>
            )}
          </div>
          <ActionMessage state={state} />
        </div>
      </div>
    </form>
  );
}
