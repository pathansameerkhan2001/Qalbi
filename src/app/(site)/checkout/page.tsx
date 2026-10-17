import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoaderCircle, ShoppingBag } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { buildLocalCart, readLocalLines } from "@/lib/cart/local";
import { getStoreProducts, isSupabaseCommerce } from "@/lib/store/catalog";
import { deliveryChargeFor, getCheckoutSettings, getContactSettings, qrPaymentReady } from "@/lib/store/settings";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { whatsappLink } from "@/lib/utils";
import { CheckoutForm, type CheckoutSummary } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <>
      <PageHeader title="Checkout" breadcrumbs={[{ label: "Bag", href: "/cart" }, { label: "Checkout" }]} />
      <Container className="py-10">
        <Suspense
          fallback={
            <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted">
              <LoaderCircle className="size-5 animate-spin" aria-hidden /> Loading checkout…
            </p>
          }
        >
          <CheckoutContent />
        </Suspense>
      </Container>
    </>
  );
}

async function CheckoutContent() {
  if (isShopifyConfigured() || !isSupabaseCommerce(false)) {
    return (
      <Notice title="Online ordering is not open yet">
        To order, message us on{" "}
        <a href={whatsappLink("Hello QALBI Naturals, I would like to place an order.")} className="text-forest underline" target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>{" "}
        and we&apos;ll help you right away.
      </Notice>
    );
  }

  const [lines, products, settings, contact] = await Promise.all([readLocalLines(), getStoreProducts(), getCheckoutSettings(), getContactSettings()]);
  const cart = buildLocalCart(lines, products);

  if (cart.lines.length === 0) {
    return (
      <Notice title="Your bag is empty">
        <Link href="/products" className="btn btn-primary mt-6">
          <ShoppingBag className="size-4" aria-hidden /> Shop products
        </Link>
      </Notice>
    );
  }

  const unavailable = cart.lines.filter((l) => !products.find((p) => p.variants[0]?.id === l.merchandise.id)?.availableForSale);
  const subtotal = cart.cost.subtotalAmount.amount;
  const delivery = deliveryChargeFor(subtotal, settings);
  const summary: CheckoutSummary = {
    lines: cart.lines.map((l) => ({
      id: l.id,
      title: l.merchandise.product.title,
      quantity: l.quantity,
      unitPrice: l.merchandise.price.amount,
      lineTotal: l.cost.totalAmount.amount,
      image: l.merchandise.product.featuredImage,
    })),
    subtotal,
    delivery,
    total: subtotal + delivery,
    freeDeliveryOver: settings.freeDeliveryOver,
    methods: { COD: settings.codEnabled, PHONE: qrPaymentReady(settings) },
    contact: { whatsappDisplay: contact.whatsappDisplay, email: contact.email },
    unavailableTitles: unavailable.map((l) => l.merchandise.product.title),
  };

  return <CheckoutForm summary={summary} />;
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="font-serif text-3xl text-ink">{title}</p>
      <div className="mt-3 text-sm text-muted">{children}</div>
    </div>
  );
}
