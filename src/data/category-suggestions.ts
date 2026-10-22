/**
 * QALBI's approved category set ("Shop by Category", approved 2026-10-22), offered in
 * /admin/categories → "Suggested categories". Proposals only: an administrator adds
 * them deliberately and each is created HIDDEN, so nothing appears on the website
 * until the store owner shows it. A suggestion whose handle or name already exists
 * is not offered again (the first three reuse the handles the product import created).
 * `basis` records which published products belong in it, so the owner can judge.
 * `imagePath` is the category card photo, cropped from QALBI's own product photography.
 */
export interface CategorySuggestion {
  name: string;
  slug: string;
  description: string;
  imagePath: string | null;
  basis: string;
}

export const suggestedCategories: CategorySuggestion[] = [
  { name: "Face Serums", slug: "serums", description: "Lightweight face serums for your daily ritual.", imagePath: "categories/shop-face-serums.webp", basis: "Multipurpose Booster Serum." },
  { name: "Face Wash & Cleansers", slug: "face-wash-cleansers", description: "Gentle cleansers for fresh, clean skin.", imagePath: "categories/shop-face-wash-cleansers.webp", basis: "Facial Cleanser." },
  { name: "Face Creams & Moisturizers", slug: "face-creams-moisturisers", description: "Creams and moisturizers for day and night.", imagePath: "categories/shop-face-creams-moisturizers.webp", basis: "Radiance Glow Cream, Gentle Moisturiser, Skin Lightening Cream, Anti Aging Cream." },
  { name: "Scrubs & Face Masks", slug: "scrubs-face-masks", description: "Ayurvedic scrubs and masks for your weekly ritual.", imagePath: "categories/shop-scrubs-face-masks.webp", basis: "Ayurvedic Ubtan Face & Body Scrub." },
  { name: "Hair Mask & Shampoo", slug: "hair-mask-shampoo", description: "Herbal hair masks and shampoos for your hair-care ritual.", imagePath: "categories/shop-hair-mask-shampoo.webp", basis: "Kesh Rasayan Hair Mask Powder, Jatamansi Root Care Shampoo." },
  { name: "Lip, Eye & Lash Care", slug: "lip-eye-lash-care", description: "Care for lips, eyes and lashes.", imagePath: "categories/shop-lip-eye-lash-care.webp", basis: "QALBI Lip Balm." },
  { name: "Body & Personal Care", slug: "body-personal-care", description: "Handcrafted care for everyday bathing and body rituals.", imagePath: "categories/shop-body-personal-care.webp", basis: "Ayurvedic Ubtan Soap." },
  { name: "Herbal Tea", slug: "herbal-tea", description: "Herbal infusions from QALBI Naturals.", imagePath: "categories/shop-herbal-tea.webp", basis: "Beau Tea, QALBI Slimming Tea." },
];
