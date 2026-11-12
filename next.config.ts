import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** Supabase Storage host for website images (public bucket objects only). */
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Admin media uploads (images up to 5 MB; the bucket enforces the same limit).
    serverActions: { bodySizeLimit: "6mb" },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // 75 is the default; 85 for the ingredient close-ups (ingredient-cards.tsx), which would otherwise be coerced to 75 with a warning.
    qualities: [75, 85],
    // Keep optimised copies a week (default 4 h): re-encoding a 2–3 MB admin PNG on a cold request is slow and can time
    // out. Admin uploads always get new, unique paths, so they never go stale; a website file replaced in place under
    // public/assets can be served old for up to a week unless its name changes.
    minimumCacheTTL: 604800,
    // Shopify product media and authorised Instagram media thumbnails.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Floral artwork (scripts/build-florals.mts): URLs carry a content hash (?v=…), so a year is safe.
      { source: "/florals/:file", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Local website images (NEXT_PUBLIC_ASSET_SOURCE=local). Some paths have been replaced in place before, so a day
      // fresh plus a week served-while-revalidating, rather than immutable: repeat visits skip the download, fixes still land.
      { source: "/assets/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
};

export default nextConfig;
