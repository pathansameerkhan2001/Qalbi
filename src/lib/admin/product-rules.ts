import { z } from "zod";
import { isMediaPath } from "../content/rules.ts";

/**
 * Server-side rules for products saved in /admin/products. Pure (no server-only
 * imports) so they are unit-tested in tests/products.test.mts. The database
 * enforces the same limits again with check constraints.
 */

const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

/** Rupees with at most two decimals (numeric(10,2) in the database). */
export const money = z.coerce
  .number("Enter an amount")
  .min(0, "Must be 0 or more")
  .max(1_000_000, "Must be under ₹10,00,000")
  .refine((v) => Number.isInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most two decimals");

/** Storage object path (products/serum.webp, uploads/…) or an https URL. */
export const imagePath = z
  .string()
  .trim()
  .max(300)
  .refine((v) => isMediaPath(v) || /^https:\/\/[^\s<>"']+$/.test(v), "Enter a media path such as products/serum.webp");

const handleField = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(100);

export const productSchema = z
  .object({
    id: z.union([z.uuid(), z.literal("")]),
    slug: handleField,
    name: z.string().trim().min(1, "Enter a name").max(120),
    description: z.string().trim().max(4000, "Keep the description under 4,000 characters"),
    price: money,
    compare_at_price: z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v)),
    stock_quantity: z
      .union([z.literal(""), z.coerce.number().int("Use a whole number").min(0, "Must be 0 or more").max(100000)])
      .transform((v) => (v === "" ? null : v)),
    sku: z.string().trim().max(64).transform((v) => v || null),
    category_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    is_published: checkbox,
    is_featured: checkbox,
    is_best_seller: checkbox,
    images: z.array(z.object({ path: imagePath, alt: z.string().trim().max(200) })).max(20, "Up to 20 images"),
    seo_title: z.string().trim().max(120, "Keep the SEO title under 120 characters").transform((v) => v || null),
    seo_description: z.string().trim().max(320, "Keep the meta description under 320 characters").transform((v) => v || null),
  })
  .superRefine((p, ctx) => {
    if (p.compare_at_price !== null && p.compare_at_price <= p.price) {
      ctx.addIssue({ code: "custom", path: ["compare_at_price"], message: "Compare-at price must be higher than the price" });
    }
    // A product can be saved as a draft while details are still being confirmed,
    // but it is shown to customers only with a real price and a photo.
    if (p.is_published && p.price <= 0) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Set the real price before publishing" });
    }
    if (p.is_published && p.images.length === 0) {
      ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one photo before publishing" });
    }
  });

export type ProductInput = z.infer<typeof productSchema>;

/** Reasons a stored product may not be published yet (empty = ready). Checked on the server. */
export function publishBlockers(p: { name: string; price: number; imageCount: number }): string[] {
  const blockers: string[] = [];
  if (!p.name.trim()) blockers.push("add a name");
  if (!(p.price > 0)) blockers.push("set the real price");
  if (p.imageCount < 1) blockers.push("add at least one photo");
  return blockers;
}

/** How a product appears to customers, from the fields the database stores. */
export function productVisibility(p: { published: boolean; inventory: number | null }): "draft" | "on-sale" | "out-of-stock" {
  if (!p.published) return "draft";
  return p.inventory === null || p.inventory > 0 ? "on-sale" : "out-of-stock";
}
