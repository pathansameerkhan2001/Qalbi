"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Upload } from "lucide-react";
import { uploadMediaAction } from "@/lib/admin/actions";
import { ActionMessage, initialActionState, SubmitButton } from "@/components/admin/form-bits";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function UploadForm({ folder }: { folder: string }) {
  const [state, action] = useActionState(uploadMediaAction, initialActionState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="media-file" className="label">Image (JPEG, PNG, WebP or AVIF · max 5 MB)</label>
        <input id="media-file" name="file" type="file" accept={ACCEPT} required className="block text-sm file:mr-3 file:rounded-[3px] file:border file:border-line file:bg-ivory file:px-3 file:py-1.5" />
      </div>
      <div>
        <label htmlFor="media-folder" className="label">Folder (under uploads/)</label>
        <input id="media-folder" name="folder" defaultValue={folder.replace(/^uploads\/?/, "") || "products"} className="field w-48" />
      </div>
      <SubmitButton pendingLabel="Uploading…">
        <Upload className="size-4" aria-hidden /> Upload
      </SubmitButton>
      <div className="basis-full">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function ReplaceForm({ path }: { path: string }) {
  const [state, action] = useActionState(uploadMediaAction, initialActionState);
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="replacePath" value={path} />
      <label className="block text-xs text-muted">
        Replace with a new file
        <input name="file" type="file" accept={ACCEPT} required className="mt-1 block w-full text-xs" />
      </label>
      <SubmitButton className="btn-sm w-full" pendingLabel="Replacing…">
        Replace
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

export function CopyPath({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-xs text-forest hover:underline"
      aria-label={`Copy path ${path}`}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />} {copied ? "Copied" : "Copy path"}
    </button>
  );
}
