import { getImageProps } from "next/image";
import type { HeroPlan, HeroPlanSlide } from "@/lib/content/hero";
import { getHeroPlan } from "@/lib/store/hero";
import { HeroMedia, type HeroStill } from "./hero-video";

/** Responsive sources for one frame: the desktop file from 640 px, the mobile file below (hero-video.tsx Still). */
export function toStill(slide: HeroPlanSlide): HeroStill {
  const common = { sizes: "100vw", quality: 75 };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, alt: slide.alt, src: slide.desktop.src, width: slide.desktop.width, height: slide.desktop.height });
  const {
    props: { srcSet: mobileSrcSet, src, width, height },
  } = getImageProps({ ...common, alt: slide.alt, src: slide.mobile.src, width: slide.mobile.width, height: slide.mobile.height });
  return {
    key: slide.key,
    desktopSrcSet: desktopSrcSet ?? "",
    mobileSrcSet: mobileSrcSet ?? "",
    src,
    width: Number(width),
    height: Number(height),
    alt: slide.alt,
    content: slide.content,
    position: slide.position,
    fit: slide.fit,
  };
}

/**
 * Homepage hero: the film first (over its poster while it loads), then the
 * slideshow — the active /admin/hero slides in their saved order, or the
 * built-in product photos while none is active. One rule for everything
 * (lib/content/hero.ts), shared with the /admin/hero preview.
 */
export async function Hero() {
  return <HeroFrame plan={await getHeroPlan()} />;
}

/**
 * Full-width, media-only frame. Phones get a 4:5 portrait frame (the mobile
 * film's own shape), small tablets 4:3; from 768 px it fills the viewport
 * below the header (at most 75vw tall, so portrait tablets stay landscape-ish).
 * Each breakpoint reserves its height up front, so nothing shifts while media
 * loads. The brand name and tagline remain in the page's visually hidden h1.
 */
export function HeroFrame({ plan }: { plan: HeroPlan }) {
  return (
    <section aria-label="QALBI Naturals" className="bg-[#0b1a10]">
      <HeroMedia
        film={plan.film && { desktop: plan.film.desktop, mobile: plan.film.mobile }}
        poster={toStill(plan.poster)}
        photos={plan.slides.map(toStill)}
        className="aspect-[4/5] w-full sm:aspect-[4/3] md:aspect-auto md:h-[max(26rem,min(calc(100svh-7.5rem),75vw))]"
      />
    </section>
  );
}
