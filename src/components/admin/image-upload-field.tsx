"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { uploadImageAction } from "@/lib/admin/actions";
import { mediaUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Image field for content forms. Choosing a file shows an instant local preview,
 * uploads it through the server (type sniffing, size limit, admin-only storage
 * policies) and stores the returned media path in the named input. The path can
 * also be typed or pasted from the Media library. The file input itself has no
 * name, so the image bytes are never posted with the surrounding form.
 */
export function ImageUploadField({
  name,
  label,
  folder,
  defaultPath = "",
  hint,
  aspectClass = "aspect-[4/3]",
  required = false,
  minWidth,
  onPathChange,
}: {
  name: string;
  label: string;
  folder: "hero" | "reels" | "blog" | "products" | "categories" | "ingredients" | "payments";
  defaultPath?: string;
  hint?: string;
  aspectClass?: string;
  required?: boolean;
  /** Width in pixels below which the image will look soft where it is displayed (warning only). */
  minWidth?: number;
  onPathChange?: (path: string, previewUrl: string | null) => void;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(defaultPath);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Release the object URL of a local preview when it is replaced or the field unmounts.
  useEffect(() => () => void (localPreview && URL.revokeObjectURL(localPreview)), [localPreview]);

  const preview = localPreview ?? (path ? safeMediaUrl(path) : null);

  const update = (next: string, previewUrl: string | null) => {
    setPath(next);
    onPathChange?.(next, previewUrl);
  };

  const upload = (file: File) => {
    if (!ACCEPT.includes(file.type)) return setMessage({ ok: false, text: "Choose a JPEG, PNG, WebP or AVIF image." });
    if (file.size > MAX_BYTES) return setMessage({ ok: false, text: "Images must be 5 MB or smaller." });
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setMessage(null);
    setSizeWarning(null);
    if (minWidth) {
      const probe = new window.Image();
      probe.onload = () => {
        if (probe.naturalWidth < minWidth) {
          setSizeWarning(`This image is ${probe.naturalWidth} × ${probe.naturalHeight} px. For a sharp result here, use one at least ${minWidth} px wide.`);
        }
      };
      probe.src = objectUrl;
    }
    onPathChange?.(path, objectUrl);
    const data = new FormData();
    data.set("file", file);
    data.set("folder", folder);
    startTransition(async () => {
      const result = await uploadImageAction({ ok: false, message: "" }, data);
      if (result.ok && result.path) {
        update(result.path, objectUrl);
        setMessage({ ok: true, text: "Uploaded. Save to apply." });
      } else {
        setLocalPreview(null);
        onPathChange?.(path, path ? safeMediaUrl(path) : null);
        setMessage({ ok: false, text: result.message || "Upload failed." });
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <div className="space-y-2">
      <span className="label" id={`${id}-label`}>
        {label}
        {required && <span className="sr-only"> (required)</span>}
      </span>
      <div className={cn("relative overflow-hidden rounded-[3px] border border-line bg-sand", aspectClass)}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- live preview of a local file or media path
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-xs text-muted">No image yet</span>
        )}
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-ivory/70 text-sm text-ink">
            <LoaderCircle className="size-4 animate-spin" aria-hidden /> Uploading…
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className={cn("btn btn-outline btn-sm cursor-pointer", pending && "pointer-events-none opacity-60")}>
          <ImagePlus className="size-4" aria-hidden /> {path ? "Replace image" : "Upload image"}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT.join(",")}
            className="sr-only"
            aria-labelledby={`${id}-label`}
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </label>
        {path && !required && (
          <button
            type="button"
            onClick={() => {
              setLocalPreview(null);
              update("", null);
              setMessage(null);
            }}
            className="inline-flex items-center gap-1 text-xs text-danger hover:underline"
          >
            <X className="size-3.5" aria-hidden /> Remove
          </button>
        )}
      </div>
      <input
        name={name}
        value={path}
        onChange={(e) => {
          setLocalPreview(null);
          update(e.target.value.trim(), e.target.value.trim() ? safeMediaUrl(e.target.value.trim()) : null);
        }}
        required={required}
        aria-label={`${label} — media path`}
        placeholder={`uploads/${folder}/…`}
        className="field text-xs"
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {sizeWarning && <p className="text-xs text-[#7a5418]">{sizeWarning}</p>}
      {message && (
        <p role={message.ok ? "status" : "alert"} className={cn("text-xs", message.ok ? "text-botanical" : "text-danger")}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/** mediaUrl for previews; ignores anything that is not a plausible media path. */
function safeMediaUrl(path: string): string | null {
  return /^[a-z0-9][a-z0-9/_.-]*$/i.test(path) && !path.includes("..") ? mediaUrl(path) : null;
}
