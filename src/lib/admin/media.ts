import "server-only";
import { createSessionClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Image uploads to the media bucket, shared by the Media library and the
 * content forms (hero, reels, blog). Runs with the administrator's own session,
 * so storage RLS (admin-only insert/update) applies on top of requireAdmin().
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Detects the real image type from the file's first bytes (the browser-supplied type is not trusted). */
function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return { mime: "image/png", ext: "png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return { mime: "image/avif", ext: "avif" };
  return null;
}

export type StoreImageResult = { ok: true; path: string } | { ok: false; message: string };

/**
 * Validates and uploads an image.
 *  - `folder`: new object at uploads/<folder>/<name>-<random>.<ext> (never overwrites).
 *  - `replacePath`: overwrites that object; the file type must stay the same.
 * Callers validate `folder` / `replacePath` and call requireAdmin() first.
 */
export async function storeImage(file: unknown, target: { folder: string } | { replacePath: string }): Promise<StoreImageResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Images must be 5 MB or smaller." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { ok: false, message: "Only JPEG, PNG, WebP or AVIF images can be uploaded." };

  let path: string;
  if ("replacePath" in target) {
    const replacePath = target.replacePath;
    if (!replacePath.toLowerCase().endsWith(`.${type.ext}`) && !(type.ext === "jpg" && /\.jpe?g$/i.test(replacePath))) {
      return { ok: false, message: `The replacement must be the same file type (.${replacePath.split(".").pop()}).` };
    }
    path = replacePath;
  } else {
    const base =
      file.name
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "image";
    path = `uploads/${target.folder}/${base}-${crypto.randomUUID().slice(0, 8)}.${type.ext}`;
  }

  const replacing = "replacePath" in target;
  const db = await createSessionClient();
  const { error } = await db.storage.from(supabaseConfig.mediaBucket).upload(path, bytes, {
    contentType: type.mime,
    upsert: replacing,
    cacheControl: replacing ? "300" : "31536000",
  });
  if (error) {
    console.error("[admin] upload:", error.message);
    return { ok: false, message: "Upload failed. Check that you are an administrator and the storage bucket exists." };
  }
  return { ok: true, path };
}
