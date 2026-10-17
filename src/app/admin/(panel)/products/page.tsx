import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listAdminProducts } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { mediaUrl } from "@/lib/assets";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { AdminHeading, Card, inr, SetupNotice, StatusBadge } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdmin();
  let products: Awaited<ReturnType<typeof listAdminProducts>>;
  try {
    products = await listAdminProducts();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Products" />
        <SetupNotice error={error} />
      </>
    );
  }
  const shopify = isShopifyConfigured();

  return (
    <>
      <AdminHeading title="Products" description={shopify ? "Shopify is connected — manage products in Shopify admin." : "The catalogue sold on the website."}>
        {!shopify && (
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Add product
          </Link>
        )}
      </AdminHeading>
      <Card className="overflow-x-auto">
        {products.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">No products yet. Add your first product.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
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
                      <StatusBadge value={p.published && (p.inventory === null || p.inventory > 0) ? "confirmed" : "cancelled"} />
                      <span className="ml-1 text-xs text-muted">{p.published ? (p.inventory === 0 ? "Out of stock" : "On sale") : "Draft (not published)"}</span>
                    </td>
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
