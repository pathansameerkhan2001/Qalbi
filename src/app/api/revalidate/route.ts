import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { CATALOG_TAG } from "@/lib/shopify";

/**
 * On-demand catalogue refresh. Point a Shopify webhook (products/collections
 * update) or a manual call at:  POST /api/revalidate?secret=<SHOPIFY_REVALIDATION_SECRET>
 */
export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_REVALIDATION_SECRET ?? "";
  const provided = new URL(request.url).searchParams.get("secret") ?? "";
  const valid =
    secret.length > 0 &&
    provided.length === secret.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(secret));

  if (!valid) return Response.json({ ok: false }, { status: 401 });

  revalidateTag(CATALOG_TAG, "max");
  return Response.json({ ok: true, revalidated: CATALOG_TAG });
}
