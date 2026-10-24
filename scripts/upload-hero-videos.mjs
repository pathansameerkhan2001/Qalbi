/**
 * Uploads new, versioned hero films to the Supabase Storage bucket and verifies them.
 * Never overwrites: an object name that already exists stops the run.
 *
 *   node scripts/upload-hero-videos.mjs <file.mp4> <hero/new-name.mp4> [<file> <hero/name> …]            # dry run: checks only
 *   node scripts/upload-hero-videos.mjs <file.mp4> <hero/new-name.mp4> [<file> <hero/name> …] --upload   # uploads, then verifies
 *
 * Authentication (first that applies), as in scripts/upload-assets.mjs:
 *   1. SUPABASE_SERVICE_ROLE_KEY in your LOCAL environment (never NEXT_PUBLIC_, never committed).
 *   2. Otherwise you are asked for an administrator's email and password (admin-only Storage policies).
 *
 * Every upload is checked through its public URL: status 200, video/mp4, exact size and SHA-256,
 * byte-range support (206) and a one-year Cache-Control. src/data/images.ts is not changed: the
 * change to make is printed only once every file has passed.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET || "qalbi-naturals-media";
const upload = process.argv.includes("--upload");
const args = process.argv.slice(2).filter((a) => a !== "--upload");
const ONE_YEAR = "31536000";

class Stop extends Error {}
/** Ends the run with exit code 1 (without process.exit(), which can abort open fetch sockets on Windows). */
function fail(message) {
  throw new Stop(message);
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function ask(question, hidden = false) {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (hidden) rl._writeToOutput = (text) => (text.startsWith(question) ? stdout.write(question) : undefined);
  const answer = await rl.question(question);
  rl.close();
  if (hidden) stdout.write("\n");
  return answer.trim();
}

/** Public-URL checks; returns a list of problems (empty = verified). */
async function verify(publicUrl, body) {
  const problems = [];
  const res = await fetch(publicUrl, { cache: "no-store" });
  const got = Buffer.from(await res.arrayBuffer());
  if (res.status !== 200) problems.push(`GET returned ${res.status}`);
  if (!/^video\/mp4\b/.test(res.headers.get("content-type") ?? "")) problems.push(`content-type is ${res.headers.get("content-type")}`);
  if (got.length !== body.length) problems.push(`size ${got.length} ≠ ${body.length}`);
  else if (sha256(got) !== sha256(body)) problems.push("SHA-256 differs");
  const range = await fetch(publicUrl, { headers: { Range: "bytes=0-1023" }, cache: "no-store" });
  await range.arrayBuffer();
  if (range.status !== 206 || !/^bytes 0-1023\//.test(range.headers.get("content-range") ?? "")) problems.push(`range request returned ${range.status} ${range.headers.get("content-range") ?? ""}`);
  if (!(res.headers.get("cache-control") ?? "").includes(`max-age=${ONE_YEAR}`)) problems.push(`cache-control is "${res.headers.get("cache-control")}"`);
  return problems;
}

async function main() {
  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set (add it to .env.local).");
  if (!serviceKey && !publishableKey) fail("Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the server-only SUPABASE_SERVICE_ROLE_KEY).");
  if (args.length === 0 || args.length % 2) fail("Pass pairs: <local file.mp4> <hero/object-name.mp4>.");

  const pairs = [];
  for (let i = 0; i < args.length; i += 2) {
    const [file, objectPath] = [args[i], args[i + 1]];
    if (!/^hero\/[A-Za-z0-9._-]+\.mp4$/.test(objectPath)) fail(`${objectPath}: object paths must be hero/<name>.mp4.`);
    if (!existsSync(file)) fail(`${file}: not found.`);
    pairs.push({ file, objectPath });
  }
  const supabase = createClient(url, serviceKey || publishableKey, { auth: { persistSession: false } });

  // 1. Local files and destination names.
  for (const p of pairs) {
    p.body = await readFile(p.file);
    p.hash = sha256(p.body);
    p.publicUrl = supabase.storage.from(bucket).getPublicUrl(p.objectPath).data.publicUrl;
    const head = await fetch(p.publicUrl, { method: "HEAD", cache: "no-store" });
    p.exists = head.ok;
    console.log(`${p.objectPath}\n  local  ${p.file}\n  bytes  ${p.body.length}\n  sha256 ${p.hash}\n  bucket ${p.exists ? "ALREADY EXISTS" : "free"}`);
  }
  const taken = pairs.filter((p) => p.exists);
  if (taken.length) fail(`Already in the bucket (never overwritten — choose a new version name): ${taken.map((p) => p.objectPath).join(", ")}`);
  if (!upload) {
    console.log("\nDry run: nothing was uploaded. Re-run with --upload once the upload is approved.");
    return;
  }

  // 2. Sign in, upload, verify.
  let authLabel = "service role (server-only)";
  if (!serviceKey) {
    if (!stdin.isTTY) fail("Run this in an interactive terminal (it asks for an administrator sign-in), or set SUPABASE_SERVICE_ROLE_KEY locally.");
    const email = await ask("Administrator email: ");
    const password = await ask("Password: ", true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) fail("Sign-in failed. Check the email and password.");
    const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
    if (!admin) fail("That account is not an administrator (no row in admin_users).");
    authLabel = "administrator session";
  }
  console.log(`\nSupabase: ${new URL(url).hostname} · bucket "${bucket}" · ${authLabel}`);

  let ok = true;
  for (const p of pairs) {
    const { error } = await supabase.storage.from(bucket).upload(p.objectPath, p.body, { contentType: "video/mp4", cacheControl: ONE_YEAR, upsert: false });
    if (error) {
      console.error(`✖ ${p.objectPath}: upload failed — ${error.message}`);
      ok = false;
      continue;
    }
    const problems = await verify(p.publicUrl, p.body);
    if (problems.length) {
      console.error(`✖ ${p.objectPath}: uploaded but not verified — ${problems.join("; ")}`);
      ok = false;
    } else {
      console.log(`✔ ${p.objectPath} verified (200 video/mp4, ${p.body.length} bytes, sha256 match, 206 ranges, max-age=${ONE_YEAR})`);
    }
  }
  if (!ok) fail("Not every file verified. Leave src/data/images.ts unchanged and check the messages above.");

  console.log("\nAll files verified. Now point images.heroFilm at them in src/data/images.ts (desktop / mobile), rebuild and re-test:");
  for (const p of pairs) console.log(`  ${p.objectPath}`);
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof Stop ? error.message : error}`);
  process.exitCode = 1;
});
