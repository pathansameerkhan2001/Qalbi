import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listAdminCategories } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { AdminHeading } from "@/components/admin/ui";
import { ProductForm } from "../product-form";
import { emptyProduct, mediaBase } from "../shared";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await listAdminCategories();
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1 text-sm text-forest">
        <ArrowLeft className="size-4" aria-hidden /> All products
      </Link>
      <AdminHeading title="New product" />
      <ProductForm initial={emptyProduct} categories={categories} mediaBase={mediaBase} readOnly={isShopifyConfigured()} />
    </>
  );
}
