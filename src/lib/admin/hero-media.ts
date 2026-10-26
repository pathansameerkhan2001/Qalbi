import "server-only";
import { storageUrl } from "@/lib/assets";
import { sniffVideo } from "@/lib/content/hero";

/** What the media bucket serves for a hero video path. `problem` is set when the homepage could not play it. */
export interface VideoProbe {
  path: string;
  url: string | null;
  bytes: number | null;
  problem: string | null;
  /** The bucket has no object at this path (as opposed to a network or type problem). */
  missing?: boolean;
}

/** Above this a hero video starts late on mobile data (the optimised encodes are 2–3 MB). */
export const HEAVY_VIDEO_BYTES = 6 * 1024 * 1024;

/**
 * Checks a hero video through its public URL with a 32-byte range request:
 * status, total size and the real container from its first bytes, without
 * downloading the file.
 */
export async function probeVideo(path: string): Promise<VideoProbe> {
  const url = storageUrl(path);
  if (!url) return { path, url, bytes: null, problem: "Supabase is not configured, so no video can be served" };
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-31" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (res.status !== 206 && res.status !== 200) {
      await res.body?.cancel();
      const missing = res.status === 400 || res.status === 404;
      return { path, url, bytes: null, problem: missing ? "there is no file at this path in the media bucket" : `the media bucket answered ${res.status}`, missing };
    }
    const head = new Uint8Array(await res.arrayBuffer()).slice(0, 32);
    const total = Number(/\/(\d+)$/.exec(res.headers.get("content-range") ?? "")?.[1] ?? res.headers.get("content-length"));
    const bytes = Number.isFinite(total) && total > 0 ? total : null;
    if (!sniffVideo(head)) return { path, url, bytes, problem: "the file is not an MP4 or WebM video" };
    return { path, url, bytes, problem: null };
  } catch {
    return { path, url, bytes: null, problem: "the media bucket could not be reached" };
  }
}
