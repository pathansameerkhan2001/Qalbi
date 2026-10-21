import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { listReels } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteReelAction, moveReelAction, setReelPublishedAction } from "@/lib/admin/content-actions";
import { mediaUrl } from "@/lib/assets";
import type { ReelRow } from "@/lib/store/cms";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { RowForm } from "@/components/admin/row-form";
import { MoveButtons } from "@/components/admin/move-buttons";
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
            Reels are added manually: paste the public link of a Reel from @qalbinaturals and upload a thumbnail. Nothing is fetched from Instagram automatically.{" "}
            {reels.length} Reel{reels.length === 1 ? "" : "s"} saved, {live} live.{" "}
            {live === 0 && "With none live, the homepage shows studio photos linking to the Instagram profile."}
          </>
        )}
      </Card>
      <ul className="space-y-3">
        {reels.map((r, i) => (
          <li key={r.id}>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                <img src={mediaUrl(r.thumbnailPath)} alt="" className="h-20 w-[2.8rem] shrink-0 rounded-[2px] bg-sand object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-ink">{r.caption}</span>
                    <span className={r.published ? "rounded-full bg-botanical/15 px-2 py-0.5 text-[0.7rem] font-medium text-forest" : "rounded-full bg-line px-2 py-0.5 text-[0.7rem] font-medium text-muted"}>
                      {r.published ? "Live" : "Hidden"}
                    </span>
                  </span>
                  <a href={r.reelUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-forest">
                    {r.reelUrl.replace("https://www.", "")} <ExternalLink className="size-3 shrink-0" aria-hidden />
                  </a>
                  <span className="block text-xs text-muted">Order {r.sort}</span>
                </span>
                <MoveButtons id={r.id} action={moveReelAction} first={i === 0} last={i === reels.length - 1} />
                <RowForm
                  action={setReelPublishedAction}
                  submitLabel={r.published ? "Hide" : "Show on website"}
                  pendingLabel={r.published ? "Hiding…" : "Publishing…"}
                  variant="quiet"
                  confirm={r.published ? `Hide “${r.caption}” from the homepage?` : undefined}
                  className="flex"
                >
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="publish" value={r.published ? "false" : "true"} />
                </RowForm>
              </div>
              <details className="group mt-3 border-t border-line pt-3">
                <summary className="cursor-pointer list-none text-sm text-forest underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Edit or preview</span>
                  <span className="hidden group-open:inline">Close editor</span>
                </summary>
                <div className="mt-5">
                  <ReelForm initial={{ id: r.id, reelUrl: r.reelUrl, caption: r.caption, thumbnailPath: r.thumbnailPath, sort: r.sort, published: r.published }} />
                  <RowForm action={deleteReelAction} submitLabel="Delete Reel" variant="danger" confirm={`Delete “${r.caption}”? This cannot be undone. Its thumbnail stays in the Media library.`} className="mt-4 flex justify-end border-t border-line pt-3">
                    <input type="hidden" name="id" value={r.id} />
                  </RowForm>
                </div>
              </details>
            </Card>
          </li>
        ))}
      </ul>
      {reels.length === 0 && <Card className="p-6 text-sm text-muted">No Reels yet. Add the first one below.</Card>}
      <Card className="mt-4 border-dashed p-5">
        <h2 className="mb-4 font-serif text-xl">Add a Reel</h2>
        <NewReel nextSort={(reels.at(-1)?.sort ?? 0) + 10} />
      </Card>
    </>
  );
}
