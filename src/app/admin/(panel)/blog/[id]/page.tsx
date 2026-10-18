import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { z } from "zod";
import { getBlogPost } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteBlogPostAction } from "@/lib/admin/content-actions";
import { AdminHeading } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/form-bits";
import { BlogPostForm } from "../blog-post-form";
import { toPostValues } from "../shared";

export const metadata: Metadata = { title: "Edit blog post" };

export default async function EditBlogPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [post, { saved }] = await Promise.all([getBlogPost(id), searchParams]);
  if (!post) notFound();

  return (
    <>
      <Link href="/admin/blog" className="mb-4 inline-flex items-center gap-1 text-sm text-forest">
        <ArrowLeft className="size-4" aria-hidden /> All posts
      </Link>
      <AdminHeading title={post.title}>
        <div className="flex items-center gap-4">
          <Link href={`/admin/blog/${post.id}/preview`} className="inline-flex items-center gap-1 text-sm text-forest">
            <Eye className="size-4" aria-hidden /> Preview
          </Link>
          <form action={deleteBlogPostAction}>
            <input type="hidden" name="id" value={post.id} />
            <ConfirmButton message={`Delete “${post.title}”? This cannot be undone.`}>Delete post</ConfirmButton>
          </form>
        </div>
      </AdminHeading>
      {saved && (
        <p role="status" className="mb-4 text-sm text-botanical">
          Post saved.
        </p>
      )}
      <BlogPostForm initial={toPostValues(post)} />
    </>
  );
}
