import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Your Bag", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageHeader title="Your Bag" breadcrumbs={[{ label: "Bag" }]} />
      <Container>
        <CartView />
      </Container>
    </>
  );
}
