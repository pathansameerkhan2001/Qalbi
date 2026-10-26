"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Film, LoaderCircle, X } from "lucide-react";
import { finishHeroVideoUploadAction, startHeroVideoUploadAction } from "@/lib/admin/content-actions";
import { storageUrl } from "@/lib/assets";
import { heroVideoFileProblem, heroVideoMaxBytes } from "@/lib/content/hero";
import { isMediaPath } from "@/lib/content/rules";
import { supabaseConfig } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/** Sends the file to a signed Supabase upload URL, reporting progress (fetch cannot). */
function putFile(url: string, file: File, onProgress: (fraction: number) => void): Promise<{ ok: boolean; status: number; message: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type);
    // New, uniquely named objects: browsers and the CDN may keep them for a year.
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    if (supabaseConfig.publishableKey) xhr.setRequestHeader("apikey", supabaseConfig.publishableKey);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let message = "";
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = body.message ?? body.error ?? "";
      } catch {}
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, message });
    };
    xhr.onerror = () => resolve({ ok: false, status: 0, message: "network error" });
    xhr.send(file);
  });
}

/** Storage's refusal in words an administrator can act on. */
function uploadFailure(status: number, message: string): string {
  if (/mime|content.?type|not supported/i.test(message) || status === 415) {
    return `The media bucket does not accept videos yet (${message || status}). In Supabase → Storage → ${supabaseConfig.mediaBucket} → Edit bucket, add video/mp4 to the allowed MIME types.`;
  }
  if (/size|too large|exceed/i.test(message) || status === 413) {
    return `The media bucket's file size limit is smaller than this video (${message || status}). Compress the video, or raise the limit in Supabase → Storage → ${supabaseConfig.mediaBucket} → Edit bucket.`;
  }
  if (status === 0) return "The upload was interrupted. Check the connection and try again.";
  return `The upload failed (${message || `status ${status}`}).`;
}

/**
 * Video field for the hero slide form, separate from ImageUploadField (its own
 * types, limits, upload path and preview). Choosing a file checks its type and
 * size, shows a local preview, uploads it straight to the media bucket through
 * a one-time URL from the server (with progress) and then has the server
 * verify the stored file. The bucket path lands in the named input, which can
 * also be typed or pasted (e.g. a film uploaded with scripts/upload-hero-videos.mjs).
 */
export function VideoUploadField({
  name,
  label,
  defaultPath = "",
  hint,
  aspectClass,
  required = false,
  poster,
  onPathChange,
}: {
  name: string;
  label: string;
  defaultPath?: string;
  hint?: string;
  aspectClass: string;
  required?: boolean;
  /** Poster image URL for the preview, if one is chosen. */
  poster?: string | null;
  onPathChange?: (path: string, previewUrl: string | null) => void;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(defaultPath);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const maxBytes = heroVideoMaxBytes();

  useEffect(() => () => void (localPreview && URL.revokeObjectURL(localPreview)), [localPreview]);

  const remote = path && isMediaPath(path) ? storageUrl(path) : null;
  const preview = localPreview ?? remote;

  const update = (next: string, previewUrl: string | null) => {
    setPath(next);
    onPathChange?.(next, previewUrl);
  };

  async function upload(file: File) {
    const problem = heroVideoFileProblem(file, maxBytes);
    if (problem) return setMessage({ ok: false, text: problem });
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setMessage(null);
    setProgress(0);
    try {
      const ticket = await startHeroVideoUploadAction({ name: file.name, type: file.type, size: file.size });
      if (!ticket.ok) return setMessage({ ok: false, text: ticket.message });
      const sent = await putFile(ticket.uploadUrl, file, setProgress);
      if (!sent.ok) return setMessage({ ok: false, text: uploadFailure(sent.status, sent.message) });
      const checked = await finishHeroVideoUploadAction(ticket.path);
      if (!checked.ok || !checked.path) return setMessage({ ok: false, text: checked.message });
      update(checked.path, objectUrl);
      setMessage({ ok: true, text: checked.message });
    } catch {
      setMessage({ ok: false, text: "The upload could not be completed. Reload the page and try again." });
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const uploading = progress !== null;
  return (
    <div>
      <p className="label">{label}</p>
      <div className={cn("relative overflow-hidden rounded-[3px] bg-ink/90 ring-1 ring-line", aspectClass)}>
        {preview ? (
          <video key={preview} src={preview} poster={poster ?? undefined} muted playsInline loop controls preload="metadata" className="absolute inset-0 size-full object-cover" />
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-ivory/80 hover:text-ivory">
            <Film className="size-6" aria-hidden /> Choose a video
          </button>
        )}
        {uploading && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/70 p-2 text-[0.7rem] text-ivory">
            <span className="flex items-center gap-1.5">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Uploading… {Math.round((progress ?? 0) * 100)}%
            </span>
            <span className="mt-1 block h-1 rounded-full bg-ivory/25">
              <span className="block h-full rounded-full bg-ivory" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
            </span>
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="btn btn-outline btn-sm">
          {preview ? "Replace video" : "Upload video"}
        </button>
        {path && !uploading && (
          <button
            type="button"
            onClick={() => {
              setLocalPreview(null);
              setMessage(null);
              update("", null);
            }}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
          >
            <X className="size-3.5" aria-hidden /> Remove
          </button>
        )}
        <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <label htmlFor={id} className="sr-only">
        {label} path
      </label>
      <input
        id={id}
        name={name}
        value={path}
        required={required}
        onChange={(e) => update(e.target.value.trim(), null)}
        placeholder="uploads/hero/videos/…mp4"
        spellCheck={false}
        className="field mt-2 font-mono text-xs"
      />
      <p className="mt-1 text-xs text-muted">
        {hint} MP4 (H.264) or WebM, up to {mb(maxBytes)}.
      </p>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={cn("mt-1 text-xs", message.ok ? "text-forest" : "text-danger")}>
          {message.text}
        </p>
      )}
    </div>
  );
}
