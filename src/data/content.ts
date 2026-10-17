import type { InstagramReel, JournalArticle, Review } from "@/types/content";

/**
 * Manually curated Instagram Reels from https://www.instagram.com/qalbinaturals/
 *
 * Used when the Instagram API is not configured. Add only real Reel URLs
 * (https://www.instagram.com/reel/<id>/) with a thumbnail saved under
 * /public/images/reels/. Entries with invalid URLs are dropped at runtime.
 *
 * Example:
 * {
 *   id: "morning-ritual",
 *   title: "Morning Skincare Ritual",
 *   reelUrl: "https://www.instagram.com/reel/XXXXXXXXXXX/",
 *   thumbnailUrl: "/images/reels/morning-ritual.jpg",
 *   alt: "A woman applying QALBI serum during her morning routine",
 * },
 */
export const manualReels: InstagramReel[] = [];

/**
 * Journal articles. Publish only real, approved articles here (or connect a
 * Shopify blog via SHOPIFY_BLOG_HANDLE). Body paragraphs are rendered as text.
 */
export const journalArticles: JournalArticle[] = [];

/**
 * Genuine customer feedback only — with the customer's permission. Never add
 * invented names, quotes or ratings. `verifiedPurchase` must reflect store data.
 */
export const reviews: Review[] = [];

/**
 * About page copy, taken from the approved reference design.
 * QALBI should confirm this wording before launch.
 */
export const aboutContent = {
  eyebrow: "About Us",
  heading: "The Story Behind QALBI",
  paragraphs: [
    "QALBI was born from a simple belief — that true beauty comes from balance.",
    "We bring together natural botanicals and considered formulations to create skincare that nurtures your skin and fits gently into your everyday ritual.",
  ],
  values: [
    { title: "Rooted in Tradition", text: "Inspired by time-honoured skincare rituals" },
    { title: "Thoughtful Formulations", text: "Considered blends of botanicals" },
    { title: "Made with Care", text: "Every product, prepared with intention" },
  ],
} as const;
