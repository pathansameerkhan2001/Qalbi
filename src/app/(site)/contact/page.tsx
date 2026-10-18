import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { brandConfig } from "@/data/brand";
import { whatsappLink } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact Us",
  description: "Get in touch with QALBI Naturals by email, WhatsApp or Instagram.",
};

const channels = [
  { label: "Email", value: brandConfig.email, href: brandConfig.emailUrl, icon: Mail, external: false },
  { label: "WhatsApp", value: brandConfig.whatsappNumber, href: whatsappLink(), icon: WhatsAppIcon, external: true },
  { label: "Instagram", value: brandConfig.instagramHandle, href: brandConfig.instagramUrl, icon: InstagramIcon, external: true },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="We’re Here to Help"
        description="Questions about a product, an order or customised skincare? Reach out — we’d love to hear from you."
        breadcrumbs={[{ label: "Contact" }]}
      />
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <section aria-labelledby="channels-heading">
          <h2 id="channels-heading" className="text-h3 text-ink">Reach us directly</h2>
          <ul className="mt-6 space-y-3">
            {channels.map(({ label, value, href, icon: Icon, external }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-4 rounded-[3px] border border-line bg-ivory p-4 transition hover:border-sage hover:shadow-soft"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/50 text-gold">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-xs uppercase tracking-[0.15em] text-muted">{label}</span>
                    <span className="block break-all font-medium text-ink">{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="form-heading" className="rounded-[3px] border border-line bg-ivory p-5 sm:p-8">
          <h2 id="form-heading" className="mb-5 text-h3 text-ink">Send us a message</h2>
          <ContactForm />
        </section>
      </Container>
    </>
  );
}
