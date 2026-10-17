import type { LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface NavItem extends NavLink {
  children?: NavLink[];
}

export interface AnnouncementMessage {
  id: string;
  text: string;
  href?: string;
}

export interface ImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Development illustration — replace with real QALBI photography before launch. */
  placeholder: boolean;
}

export interface Category {
  label: string;
  /** Shopify collection handle, or null for non-collection destinations. */
  collectionHandle: string | null;
  href: string;
  image: ImageAsset;
}

export interface TrustBadge {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  /**
   * Certification / formulation claims must stay `false` until QALBI has
   * confirmed them. Unverified claim badges are never rendered.
   */
  isClaim: boolean;
  verified: boolean;
}

export interface Ingredient {
  slug: string;
  name: string;
  /** Short neutral description of the botanical. Not a product claim. */
  description: string;
  image: ImageAsset;
  /** Handles of products whose supplied formulation contains this ingredient. */
  productHandles: string[];
}

export interface InstagramReel {
  id: string;
  title: string;
  reelUrl: string;
  thumbnailUrl: string;
  alt: string;
}

export interface JournalArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingMinutes: number | null;
  image: ImageAsset | { src: string; alt: string; width: number; height: number; placeholder?: false };
  /** Plain-text paragraphs. HTML is never injected from this source. */
  body: string[];
  author: string | null;
}

export interface Review {
  id: string;
  name: string;
  quote: string;
  rating: number;
  /** Only set when the purchase was genuinely verified by the store. */
  verifiedPurchase: boolean;
  productHandle: string | null;
  date: string;
  source: string;
}
