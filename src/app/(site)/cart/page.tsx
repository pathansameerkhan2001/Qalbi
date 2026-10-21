import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { CartView } from "@/components/cart/cart-view";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { isSupabaseCommerce } from "@/lib/store/catalog";
import { getCheckoutSettings, getDeliveryTerms, qrPaymentReady } from "@/lib/store/settings";
import { isServerWriteConfigured } from "@/lib/supabase/server";
import { getWhatsAppOrderConfig } from "@/lib/whatsapp-order";

export const metadata: Metadata = { title: "Your Bag", robots: { index: false } };

/** On-site checkout is offered only when the database would actually accept an order (same rules as /checkout and place_order()). */
async function onSiteCheckoutOpen(): Promise<boolean> {
  if (isShopifyConfigured() || !isSupabaseCommerce(false) || !isServerWriteConfigured()) return false;
  const settings = await getCheckoutSettings();
  return settings.codEnabled || qrPaymentReady(settings);
}

async function Bag() {
  const store = !isShopifyConfigured() && isSupabaseCommerce(false);
  const [checkoutOpen, whatsapp, delivery] = await Promise.all([onSiteCheckoutOpen(), getWhatsAppOrderConfig(), store ? getDeliveryTerms() : null]);
  return <CartView checkoutOpen={checkoutOpen} whatsapp={whatsapp} delivery={delivery} />;
}

export default function CartPage() {
  return (
    <>
      <PageHeader title="Your Bag" breadcrumbs={[{ label: "Bag" }]} />
      <Container>
        <Suspense fallback={<CartView checkoutOpen={false} />}>
          <Bag />
        </Suspense>
      </Container>
    </>
  );
}
