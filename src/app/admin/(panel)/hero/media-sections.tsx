import { Film, ImageIcon, RotateCcw, Trash2, EyeOff } from "lucide-react";
import { deleteMediaAction } from "@/lib/admin/actions";
import { deleteBuiltInHeroMediaAction, setBuiltInHeroMediaAction } from "@/lib/admin/content-actions";
import type { MediaItem } from "@/lib/admin/data";
import { mediaUrl, storageUrl } from "@/lib/assets";
import type { HeroSlideRow } from "@/lib/store/cms";
import type { BuiltInHeroFile } from "@/lib/store/hero";
import { Card } from "@/components/admin/ui";
import { ConfirmDialogButton } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

const fileName = (path: string) => path.split("/").pop() ?? path;
const mb = (bytes: number | null) => (bytes === null ? "" : bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const isVideo = (path: string) => /\.(mp4|webm)$/i.test(path);

function Preview({ kind, src, missing }: { kind: "image" | "video"; src: string | null; missing?: boolean }) {
  return (
    <span className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[2px] bg-[#0b1a10] text-[0.65rem] text-ivory/70">
      {missing || !src ? (
        <span className="px-1 text-center">{missing ? "File missing" : "No preview"}</span>
      ) : kind === "video" ? (
        <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" aria-hidden />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
        <img src={src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      )}
      {kind === "video" && !missing && <Film className="relative size-4 text-ivory drop-shadow" aria-hidden />}
    </span>
  );
}

function Status({ tone, children }: { tone: "live" | "idle" | "warn"; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", tone === "live" ? "bg-botanical/15 text-forest" : tone === "warn" ? "bg-gold-pale text-[#7a5418]" : "bg-line text-muted")}>{children}</span>
  );
}

export interface BuiltInRow extends BuiltInHeroFile {
  removed: boolean;
  missing: boolean;
}

/**
 * The website's built-in hero files. Bucket files can be deleted (after the
 * homepage stops using them); project files can only be taken off the
 * homepage — they are part of the deployed website.
 */
export function BuiltInMediaCard({ files, slidesShown }: { files: BuiltInRow[]; slidesShown: boolean }) {
  return (
    <Card className="p-5">
      <h2 className="font-serif text-xl">Built-in media</h2>
      <p className="mt-1 text-sm text-muted">
        Files that came with the website. The homepage shows them only while none of your slides is shown{slidesShown ? " — your slides are shown now, so these are not visible" : ""}. Removing or deleting
        one never touches your uploaded slides.
      </p>
      <ul className="mt-4 divide-y divide-line">
        {files.map((f) => {
          const inUse = !f.removed && !f.missing;
          const name = fileName(f.path);
          return (
            <li key={f.path} className="flex flex-wrap items-center gap-3 py-3">
              <Preview kind={f.kind} src={f.url} missing={f.missing} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs text-ink" title={f.path}>
                  {f.path}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    {f.kind === "video" ? <Film className="size-3.5" aria-hidden /> : <ImageIcon className="size-3.5" aria-hidden />} {f.role} · {f.device}
                  </span>
                  <span>{f.location === "bucket" ? "Supabase media bucket" : "Website files (public/assets)"}</span>
                </span>
              </span>
              {f.missing ? (
                <Status tone="warn">Missing from the bucket</Status>
              ) : f.removed ? (
                <Status tone="idle">Removed from homepage</Status>
              ) : (
                <Status tone={slidesShown ? "idle" : "live"}>{slidesShown ? "In use (fallback)" : "Currently in use"}</Status>
              )}
              <span className="flex flex-wrap items-start gap-3">
                {f.removed && !f.missing && (
                  <ConfirmDialogButton
                    action={setBuiltInHeroMediaAction}
                    fields={{ path: f.path, show: "true" }}
                    trigger={
                      <>
                        <RotateCcw className="size-3.5" aria-hidden /> Restore
                      </>
                    }
                    title={`Show ${name} again?`}
                    confirmLabel="Restore to homepage"
                    pendingLabel="Restoring…"
                  >
                    <p>
                      <span className="font-mono text-ink">{f.path}</span> will be used on the homepage again whenever the built-in hero is shown.
                    </p>
                  </ConfirmDialogButton>
                )}
                {inUse && f.location === "project" && (
                  <ConfirmDialogButton
                    action={setBuiltInHeroMediaAction}
                    fields={{ path: f.path, show: "false" }}
                    trigger={
                      <>
                        <EyeOff className="size-3.5" aria-hidden /> Remove from homepage
                      </>
                    }
                    title={`Remove ${name} from the homepage?`}
                    confirmLabel="Remove from homepage"
                    pendingLabel="Removing…"
                  >
                    <p>
                      The homepage stops using <span className="font-mono text-ink">{f.path}</span>. The file stays in the website&apos;s files and can be restored here at any time.
                    </p>
                  </ConfirmDialogButton>
                )}
                {f.location === "bucket" && !f.missing ? (
                  <ConfirmDialogButton
                    action={deleteBuiltInHeroMediaAction}
                    fields={{ path: f.path }}
                    danger
                    trigger={
                      <>
                        <Trash2 className="size-3.5" aria-hidden /> Delete
                      </>
                    }
                    title={`Delete ${name}?`}
                    confirmLabel="Delete permanently"
                    pendingLabel="Deleting…"
                  >
                    <p>
                      <span className="font-mono text-ink">{f.path}</span> ({f.kind}, {f.device.toLowerCase()}) will be deleted from the Supabase media bucket. This cannot be undone.
                    </p>
                    <p>
                      It is taken off the homepage first.{" "}
                      {inUse && !slidesShown
                        ? f.role === "Film" && f.device === "Desktop"
                          ? "The homepage then shows the built-in photos instead of the film."
                          : "The homepage then uses the remaining built-in media."
                        : "This does not change what the homepage shows now."}
                    </p>
                  </ConfirmDialogButton>
                ) : (
                  f.location === "project" && (
                    <ConfirmDialogButton
                      action={setBuiltInHeroMediaAction}
                      fields={{ path: f.path, show: "false" }}
                      danger
                      disabled={f.removed}
                      trigger={
                        <>
                          <Trash2 className="size-3.5" aria-hidden /> Delete
                        </>
                      }
                      title={`${name} can't be deleted here`}
                      confirmLabel="Remove from homepage"
                      pendingLabel="Removing…"
                    >
                      <p>
                        <span className="font-mono text-ink">{f.path}</span> is one of the website&apos;s own files (public/assets). It is deployed with every build, so the admin panel can&apos;t delete it,
                        and reporting it as deleted would not be true.
                      </p>
                      <p>You can take it off the homepage instead (it can be restored later). To delete the file itself, remove it from the project and redeploy.</p>
                    </ConfirmDialogButton>
                  )
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Which slide uses an uploaded file, and as what. */
function usageOf(path: string, slides: HeroSlideRow[]): { label: string; shown: boolean }[] {
  const fields: [keyof HeroSlideRow, string][] = [
    ["desktopImagePath", "desktop image"],
    ["mobileImagePath", "mobile image"],
    ["desktopVideoPath", "desktop video"],
    ["mobileVideoPath", "mobile video"],
  ];
  return slides.flatMap((s) =>
    fields
      .filter(([k]) => s[k] === path)
      .map(([, what]) => ({ label: `${s.mediaType === "video" && what.endsWith("image") ? what.replace("image", "poster") : what} of “${s.heading || s.alt}”`, shown: s.active })),
  );
}

/**
 * Files uploaded for hero slides (media bucket, uploads/hero and
 * uploads/hero/videos). A file a slide still uses can't be deleted here (the
 * server refuses as well); change or delete that slide first.
 */
export function UploadedMediaCard({ files, slides, error }: { files: MediaItem[]; slides: HeroSlideRow[]; error: string | null }) {
  return (
    <Card className="p-5">
      <h2 className="font-serif text-xl">Uploaded media</h2>
      <p className="mt-1 text-sm text-muted">
        Images and videos uploaded for your slides (Supabase media bucket). Upload new ones, and replace one safely, in a slide&apos;s editor: a replacement is saved under a new name, so no visitor sees a stale cached copy. Delete files no slide
        uses any more.
      </p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {!error && files.length === 0 && <p className="mt-3 text-sm text-muted">No uploaded hero files yet.</p>}
      <ul className="mt-2 divide-y divide-line">
        {files.map((f) => {
          const usage = usageOf(f.path, slides);
          const kind = isVideo(f.path) ? "video" : "image";
          const src = kind === "video" ? storageUrl(f.path) : mediaUrl(f.path);
          const device = usage.length ? [...new Set(usage.map((u) => (u.label.startsWith("desktop") ? "Desktop" : "Mobile")))].join(" + ") : "—";
          return (
            <li key={f.path} className="flex flex-wrap items-center gap-3 py-3">
              <Preview kind={kind} src={src} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs text-ink" title={f.path}>
                  {f.name}
                </span>
                <span className="block text-xs text-muted">
                  {kind === "video" ? "Video" : "Image"} · {device} · Supabase media bucket{f.size !== null ? ` · ${mb(f.size)}` : ""}
                </span>
                {usage.length > 0 && <span className="block truncate text-xs text-muted">Used as {usage.map((u) => `${u.label}${u.shown ? "" : " (hidden slide)"}`).join("; ")}</span>}
              </span>
              <Status tone={usage.some((u) => u.shown) ? "live" : usage.length ? "idle" : "warn"}>{usage.some((u) => u.shown) ? "Currently in use" : usage.length ? "In a hidden slide" : "Not in use"}</Status>
              <ConfirmDialogButton
                action={deleteMediaAction}
                fields={{ path: f.path }}
                danger
                disabled={usage.length > 0}
                trigger={
                  <>
                    <Trash2 className="size-3.5" aria-hidden /> Delete
                  </>
                }
                title={`Delete ${f.name}?`}
                confirmLabel="Delete permanently"
                pendingLabel="Deleting…"
              >
                <p>
                  <span className="font-mono text-ink">{f.path}</span> will be deleted from the Supabase media bucket. No slide uses it, so the homepage is not affected. This cannot be undone.
                </p>
              </ConfirmDialogButton>
              {usage.length > 0 && <span className="w-full text-right text-[0.7rem] text-muted sm:w-auto">In use: change or delete the slide first</span>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
