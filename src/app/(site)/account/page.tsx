import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

/** Customer accounts are handled by Shopify. Set SHOPIFY_CUSTOMER_ACCOUNT_URL to enable sign-in. */
export default function AccountPage() {
  const accountUrl = process.env.SHOPIFY_CUSTOMER_ACCOUNT_URL;
  if (accountUrl?.startsWith("https://")) redirect(accountUrl);

  return (
    <>
      <PageHeader title="Your Account" breadcrumbs={[{ label: "Account" }]} />
      <Container className="max-w-2xl py-14 text-center">
        <p className="font-serif text-2xl text-ink">Customer accounts are coming soon</p>
        <p className="mt-2 text-sm text-muted">
          Order history and sign-in will be available once our online store is live. Need help with an order? We&apos;re happy to assist.
        </p>
        <Link href="/contact" className="btn btn-primary mt-8">Contact us</Link>
      </Container>
    </>
  );
}
