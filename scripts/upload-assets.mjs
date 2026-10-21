/**
 * Uploads /public/assets/** to the Supabase Storage bucket and verifies every
 * object is publicly retrievable. Safe to re-run: identical files are skipped.
 *
 *   npm run assets:upload                  # asks for an administrator sign-in
 *   npm run assets:upload -- --dry-run     # list what would happen; change nothing
 *   npm run assets:upload -- --overwrite   # also replace bucket files that differ from the local copy
 *
 * Authentication (first that applies):
 *   1. SUPABASE_SERVICE_ROLE_KEY in your LOCAL environment (never NEXT_PUBLIC_, never committed).
 *   2. Otherwise you are asked for an administrator's email and password, and uploads run under
 *      the admin-only Storage policies (supabase/migrations/20261018000000_initial_schema.sql).
 *
 * Only paths mirroring public/assets are written (brand/, hero/, products/, …) — never uploads/.
 * A bucket file that differs from the local copy is reported and left alone unless --overwrite.
 * Afterwards `npm run assets:audit` must show every asset in the bucket before
 * NEXT_PUBLIC_ASSET_SOURCE=supabase is set.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET || "qalbi-naturals-media";
const ROOT = path.resolve("public/assets");
const MIME = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".avif": "image/avif" };
const dryRun = process.argv.includes("--dry-run");
const overwrite = process.argv.includes("--overwrite");

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set (add it to .env.local).");
if (!serviceKey && !publishableKey) fail("Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the server-only SUPABASE_SERVICE_ROLE_KEY).");

const supabase = createClient(url, serviceKey || publishableKey, { auth: { persistSession: false } });

/** Terminal prompt; `hidden` suppresses echo for the password. */
async function ask(question, hidden = false) {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (hidden) rl._writeToOutput = (text) => (text.startsWith(question) ? stdout.write(question) : undefined);
  const answer = await rl.question(question);
  rl.close();
  if (hidden) stdout.write("\n");
  return answer.trim();
}

let authLabel = "service role (server-only)";
if (dryRun) {
  authLabel = "dry run — no sign-in, nothing written";
} else if (!serviceKey) {
  if (!stdin.isTTY) fail("Run this in an interactive terminal (it asks for an administrator sign-in), or set SUPABASE_SERVICE_ROLE_KEY locally.");
  const email = await ask("Administrator email: ");
  const password = await ask("Password: ", true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) fail("Sign-in failed. Check the email and password.");
  const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) fail("That account is not an administrator (no row in admin_users).");
  authLabel = "administrator session";
}
console.log(`Supabase: ${new URL(url).hostname} · bucket "${bucket}" · ${authLabel}`);

// The bucket's settings are readable only with the service key; otherwise the public URL checks below prove it is public.
if (serviceKey) {
  const { data: existing, error } = await supabase.storage.getBucket(bucket);
  if (!existing) fail(`Bucket "${bucket}" was not found (${error?.message ?? "no details"}). Create it in Supabase → Storage as a PUBLIC bucket.`);
  if (!existing.public) fail(`Bucket "${bucket}" is private. Website images need a public bucket.`);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])));
  return files.flat();
}

const files = (await walk(ROOT)).filter((f) => MIME[path.extname(f).toLowerCase()]);
const failures = [];
const conflicts = [];
let uploaded = 0;
let skipped = 0;
let planned = 0;

for (const file of files) {
  const objectPath = path.relative(ROOT, file).split(path.sep).join("/");
  if (objectPath.startsWith("uploads/")) continue; // admin uploads are never touched
  const body = await readFile(file);
  const contentType = MIME[path.extname(file).toLowerCase()];
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  const localHash = createHash("md5").update(body).digest("hex");

  const head = await fetch(publicUrl, { method: "HEAD" });
  const remoteEtag = head.headers.get("etag")?.replace(/"/g, "");
  if (head.ok && remoteEtag === localHash) {
    skipped++;
  } else if (head.ok && !overwrite) {
    conflicts.push(objectPath);
    continue;
  } else if (dryRun) {
    console.log(`would upload ${objectPath}${head.ok ? " (replace)" : ""}`);
    planned++;
    continue;
  } else {
    const { error } = await supabase.storage.from(bucket).upload(objectPath, body, { contentType, upsert: head.ok, cacheControl: "31536000" });
    if (error) {
      failures.push(`${objectPath}: upload failed — ${error.message}`);
      continue;
    }
    uploaded++;
  }

  if (dryRun) continue;
  const check = await fetch(publicUrl);
  const size = (await check.arrayBuffer()).byteLength;
  if (!check.ok) failures.push(`${objectPath}: public URL returned ${check.status}`);
  else if (size !== body.length) failures.push(`${objectPath}: size mismatch (${size} vs ${body.length})`);
  else console.log(`✔ ${objectPath}`);
}

if (dryRun) {
  console.log(`\nDry run: ${planned} to upload, ${skipped} already identical, ${conflicts.length} differ in the bucket, ${files.length} total. Nothing was changed.`);
  if (conflicts.length) console.log(conflicts.map((c) => `  ≠ ${c}`).join("\n"));
  process.exit(0);
}

console.log(`\n${uploaded} uploaded, ${skipped} unchanged, ${conflicts.length} left alone (a different file is already in the bucket), ${failures.length} failed, ${files.length} total.`);
if (conflicts.length) console.log(`Not overwritten — review them, then re-run with --overwrite if the local copy should win:\n${conflicts.map((c) => `  ≠ ${c}`).join("\n")}`);
if (failures.length) {
  console.error(failures.map((f) => `  ✖ ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nNext: run `npm run assets:audit`. Set NEXT_PUBLIC_ASSET_SOURCE=supabase only when it shows every asset in the bucket.");
