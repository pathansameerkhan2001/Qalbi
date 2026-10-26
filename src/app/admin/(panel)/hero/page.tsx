import type { Metadata } from "next";
import { Film, ImageIcon } from "lucide-react";
import { heroVideoMigrationApplied, listHeroSlides } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteHeroSlideAction, moveHeroSlideAction, setHeroSlideActiveAction } from "@/lib/admin/content-actions";
import { mediaUrl, storageUrl } from "@/lib/assets";
import type { HeroPlan } from "@/lib/content/hero";
import type { HeroSlideRow } from "@/lib/store/cms";
import { builtInHero, heroPlanFor } from "@/lib/store/hero";
import { toSlideView } from "@/components/home/hero";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { MoveButtons } from "@/components/admin/move-buttons";
import { RowForm } from "@/components/admin/row-form";
import { cn } from "@/lib/utils";
import { HeroSlideForm, NewHeroSlide, type HeroSlideValues } from "./hero-slide-form";
import { HeroSequence, type SequenceView } from "./hero-sequence";

export const metadata: Metadata = { title: "Hero section" };

const toValues = (s: HeroSlideRow): HeroSlideValues => ({
  id: s.id,
  mediaType: s.mediaType,
  heading: s.heading ?? "",
  subtitle: s.subtitle ?? "",
  buttonLabel: s.buttonLabel ?? "",
  buttonHref: s.buttonHref ?? "",
  desktopImagePath: s.desktopImagePath ?? "",
  mobileImagePath: s.mobileImagePath ?? "",
  desktopVideoPath: s.desktopVideoPath ?? "",
  mobileVideoPath: s.mobileVideoPath ?? "",
  alt: s.alt,
  sort: s.sort,
  active: s.active,
});

/** The plan as preview tiles plus the real hero's props. */
function sequenceView(plan: HeroPlan, slides: HeroSlideRow[]): SequenceView {
  const shown = new Set(slides.filter((s) => s.active).map((s) => s.id));
  return {
    tiles: plan.slides.map((s) => ({
      key: s.key,
      kind: s.video ? "video" : "image",
      label: s.content?.heading || s.alt,
      note: plan.source === "built-in" ? (s.video ? "built-in film" : "built-in photo") : `${shown.has(s.key) ? "" : "hidden "}${s.video ? (s.still ? "video" : "video, no poster") : "image"}`,
      desktopSrc: s.still?.desktop.src ?? null,
      mobileSrc: s.still?.mobile.src ?? null,
      hasText: Boolean(s.content),
    })),
    slides: plan.slides.map(toSlideView),
  };
}

const thumb = (path: string | null) => (path ? mediaUrl(path) : null);

export default async function AdminHeroPage() {
  await requireAdmin();
  let slides: HeroSlideRow[];
  let videoReady: boolean;
  try {
    [slides, videoReady] = await Promise.all([listHeroSlides(), heroVideoMigrationApplied()]);
  } catch (error) {
    return (
      <>
        <AdminHeading title="Hero section" />
        <SetupNotice error={error} migration="content" />
      </>
    );
  }
  const shownSlides = slides.filter((s) => s.active);
  const live = heroPlanFor(shownSlides);
  const withHidden = heroPlanFor(slides);
  const position = new Map(shownSlides.map((s, i) => [s.id, i + 1]));
  const videos = shownSlides.filter((s) => s.mediaType === "video").length;

  return (
    <>
      <AdminHeading
        title="Hero section"
        description={
          shownSlides.length
            ? `${shownSlides.length} slide${shownSlides.length === 1 ? "" : "s"} on the homepage${videos ? ` (${videos} video${videos === 1 ? "" : "s"})` : ""}, in the order below.`
            : "No slide is shown yet, so the homepage plays the built-in film and product photos."
        }
      />
      <div className="space-y-6">
        {!videoReady && (
          <p role="status" className="rounded-[3px] border border-gold/40 bg-gold-pale/40 p-3 text-sm">
            Image slides work as before. To add <strong className="font-medium">video slides</strong>, run <code className="rounded bg-ivory px-1">supabase/migrations/20261026000000_hero_video_and_product_order.sql</code> once in
            Supabase → SQL Editor.
          </p>
        )}

        <Card className="p-5">
          <h2 className="font-serif text-xl">Homepage sequence</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Exactly what visitors see, in order. Videos play once and the slideshow moves on (a single video loops); visitors who can&apos;t play video (reduced motion, data saver, slow
            connection) see its poster instead.
          </p>
          <HeroSequence live={sequenceView(live, slides)} withHidden={sequenceView(withHidden, slides)} hiddenCount={slides.length - shownSlides.length} />
        </Card>

        <Card className="p-5">
          <h2 className="font-serif text-xl">Slides</h2>
          <p className="mt-1 text-sm text-muted">Top to bottom is the homepage order. Hide a slide to take it off the homepage without deleting it.</p>
          <ul className="mt-4 space-y-3">
            {slides.length === 0 && <li className="text-sm text-muted">No slides yet. Add the first one below.</li>}
            {slides.map((s, i) => {
              const isVideo = s.mediaType === "video";
              const desktop = thumb(s.desktopImagePath);
              const mobile = thumb(s.mobileImagePath ?? s.desktopImagePath);
              return (
                <li key={s.id} className="rounded-[3px] border border-line p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand text-sm font-medium tabular-nums text-ink" title={s.active ? `Slide ${position.get(s.id)} on the homepage` : "Not on the homepage"}>
                      {s.active ? position.get(s.id) : "–"}
                    </span>
                    <span className="flex gap-2">
                      {[
                        { src: desktop, cls: "w-[5.6rem]", title: "Desktop" },
                        { src: mobile, cls: "w-[2.4rem]", title: "Mobile" },
                      ].map((t) => (
                        <span key={t.title} title={`${t.title} ${isVideo ? "poster" : "image"}`} className={cn("relative flex h-12 items-center justify-center overflow-hidden rounded-[2px] bg-[#0b1a10]", t.cls)}>
                          {t.src ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                            <img src={t.src} alt="" className="absolute inset-0 size-full object-cover" />
                          ) : (
                            isVideo && s.desktopVideoPath && <video src={`${storageUrl(s.desktopVideoPath)}#t=0.1`} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" aria-hidden />
                          )}
                          {isVideo && <Film className="relative size-4 text-ivory drop-shadow" aria-hidden />}
                        </span>
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{s.heading || s.alt}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          {isVideo ? <Film className="size-3.5" aria-hidden /> : <ImageIcon className="size-3.5" aria-hidden />} {isVideo ? `Video${s.mobileVideoPath ? " (desktop + mobile)" : ""}` : "Image"}
                        </span>
                        {isVideo && !s.desktopImagePath && <span className="text-[#7a5418]">no poster</span>}
                        <span>order {s.sort}</span>
                      </span>
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", s.active ? "bg-botanical/15 text-forest" : "bg-line text-muted")}>{s.active ? "Shown" : "Hidden"}</span>
                    <MoveButtons id={s.id} action={moveHeroSlideAction} first={i === 0} last={i === slides.length - 1} />
                    <RowForm
                      action={setHeroSlideActiveAction}
                      submitLabel={s.active ? "Hide" : "Show"}
                      pendingLabel={s.active ? "Hiding…" : "Showing…"}
                      variant="quiet"
                      confirm={s.active && shownSlides.length === 1 ? "This is the only shown slide: hiding it brings back the built-in film and photos. Hide it?" : undefined}
                      className="flex"
                    >
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={s.active ? "false" : "true"} />
                    </RowForm>
                  </div>
                  <details className="group mt-3 border-t border-line pt-3">
                    <summary className="cursor-pointer list-none text-sm text-forest underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">Edit details</span>
                      <span className="hidden group-open:inline">Close editor</span>
                    </summary>
                    <div className="mt-4">
                      <HeroSlideForm initial={toValues(s)} videoReady={videoReady} />
                      <RowForm
                        action={deleteHeroSlideAction}
                        submitLabel="Delete slide"
                        variant="danger"
                        confirm={`Delete this ${isVideo ? "video" : "image"} slide? Its uploaded files are removed too, unless something else on the website still uses them. This cannot be undone.`}
                        className="mt-4 flex justify-end"
                      >
                        <input type="hidden" name="id" value={s.id} />
                      </RowForm>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
          {shownSlides.length === 0 && (
            <div className="mt-4 rounded-[3px] bg-sand/60 p-3">
              <p className="text-xs font-medium text-ink">Built-in hero now on the homepage</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {heroPlanFor([]).slides.map((s) =>
                  s.still ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                    <img key={s.key} src={s.still.desktop.src} alt={s.alt} title={s.video ? `Film: ${s.alt}` : s.alt} className="h-12 w-[5.6rem] rounded-[2px] bg-sand object-cover" />
                  ) : null,
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                Film: <span className="font-mono">{builtInHero.film.desktop}</span>
                {builtInHero.film.mobile && (
                  <>
                    {" "}
                    (phones: <span className="font-mono">{builtInHero.film.mobile}</span>)
                  </>
                )}
                .
              </p>
            </div>
          )}
        </Card>

        <Card className="border-dashed p-5">
          <h2 className="mb-1 font-serif text-xl">Add a slide</h2>
          <p className="mb-4 text-xs text-muted">Saved hidden unless you tick “Show on the website”. Heading, subtitle and button are optional.</p>
          <NewHeroSlide nextSort={(slides.at(-1)?.sort ?? 0) + 10} videoReady={videoReady} />
        </Card>
      </div>
    </>
  );
}
