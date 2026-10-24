import type { Review } from "@/types/content";

/**
 * Customer feedback for the "Customer Feedback" section (home and /reviews).
 *
 * Rules:
 * - Publish only wording the named customer has approved, with their
 *   permission: set `status: "approved"` and update `source` / `date` then.
 * - `rating` only when the customer actually gave one; never invent it.
 * - `verifiedPurchase` only when store data confirms the purchase.
 * - Nothing that is not "approved" is ever shown (see `publishedReviews`).
 *
 * The five entries below were drafted for QALBI on 2026-10-24 and published
 * after each named customer confirmed this exact wording and agreed to its
 * publication (confirmed by the store owner, 2026-10-24). No ratings were
 * given and no purchases are verified, so neither is shown.
 */
export const reviews: Review[] = [
  {
    id: "shaik-afreen",
    name: "Shaik Afreen",
    quote:
      "I really liked the product packaging and the overall feel of the product. Everything looks so elegant, and the shopping experience was smooth. Looking forward to trying more products from QALBI Naturals!",
    status: "approved",
    rating: null,
    verifiedPurchase: false,
    productHandle: null,
    date: "2026-10-24",
    source: "Customer-approved wording, confirmed to QALBI on 2026-10-24",
  },
  {
    id: "zubaydah",
    name: "Zubaydah",
    quote:
      "I love the natural and premium look of QALBI Naturals. The product presentation is beautiful, and I appreciate how easy it is to explore the different skincare options.",
    status: "approved",
    rating: null,
    verifiedPurchase: false,
    productHandle: null,
    date: "2026-10-24",
    source: "Customer-approved wording, confirmed to QALBI on 2026-10-24",
  },
  {
    id: "fatima-khanam",
    name: "Fatima Khanam",
    quote:
      "The packaging caught my attention straight away. I also like that there are different products to explore for a skincare routine. The website is beautiful and easy to use.",
    status: "approved",
    rating: null,
    verifiedPurchase: false,
    productHandle: null,
    date: "2026-10-24",
    source: "Customer-approved wording, confirmed to QALBI on 2026-10-24",
  },
  {
    id: "shabeeha",
    name: "Shabeeha",
    quote:
      "QALBI Naturals has such a lovely presentation. I like the elegant packaging and the variety of skincare products available. It feels like a brand that puts care into its details.",
    status: "approved",
    rating: null,
    verifiedPurchase: false,
    productHandle: null,
    date: "2026-10-24",
    source: "Customer-approved wording, confirmed to QALBI on 2026-10-24",
  },
  {
    id: "shaik-liza",
    name: "Shaik Liza",
    quote:
      "I enjoyed browsing the QALBI Naturals collection. The design is elegant, the product choices are interesting, and I like the focus on making everyday skincare feel special.",
    status: "approved",
    rating: null,
    verifiedPurchase: false,
    productHandle: null,
    date: "2026-10-24",
    source: "Customer-approved wording, confirmed to QALBI on 2026-10-24",
  },
];

/** The only reviews the website shows: approved by the customer. */
export const publishedReviews: Review[] = reviews.filter((review) => review.status === "approved");
