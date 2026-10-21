import type { Ingredient } from "@/types/content";
import { images } from "./images";

/**
 * Default ingredient content, used until an administrator adds ingredients in
 * /admin/ingredients (table public.ingredients).
 *
 * Only botanicals QALBI has confirmed. Aloe Vera, Turmeric, Neem and Cardamom were
 * confirmed by QALBI on 2026-10-21 (this supersedes the 2026-10-17 removal of
 * Cardamom). `productHandles` lists only products whose confirmed ingredient
 * information names the ingredient — none is linked without that. Descriptions are
 * neutral notes about the botanical itself, not product claims.
 *
 * Aloe Vera, Turmeric and Neem use public-domain photographs of the botanical
 * itself (assets-source/licensed/LICENSES.md), pending owner approval; the others are
 * crops of QALBI's own photographs. `image: null` makes the card show the line icon.
 * Never substitute unrelated stock photography.
 */
export const ingredients: Ingredient[] = [
  {
    slug: "saffron",
    name: "Saffron",
    description: "Prized stigmas of the crocus flower, long used in traditional Indian beauty rituals.",
    image: images.ingredientsList.saffron,
    icon: "saffron",
    productHandles: ["radiance-glow-cream", "facial-cleanser"],
  },
  {
    slug: "rose",
    name: "Rose",
    description: "Rose petals and rose water, a timeless favourite in gentle skincare rituals.",
    image: images.ingredientsList.rose,
    icon: "rose",
    productHandles: ["facial-cleanser"],
  },
  {
    slug: "coconut",
    name: "Coconut",
    description: "Coconut oil, a nourishing staple of traditional Indian self-care.",
    image: images.ingredientsList.coconut,
    icon: "coconut",
    productHandles: ["facial-cleanser"],
  },
  {
    slug: "aloe-vera",
    name: "Aloe Vera",
    description: "A succulent botanical known for its cooling, soothing gel.",
    image: images.ingredientsList.aloeVera,
    icon: "aloe",
    productHandles: [],
  },
  {
    slug: "turmeric",
    name: "Turmeric",
    description: "Golden turmeric, a treasured ingredient in traditional Indian skincare.",
    image: images.ingredientsList.turmeric,
    icon: "turmeric",
    productHandles: [],
  },
  {
    slug: "neem",
    name: "Neem",
    description: "Neem leaves, valued in traditional botanical skincare for generations.",
    image: images.ingredientsList.neem,
    icon: "neem",
    productHandles: [],
  },
  {
    slug: "cardamom",
    name: "Cardamom",
    description: "Aromatic green cardamom, cherished in traditional botanical rituals.",
    image: images.ingredientsList.cardamom,
    icon: "cardamom",
    productHandles: [],
  },
];
