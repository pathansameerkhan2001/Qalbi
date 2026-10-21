import type { ImageAsset } from "@/types/content";
import { assetUrl } from "@/lib/assets";

/**
 * Central image map — every image on the site is referenced by purpose here.
 *
 * All files are crops of QALBI's own product photographs and studio shots (see
 * scripts/process-images.py for the exact source photo and crop of each).
 * Paths are Supabase Storage object paths in the `qalbi-naturals-media`
 * bucket, mirrored locally under /public/assets.
 */
const photo = (path: string, alt: string, width: number, height: number): ImageAsset => ({
  src: assetUrl(path),
  alt,
  width,
  height,
  placeholder: false,
});

export const images = {
  hero: {
    desktop: photo(
      "hero/homepage-desktop.webp",
      "The QALBI Naturals range: Multipurpose Booster Serum, Radiance Glow Cream, Anti-Aging cream, Facial Cleanser and Moisturizer on marble",
      1600,
      860,
    ),
    mobile: photo("hero/lineup-mobile.webp", "QALBI Radiance Glow Cream, Anti-Aging cream, Facial Cleanser and Moisturizer", 960, 1200),
  },
  /** Additional hero slides: editorial triptychs on desktop, single portraits on phones. */
  heroSlides: [
    {
      desktop: photo("hero/slide-2-desktop.webp", "QALBI Radiance Glow Cream, Facial Cleanser and Moisturizer in studio settings", 1600, 860),
      mobile: photo("hero/slide-2-mobile.webp", "QALBI Radiance Glow Cream on a stone pedestal among white blossoms", 832, 1040),
    },
    {
      desktop: photo("hero/slide-3-desktop.webp", "QALBI Radiance Glow Cream, Skin Lightening Cream and Multipurpose Booster Serum", 1600, 860),
      mobile: photo("hero/slide-3-mobile.webp", "QALBI Facial Cleanser in a splash of water", 832, 1040),
    },
  ],
  about: photo("about/about-forest.webp", "QALBI Radiance Glow Cream on a mossy log among wildflowers", 832, 624),
  ingredients: photo("ingredients/ingredients-hero-saffron.webp", "QALBI Skin Lightening Cream resting on a bed of saffron threads", 704, 600),
  customised: photo("miscellaneous/customised-skincare-studio.webp", "QALBI Skin Lightening Cream on silk with roses by a sunlit window", 704, 850),
  categories: {
    serums: photo("categories/serums-studio.webp", "QALBI Multipurpose Booster Serum on a wooden pedestal", 554, 554),
    faceCreams: photo("categories/face-creams-studio.webp", "QALBI Skin Lightening Cream jar", 600, 600),
    lipCare: photo("categories/lip-care-roses.webp", "Fresh pink roses on silk", 240, 240),
    faceWash: photo("categories/face-wash-studio.webp", "QALBI Facial Cleanser in a water splash", 600, 600),
    faceMasks: photo("categories/face-masks-ubtan.webp", "QALBI Ayurvedic Ubtan Face & Body Scrub pouch", 600, 600),
    combos: photo("categories/combos-collection.webp", "QALBI Booster Serum, Radiance Glow Cream, Facial Cleanser and Moisturizer", 600, 600),
    customised: photo("categories/customised-studio.webp", "QALBI Skin Lightening Cream with roses", 600, 600),
  },
  /** Square crops for the ingredient carousel circles (largest clean region of each source photo). */
  ingredientsList: {
    saffron: photo("ingredients/saffron.webp", "Saffron threads in a wooden bowl", 320, 320),
    rose: photo("ingredients/rose-petals.webp", "Dried rose petals on a wooden table", 400, 400),
    coconut: photo("ingredients/coconut-split.webp", "A freshly split coconut with coconut water", 340, 340),
    cardamom: photo("ingredients/cardamom.webp", "Whole green cardamom pods", 470, 470),
  },
  products: {
    serum: photo("products/multipurpose-booster-serum.webp", "QALBI Multipurpose Booster Serum on marble", 960, 1200),
    cleanser: photo("products/facial-cleanser.webp", "QALBI Facial Cleanser on a sunflower", 960, 1200),
    antiAging: photo("products/anti-aging.webp", "QALBI Anti-Aging cream jar on marble", 960, 1200),
    serumStudio: photo("products/serum-studio.webp", "QALBI Multipurpose Booster Serum on a wooden pedestal", 616, 770),
    serumGold: photo("products/serum-gold.webp", "QALBI Multipurpose Booster Serum on a golden backdrop", 665, 832),
    serumBotanical: photo("products/serum-botanical.webp", "QALBI Multipurpose Booster Serum with chamomile and lemon", 832, 1040),
    serumCutout: photo("products/serum-cutout.webp", "QALBI Multipurpose Booster Serum bottle", 960, 1200),
    radianceStudio: photo("products/radiance-studio.webp", "QALBI Radiance Glow Cream on a stone pedestal over sand", 640, 800),
    radianceGarden: photo("products/radiance-garden.webp", "QALBI Radiance Glow Cream among white blossoms", 665, 832),
    radianceForest: photo("products/radiance-forest.webp", "QALBI Radiance Glow Cream on a mossy log", 832, 1040),
    radianceNoir: photo("products/radiance-noir.webp", "QALBI Radiance Glow Cream bottle", 960, 1200),
    cleanserStudio: photo("products/cleanser-studio.webp", "QALBI Facial Cleanser on a stone in soft sunlight", 720, 900),
    cleanserSplash: photo("products/cleanser-splash.webp", "QALBI Facial Cleanser in a water splash", 832, 1040),
    cleanserCoconut: photo("products/cleanser-coconut.webp", "QALBI Facial Cleanser with fresh coconut", 832, 1040),
    cleanserRoses: photo("products/cleanser-roses.webp", "QALBI Facial Cleanser among pink roses", 832, 1040),
    moisturizerStudio: photo("products/moisturizer-studio.webp", "QALBI Moisturizer on a stone pedestal with blossoms", 616, 770),
    moisturizerSky: photo("products/moisturizer-sky.webp", "QALBI Moisturizer on stones against a pastel sky", 665, 832),
    moisturizerNoir: photo("products/moisturizer-noir.webp", "QALBI Moisturizer on a wooden slice", 832, 1040),
  },
  lookbook: {
    forest: photo("lookbook/ritual-forest.webp", "QALBI Radiance Glow Cream on a mossy log with wildflowers", 832, 1109),
    bloom: photo("lookbook/ritual-bloom.webp", "QALBI Multipurpose Booster Serum with chamomile and lemon", 800, 1000),
    touch: photo("lookbook/ritual-touch.webp", "Hands holding an open jar of QALBI Skin Lightening Cream", 800, 1001),
    sky: photo("lookbook/ritual-sky.webp", "QALBI Moisturizer on stones with roses against a pastel sky", 800, 1000),
  },
  /** 9:16 cards for the Instagram section (link to the QALBI profile). */
  moments: [
    { id: "radiance-garden", title: "Radiance Glow Cream", ...photo("reels/radiance-garden.webp", "QALBI Radiance Glow Cream among white blossoms", 540, 961) },
    { id: "cleanser-splash", title: "Facial Cleanser", ...photo("reels/cleanser-splash.webp", "QALBI Facial Cleanser in a water splash", 540, 961) },
    { id: "skin-lightening-touch", title: "Skin Lightening Cream", ...photo("reels/skin-lightening-touch.webp", "Hands holding an open jar of QALBI Skin Lightening Cream", 540, 961) },
    { id: "cleanser-coconut", title: "Fresh & Clean", ...photo("reels/cleanser-coconut.webp", "QALBI Facial Cleanser with fresh coconut", 540, 961) },
    { id: "moisturizer-sky", title: "Moisturizer", ...photo("reels/moisturizer-sky.webp", "QALBI Moisturizer on stones against a pastel sky", 540, 961) },
    { id: "skin-lightening-duo", title: "Glow Duo", ...photo("reels/skin-lightening-duo.webp", "Two jars of QALBI Skin Lightening Cream held up in hands", 540, 961) },
    { id: "radiance-sand", title: "Your Daily Ritual", ...photo("reels/radiance-sand.webp", "QALBI Radiance Glow Cream on a stone pedestal over sand", 540, 961) },
    { id: "serum-gold", title: "Booster Serum", ...photo("reels/serum-gold.webp", "QALBI Multipurpose Booster Serum on a golden backdrop", 540, 961) },
  ],
} as const;
