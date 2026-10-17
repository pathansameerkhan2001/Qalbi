import type { Collection, Product, ProductImage } from "@/types/commerce";
import type { ImageAsset } from "@/types/content";
import { collectionTitles } from "./categories";
import { images } from "./images";

/**
 * PREVIEW CATALOGUE (used only while Shopify is not configured)
 *
 * Product names, label taglines and key ingredients are taken from QALBI's
 * own packaging and marketing material. Photos are QALBI's own photographs.
 * PRICES ARE NOT CONFIRMED: they are copied from the design reference so the
 * shop can be reviewed, and will be replaced by Shopify prices.
 * Ratings and stock levels are deliberately left empty.
 */

const toImage = (a: ImageAsset): ProductImage => ({ url: a.src, alt: a.alt, width: a.width, height: a.height });

interface PreviewInput {
  handle: string;
  title: string;
  price: number;
  productType: string;
  gallery: ImageAsset[];
  collections: string[];
  description: string;
  ingredients: string | null;
}

const inputs: PreviewInput[] = [
  {
    handle: "multipurpose-booster-serum",
    title: "Multipurpose Booster Serum",
    price: 897,
    productType: "Serums",
    gallery: [images.products.serumStudio, images.products.serumGold, images.products.serumBotanical, images.products.serumCutout, images.products.serum],
    collections: ["serums", "bestsellers"],
    description: "Brightening | Anti-Aging | Hydrating. For day and night use.",
    ingredients: "Key ingredients highlighted by QALBI: Vitamin C, Peptides, Niacinamide, Hyaluronic Acid.",
  },
  {
    handle: "radiance-glow-cream",
    title: "Radiance Glow Cream",
    price: 399,
    productType: "Face Creams & Moisturisers",
    gallery: [
      images.products.radianceStudio,
      images.products.radianceGarden,
      images.products.radianceForest,
      images.products.radianceNoir,
    ],
    collections: ["face-creams-moisturisers", "bestsellers"],
    description: "Repair | Nourish | Brightens. For youthful, smooth & supple skin. All skin types. For day and night use.",
    ingredients: "Enriched with Pearls, Saffron and Sandalwood.",
  },
  {
    handle: "facial-cleanser",
    title: "Facial Cleanser",
    price: 399,
    productType: "Face Wash & Cleansers",
    gallery: [
      images.products.cleanserStudio,
      images.products.cleanserSplash,
      images.products.cleanserCoconut,
      images.products.cleanserRoses,
      images.products.cleanser,
    ],
    collections: ["face-wash-cleansers", "bestsellers"],
    description: "Cleanse | Hydrates | Brightens. All skin types. Net content: 100 g. For day and night use.",
    ingredients:
      "On the label: Kashmiri saffron, Nutmeg & Rose water.\nAlso highlighted by QALBI: Coconut oil, Green tea extract, Rose extract, Saffron extract, Extra virgin olive oil.",
  },
  {
    handle: "moisturizer",
    title: "Moisturizer",
    price: 699,
    productType: "Face Creams & Moisturisers",
    gallery: [images.products.moisturizerStudio, images.products.moisturizerSky, images.products.moisturizerNoir],
    collections: ["face-creams-moisturisers", "bestsellers"],
    description: "Moisturize | Nourish | Glowing. All skin types. Net content: 100 g. For day and night use.",
    ingredients: "Marigold and Vetiver.",
  },
  {
    handle: "anti-aging-cream",
    title: "Anti-Aging Cream",
    price: 599,
    productType: "Face Creams & Moisturisers",
    gallery: [images.products.antiAging],
    collections: ["face-creams-moisturisers", "bestsellers"],
    description: "Plumps | Contour | Restore.",
    ingredients: null,
  },
];

function toProduct(input: PreviewInput, index: number): Product {
  const money = { amount: input.price, currencyCode: "INR" };
  const gallery = input.gallery.map(toImage);
  return {
    id: `dev-product-${input.handle}`,
    handle: input.handle,
    title: input.title,
    description: input.description,
    descriptionHtml: "",
    productType: input.productType,
    tags: [`dev-order-${index}`],
    availableForSale: true,
    featuredImage: gallery[0],
    images: gallery,
    options: [{ name: "Title", values: ["Default Title"] }],
    variants: [
      {
        id: `dev-variant-${input.handle}`,
        title: "Default Title",
        availableForSale: true,
        quantityAvailable: null,
        price: money,
        compareAtPrice: null,
        selectedOptions: [{ name: "Title", value: "Default Title" }],
        image: gallery[0],
      },
    ],
    priceRange: { min: money, max: money },
    compareAtPriceRange: null,
    rating: null,
    ingredients: input.ingredients,
    directions: null,
    warnings: null,
    collectionHandles: input.collections,
  };
}

export const devProducts: Product[] = inputs.map(toProduct);

export const devCollections: Collection[] = Object.entries(collectionTitles).map(([handle, title]) => ({
  id: `dev-collection-${handle}`,
  handle,
  title,
  description: "",
  image: null,
}));
