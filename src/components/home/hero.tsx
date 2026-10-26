import { getImageProps } from "next/image";
import type { HeroImage, HeroPlan, HeroPlanSlide } from "@/lib/content/hero";
import { getHeroPlan } from "@/lib/store/hero";
import { HeroMedia, type HeroSlideView } from "./hero-video";

const sources = (image: HeroImage) => getImageProps({ alt: image.alt, src: image.src, width: image.width, height: image.height, sizes: "100vw", quality: 75 }).props;

/** Responsive sources for one slide: the desktop file from 640 px, the mobile file below (hero-video.tsx Still). */
export function toSlideView(slide: HeroPlanSlide): HeroSlideView {
  let still: HeroSlideView["still"] = null;
  if (slide.still) {
    const desktop = sources(slide.still.desktop);
    const { srcSet, src, width, height } = sources(slide.still.mobile);
    still = { desktopSrcSet: desktop.srcSet ?? "", mobileSrcSet: srcSet ?? "", src, width: Number(width), height: Number(height) };
  }
  return { key: slide.key, alt: slide.alt, still, video: slide.video, content: slide.content, position: slide.position, fit: slide.fit };
}

/**
 * Homepage hero: the shown /admin/hero slides — images and videos — in their
 * saved order, or the built-in film and product photos while none is shown.
 * One rule for everything (lib/content/hero.ts), shared with the /admin/hero preview.
 */
export async function Hero() {
  return <HeroFrame plan={await getHeroPlan()} />;
}

/**
 * Full-width, media-only frame. Phones get a 4:5 portrait frame (the mobile
 * video's own shape), small tablets 4:3; from 768 px it fills the viewport
 * below the header (at most 75vw tall, so portrait tablets stay landscape-ish).
 * Each breakpoint reserves its height up front, so nothing shifts while media
 * loads. The brand name and tagline remain in the page's visually hidden h1.
 */
export function HeroFrame({ plan }: { plan: HeroPlan }) {
  return (
    <section aria-label="QALBI Naturals" className="bg-[#0b1a10]">
      <HeroMedia slides={plan.slides.map(toSlideView)} className="aspect-[4/5] w-full sm:aspect-[4/3] md:aspect-auto md:h-[max(26rem,min(calc(100svh-7.5rem),75vw))]" />
    </section>
  );
}
