import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Folder } from "lucide-react";
import { listMedia, type MediaItem } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteMediaAction } from "@/lib/admin/actions";
import { storagePublicUrl, supabaseConfig } from "@/lib/supabase/config";
import { AdminHeading, Card, dateTime, SetupNotice } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/form-bits";
import { CopyPath, ReplaceForm, UploadForm } from "./media-client";

export const metadata: Metadata = { title: "Media" };

const kb = (bytes: number | null) => (bytes === null ? "" : bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

export default async function AdminMediaPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  await requireAdmin();
  const { folder: raw = "" } = await searchParams;
  const folder = /^[a-z0-9/_-]*$/i.test(raw) ? raw.replace(/^\/+|\/+$/g, "") : "";
  let items: MediaItem[];
  try {
    items = await listMedia(folder);
  } catch (error) {
    return (
      <>
        <AdminHeading title="Media" />
        <SetupNotice error={error} />
      </>
    );
  }
  const crumbs = folder ? folder.split("/") : [];
  const folders = items.filter((i) => i.isFolder);
  const files = items.filter((i) => !i.isFolder);

  return (
    <>
      <AdminHeading title="Media library" description={`Images in the “${supabaseConfig.mediaBucket}” Supabase Storage bucket. Use a file's path in products, categories, ingredients and settings.`} />

      <Card className="mb-6 p-5">
        <UploadForm folder={folder} />
      </Card>

      <nav aria-label="Folder" className="mb-4 flex flex-wrap items-center gap-1 text-sm">
        <Link href="/admin/media" className="text-forest hover:underline">
          {supabaseConfig.mediaBucket}
        </Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-muted" aria-hidden />
            <Link href={`/admin/media?folder=${crumbs.slice(0, i + 1).join("/")}`} className="text-forest hover:underline">
              {c}
            </Link>
          </span>
        ))}
      </nav>

      {folders.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2">
          {folders.map((f) => (
            <li key={f.path}>
              <Link href={`/admin/media?folder=${f.path}`} className="inline-flex items-center gap-2 rounded-[3px] border border-line bg-ivory px-3 py-2 text-sm hover:border-sage">
                <Folder className="size-4 text-gold" aria-hidden /> {f.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {files.length === 0 && folders.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">
          This folder is empty. Upload an image above{folder === "" ? ", or run npm run assets:upload to copy the website's images into the bucket" : ""}.
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((f) => (
            <li key={f.path} className="flex flex-col overflow-hidden rounded-[3px] border border-line bg-ivory">
              <a href={storagePublicUrl(f.path)} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a storage object */}
                <img src={storagePublicUrl(f.path)} alt={f.name} loading="lazy" className="size-full object-cover" />
              </a>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="break-all text-xs font-medium text-ink">{f.path}</p>
                <p className="text-[0.7rem] text-muted">
                  {kb(f.size)}
                  {f.updatedAt && ` · ${dateTime(f.updatedAt)}`}
                </p>
                <CopyPath path={f.path} />
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted">Replace or delete</summary>
                  <div className="mt-2 space-y-3">
                    <ReplaceForm path={f.path} />
                    <form action={deleteMediaAction}>
                      <input type="hidden" name="path" value={f.path} />
                      <ConfirmButton message={`Delete ${f.path}? Pages using this path will show a missing image.`}>Delete file</ConfirmButton>
                    </form>
                  </div>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
