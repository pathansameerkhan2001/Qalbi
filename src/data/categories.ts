import type { Category } from "@/types/content";
import { images } from "./images";

/** Homepage "Shop by Category" row. Collection handles must exist in Shopify. */
export const homeCategories: Category[] = [
  { label: "Serums", collectionHandle: "serums", href: "/collections/serums", image: images.categories.serums },
  {
    label: "Face Creams",
    collectionHandle: "face-creams-moisturisers",
    href: "/collections/face-creams-moisturisers",
    image: images.categories.faceCreams,
  },
  { label: "Lip Care", collectionHandle: "lip-care", href: "/collections/lip-care", image: images.categories.lipCare },
  {
    label: "Face Wash",
    collectionHandle: "face-wash-cleansers",
    href: "/collections/face-wash-cleansers",
    image: images.categories.faceWash,
  },
  {
    label: "Face Masks",
    collectionHandle: "face-masks-exfoliators",
    href: "/collections/face-masks-exfoliators",
    image: images.categories.faceMasks,
  },
  {
    label: "Combos",
    collectionHandle: "skincare-combos-kits",
    href: "/collections/skincare-combos-kits",
    image: images.categories.combos,
  },
  {
    label: "Customised Skincare",
    collectionHandle: null,
    href: "/customised-skincare",
    image: images.categories.customised,
  },
];

/** Readable fallback titles for collection handles (used before Shopify is connected). */
export const collectionTitles: Record<string, string> = {
  serums: "Serums",
  "face-creams-moisturisers": "Face Creams & Moisturisers",
  "lip-care": "Lip Care",
  "face-wash-cleansers": "Face Wash & Cleansers",
  "toners-face-mists": "Toners & Face Mists",
  "face-masks-exfoliators": "Face Masks & Exfoliators",
  "eye-care": "Eye Care",
  "body-care": "Body Care",
  "skincare-combos-kits": "Skincare Combos & Kits",
  bestsellers: "The QALBI Favourites",
};
