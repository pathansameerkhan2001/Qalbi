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
  /**
   * Homepage hero film. Videos live only in Supabase Storage (bucket paths
   * below), never in the repository; posters are their first frames, mirrored
   * locally like every other image.
   *
   * ON, temporarily, by the owner's explicit decision (2026-10-23): the
   * current file (1280×720, 14.8 MB) misprints the label as "MULTIPURPOSE
   * ROOSTER SERUM" and should be replaced by a corrected film. Its poster is
   * its own first frame. Phones (< 640 px) get the owner's portrait cut,
   * hero/Mobile_Version.mp4 (720×1280, 14.6 MB, added 2026-10-24; its label
   * also reads garbled, "MULTIMURIGSE BOOTER SEEAM"), with its own first frame
   * as the poster. The hero opens on the film (autoplaying where allowed) and
   * moves on to the product photo slideshow (`images.hero`, then
   * `images.heroShowcase`) when it ends, or straight from the poster when it
   * can't play. While `approved` is false or Supabase isn't configured, the
   * slideshow starts straight away.
   *
   * To replace it: run scripts/encode-hero-video.py on the corrected film with
   * a new --version, upload both MP4s under those new names with Cache-Control
   * max-age=31536000 (never overwrite a published name: browsers and the CDN
   * keep it for a year), point the paths and posters here at them and set
   * `approved: true`. `mobile` is optional (phones then get `desktop`).
   */
  heroFilm: {
    approved: true,
    desktop: "hero/qalbi-naturals-hero.mp4",
    mobile: "hero/Mobile_Version.mp4" as string | null,
    poster: {
      desktop: photo("hero/hero-video-poster.webp", "QALBI Multipurpose Booster Serum under a soft spotlight on deep green", 1280, 720),
      mobile: photo("hero/mobile-version-poster.webp", "QALBI Multipurpose Booster Serum on a stone pedestal among green leaves", 720, 1280) as ImageAsset | null,
    },
  },
  /**
   * Hero slideshow after the lineup photo: one product per square frame from
   * QALBI's own photographs at 1200 px, enough for the widest desktop frame
   * (scripts/process-images.py hero_showcase), with the object-position that
   * keeps the whole product in any frame from 3:5 to 8:5.
   */
  heroShowcase: [
    { image: photo("hero/showcase-radiance.webp", "QALBI Radiance Glow Cream with saffron, rose petals and a sunflower", 1200, 1200), position: "50% 50%" },
    { image: photo("hero/showcase-moisturizer.webp", "QALBI Moisturizer with saffron, rose petals and herbs on a wooden table", 1200, 1200), position: "70% 55%" },
    { image: photo("hero/showcase-anti-aging.webp", "QALBI Anti-Aging cream jar on marble", 1200, 1200), position: "50% 30%" },
  ],
  /** Additional hero slides: editorial triptychs on desktop, single portraits on phones. */
  heroSlides: [
    {
      desktop: photo("hero/slide-2-desktop.webp", "QALBI Radiance Glow Cream and Facial Cleanser in studio settings, and the Moisturizer with saffron and rose petals", 1600, 860),
      mobile: photo("hero/slide-2-mobile.webp", "QALBI Radiance Glow Cream on a stone pedestal among white blossoms", 832, 1040),
    },
    {
      desktop: photo("hero/slide-3-desktop.webp", "QALBI Radiance Glow Cream, Skin Lightening Cream and Multipurpose Booster Serum", 1600, 860),
      mobile: photo("hero/slide-3-mobile.webp", "QALBI Facial Cleanser in a splash of water", 832, 1040),
    },
  ],
  about: photo("about/about-forest.webp", "QALBI Radiance Glow Cream on a mossy log among wildflowers", 832, 624),
  ingredients: photo("ingredients/ingredients-hero-saffron.webp", "QALBI Skin Lightening Cream resting on a bed of saffron threads", 704, 600),
  /** Customised skincare section (home + /customised-skincare): owner-supplied consultation scene, 4:3. The earlier jar photo (miscellaneous/customised-skincare-studio.webp) is kept in the repo. */
  customised: photo("miscellaneous/customised-skincare-consultation.webp", "A QALBI skincare consultant in a cream hijab shows a customer a personalised routine on a tablet, with a QALBI cream jar on a gold tray", 1448, 1086),
  categories: {
    serums: photo("categories/serums-studio.webp", "QALBI Multipurpose Booster Serum on a wooden pedestal", 554, 554),
    faceCreams: photo("categories/face-creams-studio.webp", "QALBI Skin Lightening Cream jar", 600, 600),
    lipCare: photo("categories/lip-care-roses.webp", "Fresh pink roses on silk", 240, 240),
    faceWash: photo("categories/face-wash-studio.webp", "QALBI Facial Cleanser in a water splash", 600, 600),
    faceMasks: photo("categories/face-masks-ubtan.webp", "QALBI Ayurvedic Ubtan Face & Body Scrub pouch", 600, 600),
    combos: photo("categories/combos-collection.webp", "QALBI Booster Serum, Radiance Glow Cream, Facial Cleanser and Moisturizer", 600, 600),
    customised: photo("categories/customised-studio.webp", "QALBI Skin Lightening Cream with roses", 600, 600),
  },
  /** "Shop by Category" cards (4:3), one QALBI product photo per category: scripts/process-category-images.py. */
  shopCategories: {
    faceSerums: photo("categories/shop-face-serums.webp", "QALBI Multipurpose Booster Serum on a wooden pedestal", 723, 542),
    faceWash: photo("categories/shop-face-wash-cleansers.webp", "QALBI Facial Cleanser pump bottle in soft sunlight", 785, 589),
    faceCreams: photo("categories/shop-face-creams-moisturizers.webp", "QALBI Radiance Glow Cream on a stone pedestal", 698, 523),
    scrubsMasks: photo("categories/shop-scrubs-face-masks.webp", "QALBI Ayurvedic Ubtan Face & Body Scrub pouch", 900, 675),
    hair: photo("categories/shop-hair-mask-shampoo.webp", "QALBI Jatamansi Root Care Shampoo bottle", 900, 675),
    lipEyeLash: photo("categories/shop-lip-eye-lash-care.webp", "QALBI Lip Balm jar", 900, 675),
    bodyCare: photo("categories/shop-body-personal-care.webp", "QALBI Ayurvedic Ubtan Soap bar", 900, 675),
    herbalTea: photo("categories/shop-herbal-tea.webp", "QALBI Beau Tea pouch with a cup of rose-red herbal infusion", 900, 675),
  },
  /** Square crops for the ingredient carousel circles (largest clean region of each source photo). */
  ingredientsList: {
    saffron: photo("ingredients/saffron.webp", "Saffron threads in a wooden bowl", 320, 320),
    rose: photo("ingredients/rose-petals.webp", "Dried rose petals on a wooden table", 400, 400),
    coconut: photo("ingredients/coconut-split.webp", "A freshly split coconut with coconut water", 340, 340),
    cardamom: photo("ingredients/cardamom.webp", "Whole green cardamom pods", 470, 470),
    // Public-domain (CC0) photographs, pending owner approval: see assets-source/licensed/LICENSES.md.
    aloeVera: photo("ingredients/aloe-vera.webp", "Fleshy green aloe vera leaves with pale speckles and serrated edges", 600, 600),
    turmeric: photo("ingredients/turmeric.webp", "A heap of bright golden ground turmeric", 600, 600),
    neem: photo("ingredients/neem.webp", "A sprig of fresh green neem leaves with serrated leaflets", 600, 600),
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
    cleanserFlatlay: photo("products/cleanser-flatlay.webp", "QALBI Facial Cleanser with saffron, rose petals and herbs on a wooden table", 828, 1035),
    cleanserRoses: photo("products/cleanser-roses.webp", "QALBI Facial Cleanser among pink roses", 832, 1040),
    moisturizerStudio: photo("products/moisturizer-studio.webp", "QALBI Moisturizer with saffron, rose petals and herbs on a wooden table", 960, 1200),
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
    { id: "cleanser-flatlay", title: "Fresh & Clean", ...photo("reels/cleanser-flatlay.webp", "QALBI Facial Cleanser with saffron, rose petals and herbs on a wooden table", 540, 960) },
    { id: "moisturizer-sky", title: "Moisturizer", ...photo("reels/moisturizer-sky.webp", "QALBI Moisturizer on stones against a pastel sky", 540, 961) },
    { id: "skin-lightening-duo", title: "Glow Duo", ...photo("reels/skin-lightening-duo.webp", "Two jars of QALBI Skin Lightening Cream held up in hands", 540, 961) },
    { id: "radiance-sand", title: "Your Daily Ritual", ...photo("reels/radiance-sand.webp", "QALBI Radiance Glow Cream on a stone pedestal over sand", 540, 961) },
    { id: "serum-gold", title: "Booster Serum", ...photo("reels/serum-gold.webp", "QALBI Multipurpose Booster Serum on a golden backdrop", 540, 961) },
  ],
} as const;
