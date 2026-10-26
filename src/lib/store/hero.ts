import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { images } from "@/data/images";
import { assetSource, assetsBucket, storageUrl } from "@/lib/assets";
import { probeVideo } from "@/lib/admin/hero-media";
import { planHero, type HeroDefaults, type HeroImage, type HeroPlan, type HeroPlanSlide, type HeroSlideSource } from "@/lib/content/hero";
import { STORE_TAG } from "./catalog";
import { getActiveHeroSlides } from "./cms";
import { getSetting } from "./settings";

/** Built-in asset URL → its storage path (/assets/hero/x.webp or …/<bucket>/hero/x.webp → hero/x.webp). */
const pathOf = (src: string) => src.replace(new RegExp(`^.*?(?:/assets/|/public/${assetsBucket}/)`), "");

/**
 * One file of the built-in hero (src/data/images.ts). `location` says where it
 * physically lives: "bucket" files are objects in the Supabase media bucket
 * (an administrator can delete them); "project" files are part of the website
 * itself (public/assets, deployed with every build) and can only be taken off
 * the homepage from the admin panel — the file stays in the project.
 */
export interface BuiltInHeroFile {
  path: string;
  kind: "image" | "video";
  role: string;
  device: "Desktop" | "Mobile" | "Desktop + mobile";
  location: "bucket" | "project";
  /** Where the browser loads it from. */
  url: string | null;
}

const imageFile = (image: HeroImage, role: string, device: BuiltInHeroFile["device"]): BuiltInHeroFile => ({
  path: pathOf(image.src),
  kind: "image",
  role,
  device,
  // With NEXT_PUBLIC_ASSET_SOURCE=supabase the website serves its images from the bucket.
  location: assetSource === "supabase" ? "bucket" : "project",
  url: image.src,
});

const videoFile = (path: string, role: string, device: BuiltInHeroFile["device"]): BuiltInHeroFile => ({ path, kind: "video", role, device, location: "bucket", url: storageUrl(path) });

export function builtInHeroFiles(): BuiltInHeroFile[] {
  const { heroFilm } = images;
  return [
    videoFile(heroFilm.desktop, "Film", "Desktop"),
    ...(heroFilm.mobile ? [videoFile(heroFilm.mobile, "Film", "Mobile")] : []),
    imageFile(heroFilm.poster.desktop, "Film poster", "Desktop"),
    ...(heroFilm.poster.mobile ? [imageFile(heroFilm.poster.mobile, "Film poster", "Mobile")] : []),
    imageFile(images.hero.desktop, "Lineup photo", "Desktop"),
    imageFile(images.hero.mobile, "Lineup photo", "Mobile"),
    ...images.heroShowcase.map(({ image }) => imageFile(image, "Product photo", "Desktop + mobile")),
  ];
}

/**
 * The built-in hero without the given files (removed by an administrator, or
 * missing from the bucket), so the homepage never requests them: a slide
 * keeps whichever of its desktop / mobile files remain (each stands in for the
 * other) and disappears when none does; without its desktop video the film is off.
 */
export function builtInHeroWithout(removed: ReadonlySet<string>): HeroDefaults {
  const keep = (image: HeroImage | null) => (image && !removed.has(pathOf(image.src)) ? image : null);
  const { heroFilm } = images;
  const lineup = { desktop: keep(images.hero.desktop), mobile: keep(images.hero.mobile) };
  const lineupStill = lineup.desktop || lineup.mobile ? { desktop: (lineup.desktop ?? lineup.mobile)!, mobile: (lineup.mobile ?? lineup.desktop)! } : null;
  const slides: HeroPlanSlide[] = [
    // Phones crop the 4:5 lineup top-and-bottom only slightly: favour the bottle caps.
    ...(lineupStill ? [{ key: "built-in-lineup", still: lineupStill, video: null, alt: lineupStill.desktop.alt, content: null, position: "50% 30%", fit: "wide" as const }] : []),
    ...images.heroShowcase
      .filter(({ image }) => keep(image))
      .map(({ image, position }) => ({ key: `built-in-${image.src}`, still: { desktop: image, mobile: image }, video: null, alt: image.alt, content: null, position, fit: "square" as const })),
  ];
  return {
    film: {
      enabled: heroFilm.approved && !removed.has(heroFilm.desktop),
      desktop: heroFilm.desktop,
      mobile: heroFilm.mobile && !removed.has(heroFilm.mobile) ? heroFilm.mobile : null,
      poster: { desktop: keep(heroFilm.poster.desktop), mobile: keep(heroFilm.poster.mobile) },
    },
    slides,
  };
}

/** Everything as shipped (the admin page's "if nothing were removed" reference). */
export const builtInHero: HeroDefaults = builtInHeroWithout(new Set());

/** The hero for the given slides (shown ones, in display order) and removed built-in files — see lib/content/hero.ts. */
export function heroPlanFor(slides: HeroSlideSource[], removed: ReadonlySet<string> = new Set()): HeroPlan {
  return planHero({ slides, defaults: builtInHeroWithout(removed), videoUrl: storageUrl });
}

/** Built-in files the administrator removed from the homepage. */
export async function getRemovedBuiltInHero(): Promise<Set<string>> {
  return new Set((await getSetting("hero"))?.removedBuiltIn ?? []);
}

/**
 * What the homepage shows now (cached; refreshed by every /admin/hero save).
 * While the built-in film would play, its videos are checked in the bucket
 * first: one that is gone (deleted outside the admin panel) is treated as
 * removed, so visitors never request a missing file.
 */
export async function getHeroPlan(): Promise<HeroPlan> {
  const [slides, removed] = await Promise.all([getActiveHeroSlides(), getRemovedBuiltInHero()]);
  const film = images.heroFilm;
  if (slides.length === 0 && film.approved) {
    const videos = [film.desktop, film.mobile].filter((p): p is string => Boolean(p) && !removed.has(p!));
    const missing = await Promise.all(videos.map(async (path) => ((await isMissingFromBucket(path)) ? path : null)));
    for (const path of missing) if (path) removed.add(path);
  }
  return heroPlanFor(slides, removed);
}

/** Whether a bucket object is gone (cached like the rest of the hero; a network problem is not "gone"). */
async function isMissingFromBucket(path: string): Promise<boolean> {
  "use cache";
  cacheLife("minutes");
  cacheTag(STORE_TAG);
  return (await probeVideo(path)).missing === true;
}
