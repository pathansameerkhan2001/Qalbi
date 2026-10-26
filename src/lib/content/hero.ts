import { mediaUrl } from "../assets.ts";

/**
 * The homepage hero's one ordering rule, shared by the homepage
 * (components/home/hero.tsx) and the /admin/hero sequence preview, so the
 * administrator previews exactly what visitors get:
 *
 *  • The shown /admin/hero slides — images and videos — in their saved order
 *    (sort order, then creation time: the query's order, kept as is).
 *  • Only while no slide is shown: the built-in film (src/data/images.ts
 *    heroFilm, while approved), then the built-in product photos.
 *
 * Built-in media is never mixed into admin slides. A video slide shows its
 * poster at once, plays when it can and moves on when it ends; when it can't
 * play (reduced motion, data saver, too slow, autoplay refused, error) its
 * poster stands in for it, or it is skipped when it has none
 * (components/home/hero-video.tsx).
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

/**
 * One slide. `still` is the image (image slides) or the poster (video slides;
 * null when it has none). `fit` and `position` keep the product in frame
 * (globals.css, .hero-still).
 */
export interface HeroPlanSlide {
  key: string;
  still: { desktop: HeroImage; mobile: HeroImage } | null;
  video: { desktop: string; mobile: string | null } | null;
  alt: string;
  content: HeroContent | null;
  position?: string;
  fit?: "square" | "wide";
}

/** The fields of an /admin/hero slide that the hero uses (lib/store/cms.ts HeroSlideRow). */
export interface HeroSlideSource extends HeroContent {
  id: string;
  mediaType: "image" | "video";
  desktopImagePath: string | null;
  mobileImagePath: string | null;
  desktopVideoPath: string | null;
  mobileVideoPath: string | null;
  alt: string;
}

/** Code defaults (src/data/images.ts), shown only while no admin slide is. */
export interface HeroDefaults {
  film: { enabled: boolean; desktop: string; mobile: string | null; poster: { desktop: HeroImage | null; mobile: HeroImage | null } };
  slides: HeroPlanSlide[];
}

export interface HeroPlan {
  slides: HeroPlanSlide[];
  source: "admin" | "built-in";
}

/** Upload sizes recommended in /admin/hero; frames crop with object-cover, so these only inform aspect hints. */
export const HERO_SLIDE_SIZE = { desktop: { width: 1600, height: 860 }, mobile: { width: 1080, height: 1350 } } as const;
export const HERO_POSTER_SIZE = { desktop: { width: 1280, height: 720 }, mobile: { width: 720, height: 900 } } as const;

/** Bucket path → public URL, or null when storage isn't configured. */
type VideoUrl = (path: string) => string | null;

export function adminSlide(s: HeroSlideSource, videoUrl: VideoUrl): HeroPlanSlide | null {
  const content = { heading: s.heading, subtitle: s.subtitle, buttonLabel: s.buttonLabel, buttonHref: s.buttonHref };
  const base = { key: s.id, alt: s.alt, content: hasHeroContent(content) ? content : null };
  if (s.mediaType === "video") {
    const desktop = s.desktopVideoPath ? videoUrl(s.desktopVideoPath) : null;
    // A video slide that can't be served is left out rather than shown as an empty frame.
    if (!desktop) return null;
    const posterDesktop = s.desktopImagePath ?? s.mobileImagePath;
    const posterMobile = s.mobileImagePath ?? s.desktopImagePath;
    return {
      ...base,
      video: { desktop, mobile: s.mobileVideoPath ? videoUrl(s.mobileVideoPath) : null },
      still:
        posterDesktop && posterMobile
          ? { desktop: { src: mediaUrl(posterDesktop), alt: s.alt, ...HERO_POSTER_SIZE.desktop }, mobile: { src: mediaUrl(posterMobile), alt: s.alt, ...HERO_POSTER_SIZE.mobile } }
          : null,
    };
  }
  if (!s.desktopImagePath || !s.mobileImagePath) return null;
  return {
    ...base,
    video: null,
    still: { desktop: { src: mediaUrl(s.desktopImagePath), alt: s.alt, ...HERO_SLIDE_SIZE.desktop }, mobile: { src: mediaUrl(s.mobileImagePath), alt: s.alt, ...HERO_SLIDE_SIZE.mobile } },
    // Desktop uploads are 1.86:1 like the built-in lineup: shown whole over a blurred copy where a frame would crop them hard.
    fit: "wide",
  };
}

export function planHero({ slides, defaults, videoUrl }: { slides: HeroSlideSource[]; defaults: HeroDefaults; videoUrl: VideoUrl }): HeroPlan {
  const managed = slides.map((s) => adminSlide(s, videoUrl)).filter((s): s is HeroPlanSlide => s !== null);
  if (managed.length) return { slides: managed, source: "admin" };

  const { film } = defaults;
  const desktop = film.enabled ? videoUrl(film.desktop) : null;
  // Either poster stands in for the other; without both the film plays with no poster (and is skipped where it can't play).
  const posterDesktop = film.poster.desktop ?? film.poster.mobile;
  const posterMobile = film.poster.mobile ?? film.poster.desktop;
  const builtInFilm: HeroPlanSlide[] = desktop
    ? [
        {
          key: "built-in-film",
          video: { desktop, mobile: film.mobile ? videoUrl(film.mobile) : null },
          still: posterDesktop && posterMobile ? { desktop: posterDesktop, mobile: posterMobile } : null,
          alt: (posterDesktop ?? posterMobile)?.alt ?? "QALBI Naturals film",
          content: null,
        },
      ]
    : [];
  return { slides: [...builtInFilm, ...defaults.slides], source: "built-in" };
}

// ---------------------------------------------------------------------------
// Hero video uploads: the same checks in the admin form and on the server
// ---------------------------------------------------------------------------

/** Video types the hero plays everywhere: H.264 MP4 (all browsers), WebM (not older Safari — prefer MP4). */
export const HERO_VIDEO_TYPES: Record<string, "mp4" | "webm"> = { "video/mp4": "mp4", "video/webm": "webm" };

/**
 * Largest hero video an administrator may upload, in bytes. Configurable with
 * NEXT_PUBLIC_HERO_VIDEO_MAX_MB (1–50; default 25). Supabase's standard upload
 * accepts up to 50 MB, and the bucket's own file size limit applies on top.
 */
export function heroVideoMaxBytes(setting: string | undefined = process.env.NEXT_PUBLIC_HERO_VIDEO_MAX_MB): number {
  const mb = Number(setting);
  return (Number.isFinite(mb) && mb >= 1 ? Math.min(mb, 50) : 25) * 1024 * 1024;
}

const megabytes = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/** Problem with a chosen video file before upload, or null. */
export function heroVideoFileProblem(file: { type: string; size: number }, maxBytes = heroVideoMaxBytes()): string | null {
  if (!HERO_VIDEO_TYPES[file.type]) return `This file is ${file.type || "of an unknown type"}. Upload an MP4 (H.264) video${file.type === "video/quicktime" ? " — export the .mov as MP4 first" : ""}.`;
  if (file.size === 0) return "This file is empty.";
  if (file.size > maxBytes) return `This video is ${megabytes(file.size)}; the limit is ${megabytes(maxBytes)}. Compress it (scripts/encode-hero-video.py makes 2–3 MB hero films).`;
  return null;
}

/** The real container from a file's first bytes (the browser-supplied type is not trusted). */
export function sniffVideo(bytes: Uint8Array): "mp4" | "webm" | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  // ISO media with a video brand (AVIF/HEIF images share "ftyp", so those brands are refused).
  if (ascii(4, 8) === "ftyp" && !["avif", "avis", "heic", "heix", "mif1", "msf1"].includes(ascii(8, 12))) return "mp4";
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "webm";
  return null;
}
