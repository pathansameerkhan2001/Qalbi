/**
 * Browser-side image optimisation before an admin upload (components/admin/image-upload-field.tsx).
 *
 * Phone exports and AI renders arrive as 2–3 MB PNGs. The storefront never shows
 * them at full size (next/image resizes them), but the server has to fetch and
 * re-encode the whole original on every cold request, which is slow and can time
 * out. So large PNG and JPEG files are re-encoded here as WebP (transparency
 * kept), with the long edge capped at MAX_EDGE: still sharper than anything the
 * site displays. The original is kept whenever optimising wouldn't make it
 * smaller, the browser can't encode WebP, or anything fails.
 *
 * Client only (canvas). No dependencies.
 */

/** Longest edge kept: above the widest display (full-width hero on a 1920 px screen). */
export const MAX_EDGE = 2400;
/** Files below this size are left alone unless they are larger than MAX_EDGE. */
const SMALL_ENOUGH = 600 * 1024;
const QUALITY = 0.86;

export interface OptimisedImage {
  file: File;
  /** Set when the file was re-encoded: original and new size in bytes. */
  saved?: { from: number; to: number };
}

export async function optimiseImageForUpload(file: File): Promise<OptimisedImage> {
  if (file.type !== "image/png" && file.type !== "image/jpeg") return { file };
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return { file };
  try {
    const bitmap = await createImageBitmap(file);
    const long = Math.max(bitmap.width, bitmap.height);
    if (file.size <= SMALL_ENOUGH && long <= MAX_EDGE) {
      bitmap.close();
      return { file };
    }
    const scale = Math.min(1, MAX_EDGE / long);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file };
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
    // Browsers that can't encode WebP hand back a PNG instead: keep the original then.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return { file };
    const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
    return { file: new File([blob], name, { type: "image/webp", lastModified: file.lastModified }), saved: { from: file.size, to: blob.size } };
  } catch {
    return { file };
  }
}
