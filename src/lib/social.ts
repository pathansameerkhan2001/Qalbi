import { brandConfig } from "@/data/brand";

/**
 * Link-preview card (WhatsApp, Facebook, X…): the official logo centred on ivory, 1200×630.
 * Served from /public so it never depends on the storage bucket. Change the file name when
 * the artwork changes, because platforms cache preview images by URL.
 */
export const socialImage = {
  url: "/social/qalbi-share.png",
  width: 1200,
  height: 630,
  alt: `${brandConfig.name} — ${brandConfig.tagline}`,
  type: "image/png",
};

/**
 * Site-wide Open Graph defaults. A page that sets its own `openGraph` replaces these whole
 * (Next merges metadata shallowly), so pages spread them in to keep the site name and logo card.
 */
export const siteOpenGraph = {
  type: "website" as const,
  siteName: brandConfig.name,
  title: `${brandConfig.name} — ${brandConfig.tagline}`,
  description: brandConfig.description,
  locale: "en_IN",
  images: [socialImage],
};
