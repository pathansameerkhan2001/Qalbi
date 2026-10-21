import type { AnnouncementMessage, NavItem, NavLink } from "@/types/content";
import { brandConfig } from "./brand";

/**
 * Product category links. Each `/collections/<handle>` must match a Shopify
 * collection handle. Customised Skincare is an enquiry flow, not a collection.
 */
export const productCategoryLinks: NavLink[] = [
  { label: "Serums", href: "/collections/serums" },
  { label: "Face Creams & Moisturisers", href: "/collections/face-creams-moisturisers" },
  { label: "Lip Care", href: "/collections/lip-care" },
  { label: "Face Wash & Cleansers", href: "/collections/face-wash-cleansers" },
  { label: "Toners & Face Mists", href: "/collections/toners-face-mists" },
  { label: "Face Masks & Exfoliators", href: "/collections/face-masks-exfoliators" },
  { label: "Eye Care", href: "/collections/eye-care" },
  { label: "Body Care", href: "/collections/body-care" },
  { label: "Skincare Combos & Kits", href: "/collections/skincare-combos-kits" },
  { label: "Customised Skincare", href: "/customised-skincare" },
];

export const mainNavigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products", children: productCategoryLinks },
  { label: "About Us", href: "/about" },
  { label: "Ingredients", href: "/ingredients" },
  { label: "Blog", href: "/journal" },
  { label: "Contact", href: "/contact" },
];

/** Only add shipping or offer messages here once the real store policy supports them. */
export const announcements: AnnouncementMessage[] = [
  { id: "ritual", text: "Discover Your QALBI Ritual", href: "/about" },
  { id: "collection", text: "Explore Our Skincare Collection", href: "/products" },
  { id: "custom", text: "Personalised skincare on request", href: "/customised-skincare" },
];

/** Footer "Discover" links (pages that always exist). Shop links come from the live collections. */
export const footerExploreLinks: NavLink[] = [
  { label: "About Us", href: "/about" },
  { label: "Ingredients", href: "/ingredients" },
  { label: "The QALBI Journal", href: "/journal" },
  { label: "Customer Feedback", href: "/reviews" },
];

/** Footer "Help" links; policy links are appended only when a policy has content. */
export const footerHelpLinks: NavLink[] = [
  { label: "FAQs", href: "/faqs" },
  { label: "Contact Us", href: "/contact" },
];

export const socialLinks = {
  instagram: brandConfig.instagramUrl,
  whatsapp: brandConfig.whatsappUrl,
  email: brandConfig.emailUrl,
};
