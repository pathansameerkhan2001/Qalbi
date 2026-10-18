import { getImageProps } from "next/image";
import { images } from "@/data/images";
import { mediaUrl } from "@/lib/assets";
import { getActiveHeroSlides } from "@/lib/store/cms";
import type { ImageAsset } from "@/types/content";
import { HeroSlider, type HeroSlide } from "./hero-slider";
import { hasHeroContent, type HeroContent } from "./hero-overlay";

type SlideImage = Pick<ImageAsset, "src" | "alt" | "width" | "height">;

function toSlide({ desktop, mobile }: { desktop: SlideImage; mobile: SlideImage }, content?: HeroContent): HeroSlide {
  const common = { sizes: "100vw", quality: 75 };
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
 * and button; the built-in photography stays image-only.
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
  return <HeroSlider slides={slides} />;
}
