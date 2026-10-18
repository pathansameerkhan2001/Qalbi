import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminHeading } from "@/components/admin/ui";
import { BlogPostForm } from "../blog-post-form";
import { emptyPost } from "../shared";

export const metadata: Metadata = { title: "New blog post" };

export default async function NewBlogPostPage() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/blog" className="mb-4 inline-flex items-center gap-1 text-sm text-forest">
        <ArrowLeft className="size-4" aria-hidden /> All posts
      </Link>
      <AdminHeading title="New blog post" description="Only publish information you can stand behind — no unverified product, ingredient or medical claims." />
      <BlogPostForm initial={emptyPost} />
    </>
  );
}
