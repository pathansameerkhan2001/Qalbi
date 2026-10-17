import type { Ingredient } from "@/types/content";
import { images } from "./images";

/**
 * Default ingredient content (used until an administrator edits it in /admin/ingredients).
 *
 * Only botanicals QALBI has confirmed. `productHandles` lists only products whose
 * confirmed ingredient information names the ingredient. Descriptions are neutral
 * notes about the botanical itself, not product claims.
 *
 * Cardamom, Manjistha and Licorice were removed at QALBI's request (2026-10-17):
 * do not reintroduce them in copy or imagery unless QALBI confirms the formulation.
 */
export const ingredients: Ingredient[] = [
  {
    slug: "saffron",
    name: "Saffron",
    description: "Prized stigmas of the crocus flower, long used in traditional Indian beauty rituals.",
    image: images.ingredientsList.saffron,
    productHandles: ["radiance-glow-cream", "facial-cleanser"],
  },
  {
    slug: "rose",
    name: "Rose",
    description: "Rose petals and rose water, a timeless favourite in gentle skincare rituals.",
    image: images.ingredientsList.rose,
    productHandles: ["facial-cleanser"],
  },
  {
    slug: "coconut",
    name: "Coconut",
    description: "Coconut oil, a nourishing staple of traditional Indian self-care.",
    image: images.ingredientsList.coconut,
    productHandles: ["facial-cleanser"],
  },
];
