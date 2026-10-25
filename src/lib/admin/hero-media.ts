import "server-only";
import { storageUrl } from "@/lib/assets";

/** What the media bucket serves for a hero video path. `problem` is set when the homepage could not play it. */
export interface VideoProbe {
  path: string;
  url: string | null;
  bytes: number | null;
  problem: string | null;
}

/** Above this a 10-second hero film starts late on mobile data (the optimised encodes are 2–3 MB). */
export const HEAVY_VIDEO_BYTES = 6 * 1024 * 1024;

/**
 * Checks a hero video through its public URL with a one-byte range request:
 * status, content type and total size, without downloading the file.
 */
export async function probeVideo(path: string): Promise<VideoProbe> {
  const url = storageUrl(path);
  if (!url) return { path, url, bytes: null, problem: "Supabase is not configured, so no video can be served" };
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-0" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    await res.body?.cancel();
    if (res.status !== 206 && res.status !== 200) {
      return { path, url, bytes: null, problem: res.status === 400 || res.status === 404 ? "there is no file at this path in the media bucket" : `the media bucket answered ${res.status}` };
    }
    const type = res.headers.get("content-type") ?? "";
    const total = Number(/\/(\d+)$/.exec(res.headers.get("content-range") ?? "")?.[1] ?? res.headers.get("content-length"));
    const bytes = Number.isFinite(total) && total > 1 ? total : null;
    if (!/^video\/(mp4|webm)\b/.test(type)) return { path, url, bytes, problem: `the file is not an MP4 or WebM video (${type || "no type"})` };
    return { path, url, bytes, problem: null };
  } catch {
    return { path, url, bytes: null, problem: "the media bucket could not be reached" };
  }
}
