import "server-only";
import { images } from "@/data/images";
import { storageUrl } from "@/lib/assets";
import { planHero, type HeroDefaults, type HeroFilmSettings, type HeroPlan, type HeroSlideSource } from "@/lib/content/hero";
import { getActiveHeroSlides } from "./cms";
import { getSetting } from "./settings";

/** The hero's code defaults: the film in images.heroFilm, then the built-in product photos (lineup, then single products). */
export const builtInHero: HeroDefaults = {
  film: { enabled: images.heroFilm.approved, desktop: images.heroFilm.desktop, mobile: images.heroFilm.mobile, poster: images.heroFilm.poster },
  slides: [
    // Phones crop the 4:5 lineup top-and-bottom only slightly: favour the bottle caps.
    { key: "built-in-lineup", desktop: images.hero.desktop, mobile: images.hero.mobile, alt: images.hero.desktop.alt, content: null, position: "50% 30%", fit: "wide" },
    ...images.heroShowcase.map(({ image, position }) => ({ key: `built-in-${image.src}`, desktop: image, mobile: image, alt: image.alt, content: null, position, fit: "square" as const })),
  ],
};

/** The hero for the given slides (active, in display order) and film setting — see lib/content/hero.ts. */
export function heroPlanFor(slides: HeroSlideSource[], settings: HeroFilmSettings | null): HeroPlan {
  return planHero({ slides, settings, defaults: builtInHero, videoUrl: storageUrl });
}

/** What the homepage shows now (cached; refreshed by every /admin/hero save). */
export async function getHeroPlan(): Promise<HeroPlan> {
  const [slides, settings] = await Promise.all([getActiveHeroSlides(), getSetting("hero")]);
  return heroPlanFor(slides, settings);
}
