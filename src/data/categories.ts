import type { Category } from "@/types/content";
import { images } from "./images";

/**
 * QALBI's approved "Shop by Category" set, in display order. With the database
 * catalogue the homepage shows the visible categories from /admin/categories and
 * uses these photos for any category saved without its own image (matched by handle).
 */
export const homeCategories: Category[] = [
  { label: "Face Serums", collectionHandle: "serums", href: "/collections/serums", image: images.shopCategories.faceSerums },
  { label: "Face Wash & Cleansers", collectionHandle: "face-wash-cleansers", href: "/collections/face-wash-cleansers", image: images.shopCategories.faceWash },
  { label: "Face Creams & Moisturizers", collectionHandle: "face-creams-moisturisers", href: "/collections/face-creams-moisturisers", image: images.shopCategories.faceCreams },
  { label: "Scrubs & Face Masks", collectionHandle: "scrubs-face-masks", href: "/collections/scrubs-face-masks", image: images.shopCategories.scrubsMasks },
  { label: "Hair Mask & Shampoo", collectionHandle: "hair-mask-shampoo", href: "/collections/hair-mask-shampoo", image: images.shopCategories.hair },
  { label: "Lip, Eye & Lash Care", collectionHandle: "lip-eye-lash-care", href: "/collections/lip-eye-lash-care", image: images.shopCategories.lipEyeLash },
  { label: "Body & Personal Care", collectionHandle: "body-personal-care", href: "/collections/body-personal-care", image: images.shopCategories.bodyCare },
  { label: "Herbal Tea", collectionHandle: "herbal-tea", href: "/collections/herbal-tea", image: images.shopCategories.herbalTea },
];

/** Readable fallback titles for collection handles (used before Shopify is connected). */
export const collectionTitles: Record<string, string> = {
  serums: "Face Serums",
  "face-creams-moisturisers": "Face Creams & Moisturizers",
  "scrubs-face-masks": "Scrubs & Face Masks",
  "hair-mask-shampoo": "Hair Mask & Shampoo",
  "lip-eye-lash-care": "Lip, Eye & Lash Care",
  "body-personal-care": "Body & Personal Care",
  "herbal-tea": "Herbal Tea",
  "lip-care": "Lip Care",
  "face-wash-cleansers": "Face Wash & Cleansers",
  "toners-face-mists": "Toners & Face Mists",
  "face-masks-exfoliators": "Face Masks & Exfoliators",
  "eye-care": "Eye Care",
  "body-care": "Body Care",
  "skincare-combos-kits": "Skincare Combos & Kits",
  bestsellers: "The QALBI Favourites",
};
