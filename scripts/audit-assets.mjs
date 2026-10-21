/**
 * READ-ONLY image audit: which website and database images exist locally, which
 * exist in the Supabase Storage bucket, and which references are broken.
 *
 *   npm run assets:audit              # human-readable report
 *   npm run assets:audit -- --json    # machine-readable
 *
 * Nothing is uploaded, changed or deleted. It only sends HEAD/GET requests.
 *
 * Database references are read with the publishable key, so row level security
 * shows only PUBLIC rows (published products, active categories, live content).
 * If SUPABASE_SERVICE_ROLE_KEY is set in your local environment (never
 * NEXT_PUBLIC_), it is used read-only to include drafts as well. Keys are never
 * printed.
 */
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);

const json = process.argv.includes("--json");
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const bucket = process.env.NEXT_PUBLIC_SUPABASE_ASSETS_BUCKET || "qalbi-naturals-media";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ROOT = path.resolve("public/assets");
const IMAGE = /\.(webp|png|jpe?g|avif|svg)$/i;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  process.exit(1);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])))).flat();
}

// 1. Local website assets (public/assets mirrors the bucket layout)
const localFiles = (await walk(ROOT)).filter((f) => IMAGE.test(f)).map((f) => path.relative(ROOT, f).split(path.sep).join("/"));
const localSet = new Set(localFiles);

// 2. Paths referenced in code (src/data/images.ts, brand.ts and any other assetUrl("…") call)
async function sourceFiles(dir) {
  return (await walk(dir)).filter((f) => /\.(ts|tsx)$/.test(f));
}
const codeRefs = new Map();
for (const file of await sourceFiles(path.resolve("src"))) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/(?:assetUrl|photo)\(\s*"([a-z0-9][a-z0-9/_.-]*\.(?:webp|png|jpe?g|avif))"/gi)) {
    codeRefs.set(m[1], path.relative(process.cwd(), file).split(path.sep).join("/"));
  }
}

// 3. Paths referenced in the database (what this key may read)
const rest = async (query) => {
  const r = await fetch(`${url}/rest/v1/${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (r.status === 404) return { missing: true, rows: [] };
  if (!r.ok) return { error: r.status, rows: [] };
  return { rows: await r.json() };
};
const dbRefs = [];
const dbNotes = [];
const tables = [
  ["product_images", "product_images?select=image_url,products(slug,is_published)", (r) => [[r.image_url, `product ${r.products?.slug ?? "?"}${r.products?.is_published ? "" : " (draft)"}`]]],
  ["categories", "categories?select=slug,image_url,is_active", (r) => (r.image_url ? [[r.image_url, `category ${r.slug}${r.is_active ? "" : " (hidden)"}`]] : [])],
  ["hero_slides", "hero_slides?select=id,desktop_image_path,mobile_image_path,is_active", (r) => [[r.desktop_image_path, `hero slide (desktop)${r.is_active ? "" : " (hidden)"}`], [r.mobile_image_path, `hero slide (mobile)${r.is_active ? "" : " (hidden)"}`]]],
  ["instagram_reels", "instagram_reels?select=caption,thumbnail_path,is_published", (r) => [[r.thumbnail_path, `reel “${r.caption}”${r.is_published ? "" : " (hidden)"}`]]],
  ["blog_posts", "blog_posts?select=slug,cover_image_path,status", (r) => (r.cover_image_path ? [[r.cover_image_path, `blog ${r.slug} (${r.status})`]] : [])],
  ["ingredients", "ingredients?select=slug,image_path,is_active", (r) => (r.image_path ? [[r.image_path, `ingredient ${r.slug}${r.is_active ? "" : " (hidden)"}`]] : [])],
];
for (const [name, query, extract] of tables) {
  const res = await rest(query);
  if (res.missing) dbNotes.push(`${name}: table not found`);
  else if (res.error) dbNotes.push(`${name}: could not read (HTTP ${res.error})`);
  for (const row of res.rows) for (const [p, where] of extract(row)) if (p) dbRefs.push({ path: p, where });
}

// 4. Bucket check for every distinct path
const publicUrl = (p) => `${url}/storage/v1/object/public/${bucket}/${p.split("/").map(encodeURIComponent).join("/")}`;
const inBucket = new Map();
const allPaths = [...new Set([...localFiles, ...codeRefs.keys(), ...dbRefs.map((r) => r.path).filter((p) => !/^https:\/\//.test(p))])];
for (let i = 0; i < allPaths.length; i += 8) {
  await Promise.all(
    allPaths.slice(i, i + 8).map(async (p) => {
      const r = await fetch(publicUrl(p), { method: "HEAD" });
      inBucket.set(p, r.ok);
    }),
  );
}

// 5. Classify
const assetSource = process.env.NEXT_PUBLIC_ASSET_SOURCE === "supabase" ? "supabase" : "local";
/** Where the site loads a path from today (mirrors src/lib/assets.ts mediaUrl). */
const servedFrom = (p) => (/^https:\/\//.test(p) ? "external" : p.startsWith("uploads/") || assetSource === "supabase" ? "bucket" : "local");
const resolvable = (p) => {
  const from = servedFrom(p);
  return from === "external" ? true : from === "bucket" ? inBucket.get(p) === true : localSet.has(p);
};
const broken = [
  ...[...codeRefs].filter(([p]) => !resolvable(p)).map(([p, file]) => ({ path: p, where: file })),
  ...dbRefs.filter((r) => !resolvable(r.path)),
];
const report = {
  bucket,
  assetSource,
  databaseScope: serviceKey ? "all rows (server key, read-only)" : "public rows only (drafts and hidden rows not visible)",
  localAssets: localFiles.length,
  localAssetsInBucket: localFiles.filter((p) => inBucket.get(p)).length,
  localAssetsMissingFromBucket: localFiles.filter((p) => !inBucket.get(p)),
  codeReferences: codeRefs.size,
  codeReferencesMissingLocally: [...codeRefs.keys()].filter((p) => !localSet.has(p)),
  databaseReferences: dbRefs.length,
  databaseReferencesInBucket: dbRefs.filter((r) => inBucket.get(r.path)).length,
  brokenReferences: broken,
  notes: dbNotes,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Image audit — bucket "${bucket}" · site serves website assets from: ${assetSource} · database scope: ${report.databaseScope}\n`);
  console.log(`Local website assets (public/assets): ${report.localAssets}`);
  console.log(`  already in the bucket:              ${report.localAssetsInBucket}`);
  console.log(`  not in the bucket yet:              ${report.localAssetsMissingFromBucket.length}`);
  console.log(`Paths referenced in code:             ${report.codeReferences} (${report.codeReferencesMissingLocally.length} missing locally)`);
  console.log(`Image paths referenced in database:   ${report.databaseReferences} (${report.databaseReferencesInBucket} of them in the bucket)`);
  for (const r of dbRefs) console.log(`  ${resolvable(r.path) ? "✔" : "✖"} ${r.path} — ${r.where} — served from ${servedFrom(r.path)}${inBucket.get(r.path) ? ", in bucket" : ""}`);
  console.log(`\nBroken references (would not load today): ${broken.length}`);
  for (const b of broken) console.log(`  ✖ ${b.path} — ${b.where}`);
  if (report.codeReferencesMissingLocally.length) console.log(`\nCode references with no local file:\n${report.codeReferencesMissingLocally.map((p) => `  ✖ ${p}`).join("\n")}`);
  if (dbNotes.length) console.log(`\nNotes:\n${dbNotes.map((n) => `  • ${n}`).join("\n")}`);
  console.log(
    report.localAssetsMissingFromBucket.length
      ? `\nKeep NEXT_PUBLIC_ASSET_SOURCE=local until \`npm run assets:upload\` reports all ${report.localAssets} assets verified.`
      : `\nEvery local asset is in the bucket.`,
  );
}
process.exitCode = broken.length ? 1 : 0;
