import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 1. Admin area: keeps the Supabase auth session fresh (refreshes the access
 *    token cookie before it expires). This is not the authorization check —
 *    every admin page and server action verifies the administrator on the
 *    server via requireAdmin().
 * 2. Storefront product and category pages (database catalogue only): answers
 *    drafts, hidden categories and unknown handles with a real 404 status.
 *    The pages stream (Partial Prerendering), so once they start rendering the
 *    status is fixed at 200 and notFound() can only add a noindex tag.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!request.nextUrl.pathname.startsWith("/admin")) return catalogueNotFound(request, url, key);

  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

/** Handles confirmed to exist recently. Only hits are remembered, so a newly published product is never held back. */
const known = new Map<string, number>();
const KNOWN_TTL_MS = 60_000;

async function catalogueNotFound(request: NextRequest, url: string | undefined, key: string | undefined) {
  const match = /^\/(products|collections)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(request.nextUrl.pathname);
  // Only the database catalogue is checked here (Shopify and the preview catalogue are handled by the pages).
  const databaseCatalogue = process.env.COMMERCE_SOURCE === "supabase" && !process.env.SHOPIFY_STORE_DOMAIN;
  if (!match || !databaseCatalogue || !url || !key || match[2] === "bestsellers") return NextResponse.next();

  const [, kind, handle] = match;
  const cacheKey = `${kind}/${handle}`;
  if ((known.get(cacheKey) ?? 0) > Date.now()) return NextResponse.next();

  // Visitor (anon) rights: row level security returns only published products and active categories.
  const table = kind === "products" ? "products" : "categories";
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?select=id&slug=eq.${handle}&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    // Unexpected database answers fall through to the page, which shows its own error or not-found state.
    if (!res.ok) return NextResponse.next();
    const rows = (await res.json()) as unknown[];
    if (rows.length > 0) {
      known.set(cacheKey, Date.now() + KNOWN_TTL_MS);
      return NextResponse.next();
    }
  } catch {
    return NextResponse.next();
  }
  // No route matches this path, so Next.js renders app/not-found.tsx with a 404 status.
  return NextResponse.rewrite(new URL("/_catalogue-not-found", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/products/:handle", "/collections/:handle"],
};
