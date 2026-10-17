/**
 * Uploads /public/assets/** to the Supabase Storage bucket and verifies every
 * object is publicly retrievable.
 *
 *   npm run assets:upload
 *
 * Environment (.env.local is loaded automatically):
 *   NEXT_PUBLIC_SUPABASE_URL                required
 *   SUPABASE_SERVICE_ROLE_KEY               optional, SERVER-ONLY — needed to create the bucket and to
 *                                           upload when Storage policies don't allow publishable-key inserts
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY    used when no service-role key is present
 *   NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET      default "qalbi-naturals-media"
 *
 * Never expose SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
 * After a fully successful run, set NEXT_PUBLIC_ASSET_SOURCE=supabase.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET || "qalbi-naturals-media";
const ROOT = path.resolve("public/assets");
const MIME = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".avif": "image/avif", ".svg": "image/svg+xml" };

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set (add it to .env.local).");
if (!serviceKey && !publishableKey) fail("Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the server-only SUPABASE_SERVICE_ROLE_KEY).");

const supabase = createClient(url, serviceKey || publishableKey, { auth: { persistSession: false } });
console.log(`Supabase: ${new URL(url).hostname} · bucket "${bucket}" · key: ${serviceKey ? "service role (server-only)" : "publishable"}`);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])));
  return files.flat();
}

// 1. Bucket
const { data: existing, error: getError } = await supabase.storage.getBucket(bucket);
if (!existing) {
  if (!serviceKey) {
    fail(
      `Bucket "${bucket}" was not found or is not visible with the publishable key (${getError?.message ?? "no details"}).\n` +
        `  Create it in Supabase Dashboard → Storage → New bucket → name "${bucket}", Public bucket ON,\n` +
        `  allowed MIME types image/webp, image/png, image/jpeg, image/avif — or rerun with SUPABASE_SERVICE_ROLE_KEY set (server-side only).`,
    );
  }
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: Object.values(MIME).filter((m) => m !== "image/svg+xml"),
  });
  if (error) fail(`Could not create bucket "${bucket}": ${error.message}`);
  console.log(`Created public bucket "${bucket}".`);
} else if (!existing.public) {
  fail(`Bucket "${bucket}" exists but is private. Website images need a public bucket (or switch the site to signed URLs).`);
}

// 2. Upload (skip unchanged files) and 3. verify public retrieval
const files = (await walk(ROOT)).filter((f) => MIME[path.extname(f).toLowerCase()]);
const failures = [];
let uploaded = 0;
let skipped = 0;

for (const file of files) {
  const objectPath = path.relative(ROOT, file).split(path.sep).join("/");
  const body = await readFile(file);
  const contentType = MIME[path.extname(file).toLowerCase()];
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  const localHash = createHash("md5").update(body).digest("hex");

  const head = await fetch(publicUrl, { method: "HEAD" });
  const remoteEtag = head.headers.get("etag")?.replace(/"/g, "");
  if (head.ok && remoteEtag === localHash) {
    skipped++;
  } else {
    const { error } = await supabase.storage.from(bucket).upload(objectPath, body, { contentType, upsert: true, cacheControl: "31536000" });
    if (error) {
      failures.push(`${objectPath}: upload failed — ${error.message}`);
      continue;
    }
    uploaded++;
  }

  const check = await fetch(publicUrl);
  const size = Number(check.headers.get("content-length") ?? (await check.arrayBuffer()).byteLength);
  if (!check.ok) failures.push(`${objectPath}: public URL returned ${check.status}`);
  else if (size !== body.length) failures.push(`${objectPath}: size mismatch (${size} vs ${body.length})`);
  else console.log(`✔ ${objectPath}`);
}

console.log(`\n${uploaded} uploaded, ${skipped} unchanged, ${failures.length} failed, ${files.length} total.`);
if (failures.length) {
  console.error(failures.map((f) => `  ✖ ${f}`).join("\n"));
  console.error(
    serviceKey
      ? ""
      : "\nIf uploads were rejected by row-level security, either add a narrowly scoped INSERT/UPDATE policy for this bucket for an authenticated admin,\nor run this script with SUPABASE_SERVICE_ROLE_KEY set in your local server environment (never NEXT_PUBLIC_).",
  );
  process.exit(1);
}
console.log(`\nAll assets verified. Set NEXT_PUBLIC_ASSET_SOURCE=supabase to serve images from Supabase.`);
