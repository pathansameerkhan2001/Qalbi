import "server-only";
import { z } from "zod";
import type { cookies } from "next/headers";

/**
 * After checkout the browser keeps the order's secret access token in an
 * httpOnly cookie, so only the customer who placed the order can open its
 * confirmation page — the token never appears in a URL.
 */
const COOKIE = "qalbi_orders";
const entries = z.array(z.object({ n: z.string().max(40), t: z.uuid() })).max(10);

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function read(store: CookieStore) {
  try {
    const parsed = entries.safeParse(JSON.parse(store.get(COOKIE)?.value ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function rememberOrder(store: CookieStore, orderNumber: string, token: string) {
  const next = [{ n: orderNumber, t: token }, ...read(store).filter((e) => e.n !== orderNumber)].slice(0, 10);
  store.set(COOKIE, JSON.stringify(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/checkout/confirmation",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function orderToken(store: CookieStore, orderNumber: string): string | null {
  return read(store).find((e) => e.n === orderNumber)?.t ?? null;
}
