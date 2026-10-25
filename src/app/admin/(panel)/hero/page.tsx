import type { Metadata } from "next";
import { getAllSettings, listHeroSlides } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteHeroSlideAction, moveHeroSlideAction, setHeroSlideActiveAction } from "@/lib/admin/content-actions";
import { HEAVY_VIDEO_BYTES, probeVideo } from "@/lib/admin/hero-media";
import { mediaUrl } from "@/lib/assets";
import type { HeroPlan } from "@/lib/content/hero";
import type { HeroSlideRow } from "@/lib/store/cms";
import { builtInHero, heroPlanFor } from "@/lib/store/hero";
import { heroSettingsSchema } from "@/lib/store/settings";
import { toStill } from "@/components/home/hero";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { MoveButtons } from "@/components/admin/move-buttons";
import { RowForm } from "@/components/admin/row-form";
import { cn } from "@/lib/utils";
import { HeroSlideForm, NewHeroSlide, type HeroSlideValues } from "./hero-slide-form";
import { HeroFilmForm, type VideoStatus } from "./hero-film-form";
import { HeroSequence, type SequenceView } from "./hero-sequence";

export const metadata: Metadata = { title: "Hero section" };

const toValues = (s: HeroSlideRow): HeroSlideValues => ({
  id: s.id,
  heading: s.heading ?? "",
  subtitle: s.subtitle ?? "",
  buttonLabel: s.buttonLabel ?? "",
  buttonHref: s.buttonHref ?? "",
  desktopImagePath: s.desktopImagePath,
  mobileImagePath: s.mobileImagePath,
  alt: s.alt,
  sort: s.sort,
  active: s.active,
});

/** The plan as preview tiles plus the real hero's props. */
function sequenceView(plan: HeroPlan, slides: HeroSlideRow[]): SequenceView {
  const active = new Set(slides.filter((s) => s.active).map((s) => s.id));
  const film = plan.film
    ? [
        {
          key: "film",
          kind: "film" as const,
          label: "Film",
          note: plan.posterSource === "admin" ? "your poster while it loads" : "its first frame while it loads",
          desktopSrc: plan.poster.desktop.src,
          mobileSrc: plan.poster.mobile.src,
          hasText: false,
        },
      ]
    : [];
  return {
    tiles: [
      ...film,
      ...plan.slides.map((s) => ({
        key: s.key,
        kind: "slide" as const,
        label: s.content?.heading || s.alt,
        note: plan.slidesSource === "built-in" ? "built-in photo" : active.has(s.key) ? "slide" : "hidden slide",
        desktopSrc: s.desktop.src,
        mobileSrc: s.mobile.src,
        hasText: Boolean(s.content),
      })),
    ],
    film: plan.film && { desktop: plan.film.desktop, mobile: plan.film.mobile },
    poster: toStill(plan.poster),
    photos: plan.slides.map(toStill),
  };
}

async function videoStatus(path: string | null, builtIn: boolean): Promise<VideoStatus> {
  if (!path) return { path, builtIn, bytes: null, problem: null, heavy: false };
  const probe = await probeVideo(path);
  return { path, builtIn, bytes: probe.bytes, problem: probe.problem, heavy: (probe.bytes ?? 0) > HEAVY_VIDEO_BYTES };
}

export default async function AdminHeroPage() {
  await requireAdmin();
  let slides: HeroSlideRow[];
  let settingsRaw: unknown;
  try {
    [slides, settingsRaw] = await Promise.all([listHeroSlides(), getAllSettings().then((all) => all.hero)]);
  } catch (error) {
    return (
      <>
        <AdminHeading title="Hero section" />
        <SetupNotice error={error} migration="content" />
      </>
    );
  }
  const parsedSettings = settingsRaw === undefined ? null : heroSettingsSchema.safeParse(settingsRaw);
  const settings = parsedSettings?.success ? parsedSettings.data : null;
  const live = heroPlanFor(
    slides.filter((s) => s.active),
    settings,
  );
  const withHidden = heroPlanFor(slides, settings);
  const activeCount = slides.filter((s) => s.active).length;
  const desktopPath = settings?.desktopVideoPath ?? builtInHero.film.desktop;
  const mobilePath = settings?.mobileVideoPath ?? builtInHero.film.mobile;
  const [desktopVideo, mobileVideo] = await Promise.all([videoStatus(desktopPath, !settings?.desktopVideoPath), videoStatus(mobilePath, !settings?.mobileVideoPath)]);
  const filmOn = settings ? settings.filmEnabled : builtInHero.film.enabled;

  const summary = [
    live.film ? "The film plays first" : filmOn ? "The film is on but can't be served (see Hero film)" : "The film is off",
    activeCount ? `then your ${activeCount} slide${activeCount === 1 ? "" : "s"} in the order below` : "then the built-in product photos (no slide is shown yet)",
  ].join(", ");

  return (
    <>
      <AdminHeading title="Hero section" description={`${summary}.`} />
      <div className="space-y-6">
        {parsedSettings && !parsedSettings.success && (
          <p role="alert" className="rounded-[3px] border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
            The saved film settings could not be read, so the homepage uses the built-in film. Saving the Hero film form below replaces them.
          </p>
        )}

        <Card className="p-5">
          <h2 className="font-serif text-xl">Homepage sequence</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Exactly what visitors see, in order. The film plays once, then the slideshow; visitors who can&apos;t play it (reduced motion, data saver, slow connection) go from the poster straight to
            the slideshow.
          </p>
          <HeroSequence live={sequenceView(live, slides)} withHidden={sequenceView(withHidden, slides)} hiddenCount={slides.length - activeCount} />
        </Card>

        <Card className="p-5">
          <h2 className="font-serif text-xl">Hero film</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Desktop and phones each download only their own video, and only once the page has loaded and the visitor can play it.</p>
          <HeroFilmForm
            initial={settings ?? { ...heroSettingsSchema.parse({}), filmEnabled: builtInHero.film.enabled }}
            defaults={{ desktop: builtInHero.film.desktop, mobile: builtInHero.film.mobile }}
            desktop={desktopVideo}
            mobile={mobileVideo}
            posterDefaults={{ desktop: pathOf(builtInHero.film.poster.desktop.src), mobile: builtInHero.film.poster.mobile ? pathOf(builtInHero.film.poster.mobile.src) : null }}
          />
        </Card>

        <Card className="p-5">
          <h2 className="font-serif text-xl">Slideshow images</h2>
          <p className="mt-1 text-sm text-muted">
            Shown after the film, top to bottom. Hide a slide to take it off the homepage without deleting it.{" "}
            {activeCount === 0 && "While no slide is shown, the homepage uses the built-in product photos."}
          </p>
          <ul className="mt-4 space-y-3">
            {slides.length === 0 && <li className="text-sm text-muted">No slides yet. Add the first one below.</li>}
            {slides.map((s, i) => (
              <li key={s.id} className="rounded-[3px] border border-line p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                    <img src={mediaUrl(s.desktopImagePath)} alt="" title="Desktop image" className="h-12 w-[5.6rem] rounded-[2px] bg-sand object-cover" />
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                    <img src={mediaUrl(s.mobileImagePath)} alt="" title="Mobile image" className="h-12 w-[2.4rem] rounded-[2px] bg-sand object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{s.heading || s.alt}</span>
                    <span className="text-xs text-muted">
                      {s.active ? `Slide ${slides.slice(0, i + 1).filter((x) => x.active).length} on the homepage` : "Not on the homepage"} · order {s.sort}
                    </span>
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", s.active ? "bg-botanical/15 text-forest" : "bg-line text-muted")}>{s.active ? "Shown" : "Hidden"}</span>
                  <MoveButtons id={s.id} action={moveHeroSlideAction} first={i === 0} last={i === slides.length - 1} />
                  <RowForm
                    action={setHeroSlideActiveAction}
                    submitLabel={s.active ? "Hide" : "Show"}
                    pendingLabel={s.active ? "Hiding…" : "Showing…"}
                    variant="quiet"
                    confirm={s.active && activeCount === 1 ? "This is the only shown slide: hiding it brings back the built-in product photos. Hide it?" : undefined}
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
                    <HeroSlideForm initial={toValues(s)} />
                    <RowForm action={deleteHeroSlideAction} submitLabel="Delete slide" variant="danger" confirm="Delete this slide? Its images stay in the Media library." className="mt-4 flex justify-end">
                      <input type="hidden" name="id" value={s.id} />
                    </RowForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          {activeCount === 0 && (
            <div className="mt-4 rounded-[3px] bg-sand/60 p-3">
              <p className="text-xs font-medium text-ink">Built-in photos now on the homepage</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {builtInHero.slides.map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                  <img key={s.key} src={s.desktop.src} alt={s.alt} title={s.alt} className="h-12 w-[5.6rem] rounded-[2px] bg-sand object-cover" />
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="border-dashed p-5">
          <h2 className="mb-1 font-serif text-xl">Add a slide</h2>
          <p className="mb-4 text-xs text-muted">Saved hidden unless you tick “Show on the website”. Heading, subtitle and button are optional; without them the slide is image only.</p>
          <NewHeroSlide nextSort={(slides.at(-1)?.sort ?? 0) + 10} />
        </Card>
      </div>
    </>
  );
}

/** Built-in asset URL → its bucket path, for hints (…/hero/x.webp → hero/x.webp). */
const pathOf = (src: string) => src.replace(/^.*?\/(?=hero\/)/, "");
