import { mediaUrl } from "../assets.ts";

/**
 * The homepage hero's one ordering rule, shared by the homepage
 * (components/home/hero.tsx) and the /admin/hero sequence preview, so the
 * administrator previews exactly what visitors get:
 *
 *  1. The film first, when it is switched on and its desktop file resolves to
 *     a URL. Its poster (the admin's, else the film's own first frame) is the
 *     first paint and stays up while the film loads.
 *  2. Then the slideshow: the active /admin/hero slides in their saved order
 *     (sort order, then creation time — the query's order, kept as is). Only
 *     while no slide is active, the built-in product photos.
 *  3. Without a film the slideshow starts straight away; when the film can't
 *     play (reduced motion, data saver, too slow, autoplay refused, error) the
 *     poster gives way to the same slideshow.
 *
 * Built-in photos are never mixed into admin slides, and a slide with a
 * heading, subtitle or button keeps its text over the image.
 *
 * No server-only imports: unit-tested in tests/content.test.mts.
 */

export interface HeroContent {
  heading: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  buttonHref: string | null;
}

export const hasHeroContent = (c: HeroContent | null | undefined): c is HeroContent => Boolean(c && (c.heading || c.subtitle || (c.buttonLabel && c.buttonHref)));

export interface HeroImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** One frame of the slideshow (or the poster). `fit` and `position` keep the product in frame (globals.css, .hero-still). */
export interface HeroPlanSlide {
  key: string;
  desktop: HeroImage;
  mobile: HeroImage;
  alt: string;
  content: HeroContent | null;
  position?: string;
  fit?: "square" | "wide";
}

/** The fields of an /admin/hero slide that the hero uses (lib/store/cms.ts HeroSlideRow). */
export interface HeroSlideSource extends HeroContent {
  id: string;
  desktopImagePath: string;
  mobileImagePath: string;
  alt: string;
}

/** The `hero` store setting (/admin/hero → Hero film). A null path means "use the built-in file". */
export interface HeroFilmSettings {
  filmEnabled: boolean;
  desktopVideoPath: string | null;
  mobileVideoPath: string | null;
  posterDesktopPath: string | null;
  posterMobilePath: string | null;
}

/** Code defaults (src/data/images.ts), used wherever the setting leaves a value empty. */
export interface HeroDefaults {
  film: { enabled: boolean; desktop: string; mobile: string | null; poster: { desktop: HeroImage; mobile: HeroImage | null } };
  slides: HeroPlanSlide[];
}

export interface HeroPlan {
  /** Video URLs, or null when the film is off or can't be resolved. */
  film: { desktop: string; mobile: string | null; desktopPath: string; mobilePath: string | null } | null;
  poster: HeroPlanSlide;
  posterSource: "admin" | "built-in";
  slides: HeroPlanSlide[];
  slidesSource: "admin" | "built-in";
}

/** Upload sizes recommended in /admin/hero; frames crop with object-cover, so these only inform aspect hints. */
export const HERO_SLIDE_SIZE = { desktop: { width: 1600, height: 860 }, mobile: { width: 1080, height: 1350 } } as const;
export const HERO_POSTER_SIZE = { desktop: { width: 1280, height: 720 }, mobile: { width: 720, height: 900 } } as const;

export function adminSlide(s: HeroSlideSource): HeroPlanSlide {
  const content = { heading: s.heading, subtitle: s.subtitle, buttonLabel: s.buttonLabel, buttonHref: s.buttonHref };
  return {
    key: s.id,
    desktop: { src: mediaUrl(s.desktopImagePath), alt: s.alt, ...HERO_SLIDE_SIZE.desktop },
    mobile: { src: mediaUrl(s.mobileImagePath), alt: s.alt, ...HERO_SLIDE_SIZE.mobile },
    alt: s.alt,
    content: hasHeroContent(content) ? content : null,
    // Desktop uploads are 1.86:1 like the built-in lineup: shown whole over a blurred copy where a frame would crop them hard.
    fit: "wide",
  };
}

export function planHero({
  slides,
  settings,
  defaults,
  videoUrl,
}: {
  /** Active slides, already in display order. */
  slides: HeroSlideSource[];
  settings: HeroFilmSettings | null;
  defaults: HeroDefaults;
  /** Bucket path → public URL, or null when storage isn't configured. */
  videoUrl: (path: string) => string | null;
}): HeroPlan {
  const enabled = settings ? settings.filmEnabled : defaults.film.enabled;
  const desktopPath = settings?.desktopVideoPath ?? defaults.film.desktop;
  const mobilePath = settings?.mobileVideoPath ?? defaults.film.mobile;
  const desktop = enabled ? videoUrl(desktopPath) : null;
  const film = desktop ? { desktop, mobile: mobilePath ? videoUrl(mobilePath) : null, desktopPath, mobilePath: mobilePath && videoUrl(mobilePath) ? mobilePath : null } : null;

  const builtInPoster = defaults.film.poster;
  const posterDesktop = settings?.posterDesktopPath
    ? { src: mediaUrl(settings.posterDesktopPath), alt: builtInPoster.desktop.alt, ...HERO_POSTER_SIZE.desktop }
    : builtInPoster.desktop;
  const posterMobile = settings?.posterMobilePath
    ? { src: mediaUrl(settings.posterMobilePath), alt: builtInPoster.desktop.alt, ...HERO_POSTER_SIZE.mobile }
    : (builtInPoster.mobile ?? posterDesktop);

  const managed = slides.map(adminSlide);
  return {
    film,
    poster: { key: "poster", desktop: posterDesktop, mobile: posterMobile, alt: posterDesktop.alt, content: null },
    posterSource: settings?.posterDesktopPath || settings?.posterMobilePath ? "admin" : "built-in",
    slides: managed.length ? managed : defaults.slides,
    slidesSource: managed.length ? "admin" : "built-in",
  };
}
