import "server-only";
import { toIstInput } from "@/lib/content/rules";
import type { BlogPostRow } from "@/lib/store/cms";
import type { BlogPostValues } from "./blog-post-form";

export const emptyPost: BlogPostValues = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  category: "",
  author: "",
  coverImagePath: "",
  coverAlt: "",
  seoTitle: "",
  seoDescription: "",
  publishedAt: "",
  status: "draft",
};

export function toPostValues(p: BlogPostRow): BlogPostValues {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    body: p.body,
    category: p.category ?? "",
    author: p.author ?? "",
    coverImagePath: p.coverImagePath ?? "",
    coverAlt: p.coverAlt ?? "",
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    publishedAt: toIstInput(p.publishedAt),
    status: p.status,
  };
}
