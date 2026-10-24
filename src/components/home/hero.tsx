import { getImageProps } from "next/image";
import { images } from "@/data/images";
import { mediaUrl, storageUrl } from "@/lib/assets";
import { getActiveHeroSlides, type HeroSlideRow } from "@/lib/store/cms";
import type { ImageAsset } from "@/types/content";
import { HeroSlider, type HeroSlide } from "./hero-slider";
import { HeroMedia, type HeroFilmSources, type HeroStill } from "./hero-video";
import { hasHeroContent, type HeroContent } from "./hero-overlay";

type SlideImage = Pick<ImageAsset, "src" | "alt" | "width" | "height">;

function toSlide({ desktop, mobile }: { desktop: SlideImage; mobile: SlideImage }, content?: HeroContent): HeroSlide {
  const common = { sizes: "(min-width: 1600px) 1600px, 100vw", quality: 80 };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, alt: desktop.alt, src: desktop.src, width: desktop.width, height: desktop.height });
  const {
    props: { srcSet: mobileSrcSet, src, width, height },
  } = getImageProps({ ...common, alt: mobile.alt, src: mobile.src, width: mobile.width, height: mobile.height });
  return {
    desktopSrcSet: desktopSrcSet ?? "",
    mobileSrcSet: mobileSrcSet ?? "",
    src,
    width: Number(width),
    height: Number(height),
    alt: desktop.alt,
    content: hasHeroContent(content) ? content : null,
  };
}

const slideContent = (s: HeroSlideRow): HeroContent => ({ heading: s.heading, subtitle: s.subtitle, buttonLabel: s.buttonLabel, buttonHref: s.buttonHref });

/** An uploaded slide's images: recommended 1600×860 (desktop) and 1080×1350 (mobile); frames crop with object-cover. */
const slideImages = (s: HeroSlideRow) => ({
  desktop: { src: mediaUrl(s.desktopImagePath), alt: s.alt, width: 1600, height: 860 },
  mobile: { src: mediaUrl(s.mobileImagePath), alt: s.alt, width: 1080, height: 1350 },
});

/**
 * Homepage hero. With QALBI's approved film (images.heroFilm), the full-width
 * cinematic hero plays it, then a slideshow of the verified product photos.
 * Image-only slides from /admin/hero don't replace the film: the first one
 * becomes its poster (desktop and mobile images), shown at once and kept as
 * the still whenever the film can't play. Slides with their own heading,
 * subtitle or button — or any slides while there is no film — are shown as
 * the admin photo slideshow, as before.
 *
 * Both reserve the aspect ratio for each breakpoint so the page never shifts
 * while images load.
 */
export async function Hero() {
  const managed = await getActiveHeroSlides();
  const film = heroFilmSources();
  const hasText = managed.some((s) => hasHeroContent(slideContent(s)));
  if (managed.length === 0 || (film && !hasText)) return <CinematicHero film={film} posterSlide={managed[0] ?? null} />;
  const slides = managed.map((s) =>
    toSlide(slideImages(s), slideContent(s)),
  );
  return <HeroSlider slides={slides} />;
}

/** The approved hero film's bucket URLs, or null while it is unapproved or Supabase isn't configured. */
function heroFilmSources(): HeroFilmSources | null {
  const film = images.heroFilm;
  const desktop = film.approved ? storageUrl(film.desktop) : null;
  return desktop ? { desktop, mobile: film.mobile ? storageUrl(film.mobile) : null } : null;
}

/**
 * Full-width, media-only hero: the approved film over its poster (the first
 * image-only admin slide, else the film's own first frame), followed by a
 * slideshow of the real product photos — the lineup
 * (images.hero), then single products (images.heroShowcase). Phones get a 4:5
 * portrait frame, small tablets 4:3; from 768 px it fills the viewport below
 * the header (at most 75vw tall, so portrait tablets stay landscape-ish). The
 * brand name and tagline remain in the page's visually hidden h1.
 */
function CinematicHero({ film, posterSlide }: { film: HeroFilmSources | null; posterSlide: HeroSlideRow | null }) {
  const { poster } = images.heroFilm;
  const photos: HeroStill[] = [
    // Phones crop the 4:5 lineup top-and-bottom only slightly: favour the bottle caps.
    { ...toSlide(images.hero), position: "50% 30%", fit: "wide" },
    ...images.heroShowcase.map(({ image, position }) => ({ ...toSlide({ desktop: image, mobile: image }), position, fit: "square" as const })),
  ];
  return (
    <section aria-label="QALBI Naturals" className="bg-[#0b1a10]">
      <HeroMedia
        film={film}
        poster={toSlide(posterSlide ? slideImages(posterSlide) : { desktop: poster.desktop, mobile: poster.mobile ?? poster.desktop })}
        photos={photos}
        className="aspect-[4/5] w-full sm:aspect-[4/3] md:aspect-auto md:h-[max(26rem,min(calc(100svh-7.5rem),75vw))]"
      />
    </section>
  );
}
