import "server-only";
import { images } from "@/data/images";
import { storageUrl } from "@/lib/assets";
import { planHero, type HeroDefaults, type HeroPlan, type HeroSlideSource } from "@/lib/content/hero";
import { getActiveHeroSlides } from "./cms";

/** The hero's code defaults: the film in images.heroFilm, then the built-in product photos (lineup, then single products). */
export const builtInHero: HeroDefaults = {
  film: { enabled: images.heroFilm.approved, desktop: images.heroFilm.desktop, mobile: images.heroFilm.mobile, poster: images.heroFilm.poster },
  slides: [
    // Phones crop the 4:5 lineup top-and-bottom only slightly: favour the bottle caps.
    { key: "built-in-lineup", still: { desktop: images.hero.desktop, mobile: images.hero.mobile }, video: null, alt: images.hero.desktop.alt, content: null, position: "50% 30%", fit: "wide" },
    ...images.heroShowcase.map(({ image, position }) => ({ key: `built-in-${image.src}`, still: { desktop: image, mobile: image }, video: null, alt: image.alt, content: null, position, fit: "square" as const })),
  ],
};

/** The hero for the given slides (shown ones, in display order) — see lib/content/hero.ts. */
export function heroPlanFor(slides: HeroSlideSource[]): HeroPlan {
  return planHero({ slides, defaults: builtInHero, videoUrl: storageUrl });
}

/** What the homepage shows now (cached; refreshed by every /admin/hero save). */
export async function getHeroPlan(): Promise<HeroPlan> {
  return heroPlanFor(await getActiveHeroSlides());
}
