import Link from "next/link";
import { cacheLife } from "next/cache";
import { Mail } from "lucide-react";
import { brandConfig } from "@/data/brand";
import { footerExploreLinks } from "@/data/navigation";
import type { NavLink } from "@/types/content";
import { Container } from "@/components/ui/container";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { getCollections, getPolicy, policyHandles, type PolicyHandle } from "@/lib/shopify";
import { getContactSettings } from "@/lib/store/settings";
import { deliveryStatus } from "@/lib/server/delivery";
import { Logo } from "./logo";

const policyLabels: Record<PolicyHandle, string> = {
  "shipping-policy": "Shipping",
  "refund-policy": "Returns & Refunds",
  "privacy-policy": "Privacy Policy",
  "terms-of-service": "Terms & Conditions",
};

/** Year for the copyright line (cached so prerendering never reads the clock directly). */
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

function LinkGroup({ title, links }: { title: string; links: NavLink[] }) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 font-sans text-[0.72rem] font-medium uppercase tracking-[0.16em] text-gold-soft">{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            {/* py-1.5 keeps every link a comfortable touch target without large gaps. */}
            <Link href={link.href} className="inline-block py-1.5 text-sm text-ivory/75 transition hover:text-ivory">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const iconLink = "inline-flex size-10 items-center justify-center rounded-full border border-ivory/25 text-ivory/85 transition hover:border-gold-soft hover:text-gold-soft";

/**
 * Storefront footer. Shows only links that lead somewhere real: shop links from
 * the live collections, policy links only once a policy has content, and the
 * newsletter only when sign-ups are actually delivered somewhere.
 */
export async function Footer() {
  const [collections, contact, policies, year] = await Promise.all([
    getCollections(),
    getContactSettings(),
    Promise.all(policyHandles.map(async (handle) => ((await getPolicy(handle)) ? handle : null))),
    currentYear(),
  ]);

  const shopLinks: NavLink[] = [
    { label: "All Products", href: "/products" },
    ...collections.slice(0, 5).map((c) => ({ label: c.title, href: `/collections/${c.handle}` })),
    { label: "Customised Skincare", href: "/customised-skincare" },
  ];
  const policyLinks = policies.filter((h): h is PolicyHandle => h !== null).map((h) => ({ label: policyLabels[h], href: `/policies/${h}` }));
  const whatsappHref = `https://wa.me/${contact.whatsappDigits}?text=${encodeURIComponent(brandConfig.defaultWhatsappMessage)}`;

  return (
    <footer className="relative overflow-hidden bg-forest text-ivory">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:py-14 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr] lg:gap-x-10 lg:py-16">
        <div className="col-span-2 flex flex-col items-start gap-4 lg:col-span-1">
          <Logo tone="light" className="items-start" />
          <p className="max-w-xs text-sm leading-relaxed text-ivory/70">{brandConfig.description}</p>
          <ul className="flex items-center gap-3" aria-label="Social and contact links">
            <li>
              <a href={brandConfig.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brandConfig.name} on Instagram (opens Instagram)`} className={iconLink}>
                <InstagramIcon className="size-[1.05rem]" />
              </a>
            </li>
            <li>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label={`Chat with ${brandConfig.shortName} on WhatsApp (opens WhatsApp)`} className={iconLink}>
                <WhatsAppIcon className="size-[1.05rem]" />
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} aria-label={`Email ${contact.email}`} className={iconLink}>
                <Mail className="size-[1.05rem]" aria-hidden />
              </a>
            </li>
          </ul>
        </div>

        <LinkGroup title="Shop" links={shopLinks} />
        <LinkGroup title="Explore" links={footerExploreLinks} />

        <div className="col-span-2 space-y-8 lg:col-span-1">
          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="mb-3 font-sans text-[0.72rem] font-medium uppercase tracking-[0.16em] text-gold-soft">
              Contact
            </h2>
            <ul className="space-y-1 text-sm">
              <li>
                <a href={`mailto:${contact.email}`} className="inline-block break-all py-1.5 text-ivory/75 transition hover:text-ivory">
                  {contact.email}
                </a>
              </li>
              <li>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-block py-1.5 text-ivory/75 transition hover:text-ivory">
                  WhatsApp {contact.whatsappDisplay}
                </a>
              </li>
            </ul>
          </section>
          {deliveryStatus.newsletter && (
            <section aria-labelledby="footer-newsletter">
              <h2 id="footer-newsletter" className="mb-3 font-sans text-[0.72rem] font-medium uppercase tracking-[0.16em] text-gold-soft">
                Newsletter
              </h2>
              <NewsletterForm />
            </section>
          )}
        </div>
      </Container>

      <div className="border-t border-ivory/10">
        <Container className="flex flex-col gap-3 py-5 text-xs text-ivory/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {brandConfig.name}. All rights reserved.
          </p>
          {policyLinks.length > 0 && (
            <nav aria-label="Policies">
              <ul className="flex flex-wrap gap-x-5 gap-y-1">
                {policyLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-block py-1 hover:text-ivory">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </Container>
      </div>
    </footer>
  );
}
