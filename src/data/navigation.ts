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

export const footerNavigation: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "All Products", href: "/products" },
      { label: "Serums", href: "/collections/serums" },
      { label: "Face Creams", href: "/collections/face-creams-moisturisers" },
      { label: "Combos & Kits", href: "/collections/skincare-combos-kits" },
      { label: "Customised Skincare", href: "/customised-skincare" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Ingredients", href: "/ingredients" },
      { label: "Blog", href: "/journal" },
      { label: "Customer Feedback", href: "/reviews" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQs", href: "/faqs" },
      { label: "Shipping", href: "/policies/shipping-policy" },
      { label: "Returns & Refunds", href: "/policies/refund-policy" },
      { label: "Privacy Policy", href: "/policies/privacy-policy" },
      { label: "Terms & Conditions", href: "/policies/terms-of-service" },
    ],
  },
];

export const socialLinks = {
  instagram: brandConfig.instagramUrl,
  whatsapp: brandConfig.whatsappUrl,
  email: brandConfig.emailUrl,
};
