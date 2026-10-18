import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Plus, Search } from "lucide-react";
import { listBlogPosts } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import type { BlogPostRow } from "@/lib/store/cms";
import { AdminHeading, Card, dateTime, SetupNotice } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog" };

type Status = "draft" | "scheduled" | "published";

function statusOf(post: BlogPostRow, now: number): Status {
  if (post.status === "draft") return "draft";
  return post.publishedAt && new Date(post.publishedAt).getTime() > now ? "scheduled" : "published";
}

const badge: Record<Status, string> = {
  draft: "bg-line text-muted",
  scheduled: "bg-gold-pale text-[#7a5418]",
  published: "bg-botanical/15 text-forest",
};

const filters: { value: "" | Status; label: string }[] = [
  { value: "", label: "All" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Drafts" },
];

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; deleted?: string }> }) {
  await requireAdmin();
  const { q = "", status = "", deleted } = await searchParams;
  let posts: BlogPostRow[];
  try {
    posts = await listBlogPosts();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Blog" />
        <SetupNotice error={error} />
      </>
    );
  }
  // Request time for the "scheduled" label (admin pages are rendered per request).
  const now = new Date().getTime();
  const term = q.trim().toLowerCase().slice(0, 100);
  const rows = posts
    .map((p) => ({ post: p, status: statusOf(p, now) }))
    .filter((r) => !status || r.status === status)
    .filter((r) => !term || [r.post.title, r.post.slug, r.post.excerpt, r.post.category ?? "", r.post.author ?? ""].some((v) => v.toLowerCase().includes(term)));

  return (
    <>
      <AdminHeading title="Blog" description="Articles for the QALBI Journal. Drafts and scheduled posts are not visible on the website.">
        <Link href="/admin/blog/new" className="btn btn-primary btn-sm">
          <Plus className="size-4" aria-hidden /> New post
        </Link>
      </AdminHeading>
      {deleted && (
        <p role="status" className="mb-4 text-sm text-botanical">
          Post deleted.
        </p>
      )}
      <form className="mb-4 flex flex-wrap items-center gap-3" role="search">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Search posts</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Search title, handle, category…" className="field pl-9" />
        </label>
        {status && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="btn btn-outline btn-sm">
          Search
        </button>
      </form>
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => {
          const params = new URLSearchParams({ ...(q ? { q } : {}), ...(f.value ? { status: f.value } : {}) });
          const active = status === f.value;
          return (
            <Link
              key={f.label}
              href={`/admin/blog${params.size ? `?${params}` : ""}`}
              aria-current={active ? "page" : undefined}
              className={cn("rounded-full border px-3 py-1 text-xs", active ? "border-forest bg-forest text-ivory" : "border-line text-muted hover:border-sage")}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          {posts.length === 0 ? (
            <>
              No posts yet.{" "}
              <Link href="/admin/blog/new" className="text-forest underline">
                Write the first one
              </Link>
              .
            </>
          ) : (
            "No posts match this search."
          )}
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ post, status: s }) => (
                <tr key={post.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/blog/${post.id}`} className="font-medium text-ink hover:text-forest">
                      {post.title}
                    </Link>
                    <span className="block text-xs text-muted">/journal/{post.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[0.7rem] font-medium capitalize", badge[s])}>{s}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{post.publishedAt ? dateTime(post.publishedAt) : `Edited ${dateTime(post.updatedAt)}`}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link href={`/admin/blog/${post.id}/preview`} className="text-xs text-forest underline">
                      Preview
                    </Link>
                    {s === "published" && (
                      <Link href={`/journal/${post.slug}`} target="_blank" className="ml-3 inline-flex items-center gap-1 text-xs text-forest">
                        View <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
