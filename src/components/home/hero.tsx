import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getImageProps } from "next/image";
import { brandConfig } from "@/data/brand";
import { images } from "@/data/images";
import { mediaUrl } from "@/lib/assets";
import { getActiveHeroSlides } from "@/lib/store/cms";
import type { ImageAsset } from "@/types/content";
import { HeroSlider, type HeroSlide } from "./hero-slider";
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
 * Full-width photographic hero with art-directed slides: landscape on
 * tablets/desktop, portrait crops on phones. The container reserves the aspect
 * ratio for each breakpoint so the page never shifts while images load.
 *
 * Active slides from /admin/hero replace the built-in photography; with none,
 * the built-in slides are shown. Uploaded slides may carry a heading, subtitle
 * and button; the built-in photography is followed by a short brand band with shop links.
 */
export async function Hero() {
  const managed = await getActiveHeroSlides();
  const slides = managed.length
    ? managed.map((s) =>
        toSlide(
          {
            // Uploaded images: recommended 1600×860 (desktop) and 1080×1350 (mobile); the frame crops with object-cover.
            desktop: { src: mediaUrl(s.desktopImagePath), alt: s.alt, width: 1600, height: 860 },
            mobile: { src: mediaUrl(s.mobileImagePath), alt: s.alt, width: 1080, height: 1350 },
          },
          { heading: s.heading, subtitle: s.subtitle, buttonLabel: s.buttonLabel, buttonHref: s.buttonHref },
        ),
      )
    : [...images.heroSlides, images.hero].map((s) => toSlide(s));
  return (
    <>
      <HeroSlider slides={slides} />
      {/* The built-in photography is product-led, so its headline sits below the image rather than over the products. */}
      {managed.length === 0 && <HeroIntro />}
    </>
  );
}

function HeroIntro() {
  return (
    <div className="border-b border-line/70 bg-ivory">
      <div className="mx-auto flex max-w-[1320px] flex-col items-center gap-4 px-4 py-7 text-center sm:px-6 md:flex-row md:justify-between md:gap-8 md:py-8 md:text-left lg:px-10">
        <div>
          <p className="font-serif text-[1.9rem] leading-tight text-forest sm:text-[2.3rem]">
            {brandConfig.tagline.replace(/ Drop$/, "")} <span className="italic text-gold">Drop</span>
          </p>
          <p className="mt-1.5 text-sm text-muted sm:text-[0.95rem]">{brandConfig.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-center gap-3">
          <Link href="/products" className="btn btn-primary">
            Shop the Collection <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/customised-skincare" className="btn btn-outline">
            Personalise Your Ritual
          </Link>
        </div>
      </div>
    </div>
  );
}
