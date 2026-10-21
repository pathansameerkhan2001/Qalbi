/**
 * Proposed categories for /admin/categories → "Suggested categories". Proposals only:
 * an administrator adds each one deliberately, and it is always created HIDDEN, so
 * nothing appears on the website until the store owner shows it. `basis` records what
 * the website already holds for it, so the owner can judge whether QALBI sells it.
 * `imagePath` is QALBI's own photo for the category, where one exists.
 */
export interface CategorySuggestion {
  name: string;
  slug: string;
  description: string;
  imagePath: string | null;
  basis: string;
}

export const suggestedCategories: CategorySuggestion[] = [
  { name: "Face Wash & Cleansers", slug: "face-wash-cleansers", description: "Gentle daily cleansers for fresh, clean skin.", imagePath: "categories/face-wash-studio.webp", basis: "Facial Cleanser is in the catalogue." },
  { name: "Serums", slug: "serums", description: "Lightweight serums for your daily ritual.", imagePath: "categories/serums-studio.webp", basis: "Multipurpose Booster Serum is in the catalogue." },
  { name: "Face Creams & Moisturisers", slug: "face-creams-moisturisers", description: "Creams and moisturisers for day and night.", imagePath: "categories/face-creams-studio.webp", basis: "Radiance Glow Cream, Moisturizer and Anti-Aging Cream are in the catalogue." },
  { name: "Lip Care", slug: "lip-care", description: "", imagePath: "categories/lip-care-roses.webp", basis: "Listed on the earlier website design; no lip product is in the catalogue yet." },
  { name: "Face Masks & Treatments", slug: "face-masks-treatments", description: "", imagePath: "categories/face-masks-ubtan.webp", basis: "QALBI's photos show the Ayurvedic Ubtan Face & Body Scrub; it is not in the catalogue yet." },
  { name: "Gift Sets & Combos", slug: "gift-sets-combos", description: "", imagePath: "categories/combos-collection.webp", basis: "Listed on the earlier website design as Combos; no set is in the catalogue yet." },
  { name: "Sunscreen", slug: "sunscreen", description: "", imagePath: null, basis: "No sunscreen product or photo on the website — add only if QALBI sells one." },
  { name: "Body Care", slug: "body-care", description: "", imagePath: null, basis: "Only the Ubtan Face & Body Scrub (pictured, not in the catalogue) relates to it — add only if QALBI sells body care." },
  { name: "Hair Care", slug: "hair-care", description: "", imagePath: null, basis: "No hair-care product or photo on the website — add only if QALBI sells one." },
  { name: "New Arrivals", slug: "new-arrivals", description: "", imagePath: null, basis: "A curated collection: assign new products to it yourself." },
];
