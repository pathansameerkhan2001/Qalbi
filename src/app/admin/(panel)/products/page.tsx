import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { listAdminProducts } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { mediaUrl } from "@/lib/assets";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { getCommerceSource } from "@/lib/shopify";
import { productVisibility } from "@/lib/admin/product-rules";
import { setProductPublishedAction } from "@/lib/admin/actions";
import { RowForm } from "@/components/admin/row-form";
import { cn } from "@/lib/utils";
import { AdminHeading, Card, inr, SetupNotice } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Products" };

const visibilityLabel = { draft: "Draft", "on-sale": "On sale", "out-of-stock": "Out of stock" } as const;
const visibilityTone = { draft: "bg-line text-muted", "on-sale": "bg-botanical/15 text-forest", "out-of-stock": "bg-gold-pale text-[#7a5418]" } as const;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const { deleted } = await searchParams;
  let products: Awaited<ReturnType<typeof listAdminProducts>>;
  try {
    products = await listAdminProducts();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Products" />
        <SetupNotice error={error} migration="store" />
      </>
    );
  }
  const shopify = isShopifyConfigured();
  const live = getCommerceSource() === "supabase";
  const counts = { draft: 0, "on-sale": 0, "out-of-stock": 0 };
  for (const p of products) counts[productVisibility(p)]++;

  return (
    <>
      <AdminHeading title="Products" description={shopify ? "Shopify is connected — manage products in Shopify admin." : "The catalogue sold on the website."}>
        {!shopify && (
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Add product
          </Link>
        )}
      </AdminHeading>
      {!shopify && !live && (
        <Card className="mb-4 border-gold/40 bg-gold-pale/40 p-4 text-sm">
          <strong className="font-medium">These products are not on the website yet.</strong> The storefront is showing its built-in preview catalogue because{" "}
          <code className="rounded bg-ivory px-1">COMMERCE_SOURCE=supabase</code> is not set. Products saved here are stored in the database and appear on the website as soon as that setting is
          enabled (see the Dashboard checklist).
        </Card>
      )}
      {deleted && (
        <p role="status" className="mb-3 text-sm text-botanical">
          Product deleted.
        </p>
      )}
      {products.length > 0 && (
        <p className="mb-3 text-sm text-muted" role="status">
          {products.length} product{products.length === 1 ? "" : "s"} · {counts["on-sale"]} on sale · {counts["out-of-stock"]} out of stock · {counts.draft} draft
        </p>
      )}
      <Card className="overflow-x-auto">
        {products.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">No products yet. Add your first product.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {!shopify && (
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Publish or unpublish</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => {
                const image = p.images[0];
                return (
                  <tr key={p.id} className="hover:bg-sand/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-[3px] border border-line bg-sand">
                          {image && <Image src={mediaUrl(image.path)} alt="" fill sizes="48px" className="object-cover" />}
                        </span>
                        <span>
                          <span className="block font-medium text-forest hover:underline">{p.title}</span>
                          <span className="text-xs text-muted">/{p.handle}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{inr(p.price)}</td>
                    <td className="px-4 py-3 tabular-nums">{p.inventory ?? <span className="text-muted">Not tracked</span>}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[0.7rem] font-medium", visibilityTone[productVisibility(p)])}>{visibilityLabel[productVisibility(p)]}</span>
                      {live && p.published && (
                        <Link href={`/products/${p.handle}`} target="_blank" className="ml-2 inline-flex items-center gap-1 text-xs text-forest">
                          View <ExternalLink className="size-3" aria-hidden />
                        </Link>
                      )}
                    </td>
                    {!shopify && (
                      <td className="px-4 py-3 text-right">
                        <RowForm
                          action={setProductPublishedAction}
                          submitLabel={p.published ? "Unpublish" : "Publish"}
                          confirm={p.published ? `Hide “${p.title}” from customers? It stays saved as a draft.` : undefined}
                          className="flex justify-end"
                        >
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="publish" value={p.published ? "false" : "true"} />
                        </RowForm>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
