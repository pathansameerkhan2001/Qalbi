import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getImageProps } from "next/image";
import { brandConfig } from "@/data/brand";
import { images } from "@/data/images";
import { mediaUrl, storageUrl } from "@/lib/assets";
import { getActiveHeroSlides } from "@/lib/store/cms";
import type { ImageAsset } from "@/types/content";
import { SprigOrnament } from "@/components/ui/botanical-icons";
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

/**
 * Homepage hero. Active slides from /admin/hero always take priority (photo
 * slideshow with their own heading, subtitle and button). Otherwise the
 * editorial split hero is shown: QALBI's film once approved (images.heroFilm),
 * then a slideshow of the verified product photos.
 *
 * The slideshow container reserves the aspect ratio for each breakpoint so the
 * page never shifts while images load.
 */
export async function Hero() {
  const managed = await getActiveHeroSlides();
  if (managed.length === 0) return <EditorialHero />;
  const slides = managed.map((s) =>
    toSlide(
      {
        // Uploaded images: recommended 1600×860 (desktop) and 1080×1350 (mobile); the frame crops with object-cover.
        desktop: { src: mediaUrl(s.desktopImagePath), alt: s.alt, width: 1600, height: 860 },
        mobile: { src: mediaUrl(s.mobileImagePath), alt: s.alt, width: 1080, height: 1350 },
      },
      { heading: s.heading, subtitle: s.subtitle, buttonLabel: s.buttonLabel, buttonHref: s.buttonHref },
    ),
  );
  return <HeroSlider slides={slides} />;
}

function HeroTagline({ className }: { className?: string }) {
  return (
    <p className={className}>
      {brandConfig.tagline.replace(/ Drop$/, "")} <span className="italic text-gold">Drop</span>
    </p>
  );
}

function HeroActions({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Link href="/products" className="btn btn-primary">
        Shop the Collection <ArrowRight className="size-4" aria-hidden />
      </Link>
      <Link href="/customised-skincare" className="btn btn-outline">
        Personalise Your Ritual
      </Link>
    </div>
  );
}

/** The approved hero film's bucket URLs, or null while it is unapproved or Supabase isn't configured. */
function heroFilmSources(): HeroFilmSources | null {
  const film = images.heroFilm;
  const desktop = film.approved ? storageUrl(film.desktop) : null;
  return desktop ? { desktop, mobile: film.mobile ? storageUrl(film.mobile) : null } : null;
}

/**
 * Visual on the right (bleeding to the viewport edge), copy on cream on the
 * left, aligned with the page container. Phones show the visual first in a 6:5
 * frame with the copy and buttons below it. The visual is the approved film
 * (over its first frame), followed by a slideshow of the real product photos:
 * the lineup (images.hero), then single products (images.heroShowcase). All
 * are cropped with object-cover, never stretched.
 */
function EditorialHero() {
  const film = heroFilmSources();
  const { poster } = images.heroFilm;
  const photos: HeroStill[] = [
    // The lineup is cropped top-and-bottom only in the 6:5 phone frame: favour the bottle caps.
    { ...toSlide(images.hero), position: "50% 30%" },
    ...images.heroShowcase.map(({ image, position }) => ({ ...toSlide({ desktop: image, mobile: image }), position })),
  ];
  return (
    <section aria-label="QALBI Naturals" className="border-b border-line/70 bg-cream">
      <div className="grid md:h-[clamp(30rem,calc(100svh-7.5rem),46rem)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:grid-cols-[minmax(0,4.6fr)_minmax(0,7.4fr)]">
        <div className="flex flex-col items-center justify-center px-5 pb-9 pt-7 text-center sm:px-8 md:items-start md:py-12 md:pl-[max(1.5rem,calc((100vw-1320px)/2+2.5rem))] md:pr-10 md:text-left lg:pr-14">
          <SprigOrnament className="hidden text-gold md:block" />
          <HeroTagline className="font-serif text-[2.35rem] leading-[1.04] text-forest text-balance sm:text-[2.8rem] md:mt-5 lg:text-[3.6rem] xl:text-[4.1rem]" />
          <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-muted md:mt-5 lg:max-w-md lg:text-base">{brandConfig.description}</p>
          <HeroActions className="mt-6 flex flex-wrap justify-center gap-3 md:mt-8 md:justify-start" />
        </div>
        <HeroMedia film={film} poster={toSlide({ desktop: poster.desktop, mobile: poster.mobile ?? poster.desktop })} photos={photos} className="order-first aspect-[6/5] sm:aspect-[16/10] md:order-none md:aspect-auto md:h-full" />
      </div>
    </section>
  );
}
