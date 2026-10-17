import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { InstagramReel } from "@/types/content";
import { manualReels } from "@/data/content";
import { isSafeExternalUrl } from "./utils";
import { mediaUrl } from "./assets";
import { getSetting } from "./store/settings";
import { supabaseConfig } from "./supabase/config";

/**
 * Reels for "A Little QALBI on Your Feed".
 *
 * Priority:
 *  1. Instagram API with Instagram Login (INSTAGRAM_ACCESS_TOKEN for the
 *     official @qalbinaturals professional account, `instagram_business_basic`
 *     permission). The token is only ever used on the server.
 *  2. The manually curated list in src/data/content.ts.
 *  3. Empty list — the UI then shows a fallback linking to the profile.
 *
 * No scraping or unauthenticated access is performed.
 */

const token = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v23.0";

const INSTAGRAM_HOSTS = ["instagram.com"];
const THUMBNAIL_HOSTS = ["cdninstagram.com", "fbcdn.net", ...(supabaseConfig.url ? [new URL(supabaseConfig.url).hostname] : [])];

interface GraphMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type?: string;
  permalink: string;
  thumbnail_url?: string;
}

function isValidReel(reel: InstagramReel): boolean {
  const thumbnailOk = /^\/(images|assets)\//.test(reel.thumbnailUrl) || isSafeExternalUrl(reel.thumbnailUrl, THUMBNAIL_HOSTS);
  return isSafeExternalUrl(reel.reelUrl, INSTAGRAM_HOSTS) && thumbnailOk && reel.title.length > 0;
}

function titleFromCaption(caption: string | undefined): string {
  const firstLine = (caption ?? "").split("\n")[0].replace(/#\w+/g, "").trim();
  if (!firstLine) return "Watch on Instagram";
  return firstLine.length > 48 ? `${firstLine.slice(0, 45).trimEnd()}…` : firstLine;
}

async function fetchApiReels(): Promise<InstagramReel[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("instagram");

  const url = new URL(`https://graph.instagram.com/${apiVersion}/me/media`);
  url.searchParams.set("fields", "id,caption,media_type,media_product_type,permalink,thumbnail_url");
  url.searchParams.set("limit", "24");
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[instagram] media request failed with status ${res.status}`);
      return [];
    }
    const json = (await res.json()) as { data?: GraphMedia[] };
    return (json.data ?? [])
      .filter((m) => m.media_type === "VIDEO" && m.media_product_type === "REELS" && m.thumbnail_url)
      .slice(0, 10)
      .map((m) => {
        const title = titleFromCaption(m.caption);
        return { id: m.id, title, reelUrl: m.permalink, thumbnailUrl: m.thumbnail_url!, alt: `Instagram Reel: ${title}` };
      });
  } catch {
    console.error("[instagram] media request failed");
    return [];
  }
}

export async function getInstagramReels(): Promise<{ reels: InstagramReel[]; source: "api" | "manual" | "none" }> {
  if (token) {
    const reels = (await fetchApiReels()).filter(isValidReel);
    if (reels.length) return { reels, source: "api" };
  }
  const configured = ((await getSetting("instagram_reels")) ?? [])
    .map((r) => ({ id: r.id, title: r.title, reelUrl: r.reelUrl, thumbnailUrl: mediaUrl(r.thumbnailPath), alt: `Instagram Reel: ${r.title}` }))
    .filter(isValidReel);
  if (configured.length) return { reels: configured, source: "manual" };
  const manual = manualReels.filter(isValidReel);
  return manual.length ? { reels: manual, source: "manual" } : { reels: [], source: "none" };
}
