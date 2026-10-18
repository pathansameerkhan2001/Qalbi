import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { brandConfig } from "@/data/brand";
import { whatsappLink } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { alternates: { canonical: "/faqs" }, title: "FAQs", description: "Answers to common questions about QALBI Naturals." };

/** Only questions answerable from confirmed business information are listed. */
const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "How can I contact QALBI Naturals?",
    a: (
      <>
        Email us at <a className="text-forest underline underline-offset-2" href={brandConfig.emailUrl}>{brandConfig.email}</a> or message us on{" "}
        <a className="text-forest underline underline-offset-2" href={whatsappLink()} target="_blank" rel="noopener noreferrer">WhatsApp ({brandConfig.whatsappNumber})</a>.
      </>
    ),
  },
  {
    q: "Do you offer customised skincare?",
    a: (
      <>
        Yes — share your goals through our <Link className="text-forest underline underline-offset-2" href="/customised-skincare">customised skincare enquiry</Link>. Custom requests depend on available formulations and are confirmed with you before purchase.
      </>
    ),
  },
  {
    q: "Where can I find the ingredients of a product?",
    a: (
      <>
        Each product page lists its ingredients once published. You can also see our featured botanicals on the{" "}
        <Link className="text-forest underline underline-offset-2" href="/ingredients">Ingredients page</Link>, or ask us directly.
      </>
    ),
  },
  {
    q: "Where can I see QALBI's latest updates?",
    a: (
      <>
        Follow <a className="text-forest underline underline-offset-2" href={brandConfig.instagramUrl} target="_blank" rel="noopener noreferrer">{brandConfig.instagramHandle}</a> on Instagram for product moments, rituals and news.
      </>
    ),
  },
  {
    q: "What are your shipping and returns policies?",
    a: (
      <>
        Please see our <Link className="text-forest underline underline-offset-2" href="/policies/shipping-policy">Shipping</Link> and{" "}
        <Link className="text-forest underline underline-offset-2" href="/policies/refund-policy">Returns &amp; Refunds</Link> pages, or contact us with any questions.
      </>
    ),
  },
];

export default function FaqsPage() {
  return (
    <>
      <PageHeader eyebrow="Support" title="Frequently Asked Questions" breadcrumbs={[{ label: "FAQs" }]} />
      <Container className="max-w-3xl py-12 sm:py-16">
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((faq) => (
            <details key={faq.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl text-ink [&::-webkit-details-marker]:hidden">
                {faq.q}
                <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pt-3 text-sm leading-relaxed text-ink/80">{faq.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </>
  );
}
