import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { brandConfig } from "@/data/brand";
import { getPolicy, policyHandles, type PolicyHandle } from "@/lib/shopify";
import { sanitizeHtml, whatsappLink } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

const titles: Record<PolicyHandle, string> = {
  "privacy-policy": "Privacy Policy",
  "refund-policy": "Returns & Refunds",
  "shipping-policy": "Shipping Policy",
  "terms-of-service": "Terms & Conditions",
};

const isPolicy = (slug: string): slug is PolicyHandle => (policyHandles as string[]).includes(slug);

export function generateStaticParams() {
  return policyHandles.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: isPolicy(slug) ? titles[slug] : "Policy" };
}

async function PolicyContent({ params }: { params: PageProps<"/policies/[slug]">["params"] }) {
  const { slug } = await params;
  if (!isPolicy(slug)) notFound();
  const policy = await getPolicy(slug);

  return (
    <>
      <PageHeader eyebrow="Support" title={policy?.title ?? titles[slug]} breadcrumbs={[{ label: titles[slug] }]} />
      <Container className="max-w-3xl py-12 sm:py-16">
        {policy ? (
          <div
            className="space-y-4 text-sm leading-relaxed text-ink/85 [&_a]:text-forest [&_a]:underline [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(policy.body) }}
          />
        ) : (
          <div className="rounded-[3px] border border-dashed border-line bg-ivory/60 p-6 sm:p-8">
            <p className="font-serif text-2xl text-ink">This policy is being finalised</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Our full {titles[slug].toLowerCase()} will be published here soon. In the meantime, please contact us at{" "}
              <a href={brandConfig.emailUrl} className="text-forest underline underline-offset-2">{brandConfig.email}</a> or on{" "}
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="text-forest underline underline-offset-2">WhatsApp</a> with any questions.
            </p>
          </div>
        )}
      </Container>
    </>
  );
}

export default function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  return (
    <Suspense fallback={<div className="h-44 border-b border-line bg-sand" />}>
      <PolicyContent params={params} />
    </Suspense>
  );
}
