import { assetUrl } from "@/lib/assets";

/**
 * Official QALBI Naturals business details. This is the single source of
 * truth — never hard-code these values elsewhere in the application.
 */
export const brandConfig = {
  name: "QALBI Naturals",
  shortName: "QALBI",
  tagline: "Elegance in Every Drop",
  description:
    "Thoughtfully crafted skincare essentials for your everyday self-care ritual.",
  email: "qalbinaturals@gmail.com",
  emailUrl: "mailto:qalbinaturals@gmail.com",
  whatsappNumber: "+91 90325 43737",
  /** International number without spaces or symbols, used by wa.me and tel: links. */
  whatsappDigits: "919032543737",
  whatsappUrl: "https://wa.me/919032543737",
  phoneUrl: "tel:+919032543737",
  instagramHandle: "@qalbinaturals",
  instagramUrl: "https://www.instagram.com/qalbinaturals/",
  /** Profile link exactly as supplied by QALBI (contains a share parameter). Kept as the source reference. */
  instagramSuppliedUrl: "https://www.instagram.com/qalbinaturals?xtok=MWo1cWxzbjdzZ2R4NA==",
  defaultWhatsappMessage:
    "Hello QALBI Naturals, I would like to know more about your skincare products.",
  currencyCode: "INR",
  locale: "en-IN",
} as const;

/** Official QALBI logo (transparent PNG made from the client's gold-on-black logo file). */
export const brandAssets: { logoSrc: string | null; logoLosslessSrc: string | null; logoMaskSrc: string | null; logoWidth: number; logoHeight: number } = {
  logoSrc: assetUrl("brand/qalbi-logo.png"),
  /** The same logo, pixel for pixel, as lossless WebP (119 KB vs 161 KB): shown as-is where it is not passed through next/image. */
  logoLosslessSrc: assetUrl("brand/qalbi-logo.webp"),
  /** 2x alpha silhouette of the same logo, painted with a metallic gold gradient in CSS (lossless WebP: 46 KB vs 100 KB as PNG). */
  logoMaskSrc: assetUrl("brand/qalbi-logo-mask.webp"),
  logoWidth: 1068,
  logoHeight: 450,
};

/** Link to the downloadable ingredients PDF once QALBI supplies it (e.g. "/documents/qalbi-ingredients.pdf"). */
export const ingredientsPdfUrl: string | null = null;
