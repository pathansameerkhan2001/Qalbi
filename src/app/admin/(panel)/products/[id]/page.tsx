import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { z } from "zod";
import { getAdminProduct, listAdminCategories } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteProductAction } from "@/lib/admin/actions";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { AdminHeading } from "@/components/admin/ui";
import { missingSuggestions } from "@/data/category-suggestions";
import { RowForm } from "@/components/admin/row-form";
import { getCommerceSource } from "@/lib/shopify";
import { ProductForm } from "../product-form";
import { mediaBase, toFormValues } from "../shared";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [product, categories, { saved }] = await Promise.all([getAdminProduct(id), listAdminCategories(), searchParams]);
  if (!product) notFound();
  const readOnly = isShopifyConfigured();

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1 text-sm text-forest">
        <ArrowLeft className="size-4" aria-hidden /> All products
      </Link>
      <AdminHeading title={product.title}>
        <div className="flex items-center gap-4">
          {product.published && getCommerceSource() === "supabase" ? (
            <Link href={`/products/${product.handle}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-forest">
              View on website <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          ) : (
            <span className="text-xs text-muted">{product.published ? "Published (website shows the preview catalogue)" : "Draft — not on the website"}</span>
          )}
          {!readOnly && (
            <RowForm action={deleteProductAction} submitLabel="Delete product" variant="danger" confirm={`Delete “${product.title}”? This cannot be undone. Past orders keep their copy of the product details.`} className="flex">
              <input type="hidden" name="id" value={product.id} />
            </RowForm>
          )}
        </div>
      </AdminHeading>
      {saved && (
        <p role="status" className="mb-4 text-sm text-botanical">
          Product created.
        </p>
      )}
      <ProductForm initial={toFormValues(product)} categories={categories} missingApproved={missingSuggestions(categories).map((s) => s.name)} mediaBase={mediaBase} readOnly={readOnly} />
    </>
  );
}
