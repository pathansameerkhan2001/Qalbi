import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { getBlogPost } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { postToArticle } from "@/lib/store/cms";
import { ArticleView } from "@/components/journal/article-view";

export const metadata: Metadata = { title: "Preview blog post" };

/** Admin-only preview of a post exactly as the article page renders it — drafts included. */
export default async function BlogPostPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const post = await getBlogPost(id);
  if (!post) notFound();
  const live = post.status === "published" && post.publishedAt !== null && new Date(post.publishedAt).getTime() <= new Date().getTime();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-gold-soft/50 bg-gold-pale px-4 py-3 text-sm">
        <span>
          <strong className="font-medium">Preview.</strong> {live ? "This post is live on the website." : "This post is not visible on the website."}
        </span>
        <Link href={`/admin/blog/${post.id}`} className="inline-flex items-center gap-1 text-forest">
          <ArrowLeft className="size-4" aria-hidden /> Back to editing
        </Link>
      </div>
      <div className="overflow-hidden rounded-[3px] border border-line bg-cream">
        {!post.coverImagePath && <p className="px-6 pt-6 text-xs text-[#7a5418]">No cover image yet — it is required to publish.</p>}
        <ArticleView article={postToArticle(post)} />
      </div>
    </>
  );
}
