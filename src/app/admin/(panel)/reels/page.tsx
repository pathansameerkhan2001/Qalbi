import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { listReels } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteReelAction } from "@/lib/admin/content-actions";
import { mediaUrl } from "@/lib/assets";
import type { ReelRow } from "@/lib/store/cms";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { RowForm } from "@/components/admin/row-form";
import { NewReel, ReelForm } from "./reel-form";

export const metadata: Metadata = { title: "Instagram Reels" };

export default async function AdminReelsPage() {
  await requireAdmin();
  let reels: ReelRow[];
  try {
    reels = await listReels();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Instagram Reels" />
        <SetupNotice error={error} migration="content" />
      </>
    );
  }
  const live = reels.filter((r) => r.published).length;
  const apiConnected = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);

  return (
    <>
      <AdminHeading title="Instagram Reels" description="Reels shown in “A Little QALBI on Your Feed” on the homepage." />
      <Card className="mb-6 p-4 text-sm text-muted">
        {apiConnected ? (
          <>Automatic Instagram syncing is configured, so the homepage shows the latest Reels from the Instagram API. The Reels below are used whenever the API returns none.</>
        ) : (
          <>
            Reels are added manually: paste the public link of a Reel from @qalbinaturals and upload a thumbnail. Nothing is fetched from Instagram automatically. {live ? `${live} Reel${live === 1 ? " is" : "s are"} live.` : "No Reels are live yet — the homepage shows studio photos linking to the Instagram profile."}
          </>
        )}
      </Card>
      <div className="space-y-4">
        {reels.map((r) => (
          <Card key={r.id} className="p-5">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 [&::-webkit-details-marker]:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                <img src={mediaUrl(r.thumbnailPath)} alt="" className="h-16 w-9 rounded-[2px] bg-sand object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{r.caption}</span>
                  <a href={r.reelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-forest">
                    Open on Instagram <ExternalLink className="size-3" aria-hidden />
                  </a>
                </span>
                <span className="text-xs text-muted">Order {r.sort}</span>
                <span className={r.published ? "rounded-full bg-botanical/15 px-2 py-0.5 text-[0.7rem] font-medium text-forest" : "rounded-full bg-line px-2 py-0.5 text-[0.7rem] font-medium text-muted"}>
                  {r.published ? "Live" : "Hidden"}
                </span>
                <span className="text-xs text-forest underline">Edit</span>
              </summary>
              <div className="mt-5 border-t border-line pt-5">
                <ReelForm initial={{ id: r.id, reelUrl: r.reelUrl, caption: r.caption, thumbnailPath: r.thumbnailPath, sort: r.sort, published: r.published }} />
                <RowForm action={deleteReelAction} submitLabel="Delete Reel" variant="danger" confirm={`Delete “${r.caption}”? Its thumbnail stays in the Media library.`} className="mt-4 flex justify-end">
                  <input type="hidden" name="id" value={r.id} />
                </RowForm>
              </div>
            </details>
          </Card>
        ))}
        {reels.length === 0 && <Card className="p-6 text-sm text-muted">No Reels yet. Add the first one below.</Card>}
        <Card className="border-dashed p-5">
          <h2 className="mb-4 font-serif text-xl">Add a Reel</h2>
          <NewReel nextSort={(reels.at(-1)?.sort ?? 0) + 1} />
        </Card>
      </div>
    </>
  );
}
