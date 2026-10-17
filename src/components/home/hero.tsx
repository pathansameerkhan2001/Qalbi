import { getImageProps } from "next/image";
import { images } from "@/data/images";
import { getHeroOverride } from "@/lib/store/content";
import type { ImageAsset } from "@/types/content";
import { HeroSlider, type HeroSlide } from "./hero-slider";

function toSlide({ desktop, mobile }: { desktop: ImageAsset; mobile: ImageAsset }): HeroSlide {
  const common = { sizes: "100vw", quality: 75 };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, alt: desktop.alt, src: desktop.src, width: desktop.width, height: desktop.height });
  const {
    props: { srcSet: mobileSrcSet, src, width, height },
  } = getImageProps({ ...common, alt: mobile.alt, src: mobile.src, width: mobile.width, height: mobile.height });
  return { desktopSrcSet: desktopSrcSet ?? "", mobileSrcSet: mobileSrcSet ?? "", src, width: Number(width), height: Number(height), alt: desktop.alt };
}

/**
 * Full-width photographic hero — intentionally no headline, copy or buttons.
 * Art-directed slides: landscape compositions on tablets/desktop and portrait
 * crops on phones. The container reserves the aspect ratio for each
 * breakpoint so the page never shifts while images load.
 */
export async function Hero() {
  const override = await getHeroOverride();
  const slides = [...(override ? [override] : []), ...images.heroSlides, images.hero].map(toSlide);
  return <HeroSlider slides={slides} />;
}
