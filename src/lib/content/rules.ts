/**
 * Pure validation and formatting rules for admin-managed content (hero slides,
 * Instagram Reels, blog posts). No server-only imports, so the same rules run in
 * admin forms, server actions and unit tests. The database enforces the same
 * patterns (supabase/migrations/20261019000000_content_management.sql).
 */

/** Storage object path inside the media bucket, e.g. uploads/hero/slide-ab12cd34.webp. */
export function isMediaPath(value: string): boolean {
  return value.length > 0 && value.length <= 300 && /^[a-z0-9][a-z0-9/_.-]*$/.test(value) && !value.includes("..");
}

/** Button / announcement destination: an internal path (/products) or an https URL. Never javascript:, data: or //host. */
export function isSafeSiteLink(value: string): boolean {
  if (value.length === 0 || value.length > 300 || /\s/.test(value)) return false;
  if (value.startsWith("/")) return value === "/" || !value.startsWith("//");
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** True for links that leave the website (opened in a new tab). */
export const isExternalLink = (href: string) => href.startsWith("https://");

/**
 * Normalises a public Instagram Reel or post link to
 * https://www.instagram.com/reel/<code>/ (or /p/<code>/). Returns null for
 * anything else — profile links, other hosts, non-https URLs.
 */
export function normalizeReelUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com", "m.instagram.com"].includes(url.hostname)) return null;
  const match = /^\/(?:[A-Za-z0-9._]+\/)?(reel|reels|p)\/([A-Za-z0-9_-]{5,64})\/?$/.exec(url.pathname);
  if (!match) return null;
  return `https://www.instagram.com/${match[1] === "p" ? "p" : "reel"}/${match[2]}/`;
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/, "");

export const isSlug = (value: string) => value.length <= 100 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);

export type BlogBlock = { type: "h2" | "h3" | "p"; text: string } | { type: "ul"; items: string[] };

/**
 * Parses the blog body's tiny markup into blocks that are rendered as plain
 * text (never as HTML):
 *   ## Heading        → section heading
 *   ### Subheading    → sub-heading
 *   - item / * item   → bulleted list
 *   blank line        → new paragraph (single line breaks join with a space)
 */
export function parseBlogBody(body: string): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
    if (list.length) blocks.push({ type: "ul", items: list });
    paragraph = [];
    list = [];
  };
  for (const raw of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (/^###\s+/.test(line)) {
      flush();
      blocks.push({ type: "h3", text: line.replace(/^###\s+/, "") });
    } else if (/^##\s+/.test(line)) {
      flush();
      blocks.push({ type: "h2", text: line.replace(/^##\s+/, "") });
    } else if (/^[-*]\s+/.test(line)) {
      if (paragraph.length) {
        blocks.push({ type: "p", text: paragraph.join(" ") });
        paragraph = [];
      }
      list.push(line.replace(/^[-*]\s+/, ""));
    } else {
      if (list.length) {
        blocks.push({ type: "ul", items: list });
        list = [];
      }
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** Estimated reading time at 200 words per minute (minimum 1). */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Shortens text to a limit at a word boundary, for meta descriptions. */
export function truncate(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), limit * 0.6)).trimEnd()}…`;
}

/** ISO timestamp → value for <input type="datetime-local"> in India Standard Time (UTC+05:30, no DST). */
export function toIstInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value entered in India Standard Time → ISO timestamp, or null when empty/invalid. */
export function fromIstInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
