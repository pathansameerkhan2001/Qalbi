import Link from "next/link";
import { cacheLife } from "next/cache";
import { Mail } from "lucide-react";
import { brandConfig } from "@/data/brand";
import { footerExploreLinks, footerHelpLinks } from "@/data/navigation";
import type { NavLink } from "@/types/content";
import { Container } from "@/components/ui/container";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { SprigOrnament } from "@/components/ui/botanical-icons";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { getCollections, getPolicy, policyHandles, type PolicyHandle } from "@/lib/shopify";
import { getContactSettings } from "@/lib/store/settings";
import { deliveryStatus } from "@/lib/server/delivery";
import { Logo } from "./logo";

const policyLabels: Record<PolicyHandle, string> = {
  "shipping-policy": "Shipping Policy",
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

const groupTitle = "mb-4 font-sans text-[0.7rem] font-medium uppercase tracking-[0.2em] text-gold-soft";
const footerLink = "inline-block py-1.5 text-sm text-ivory/72 transition hover:text-ivory focus-visible:text-ivory";

function LinkGroup({ title, links }: { title: string; links: NavLink[] }) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={title}>
      <h2 className={groupTitle}>{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={footerLink}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const iconLink = "inline-flex size-10 items-center justify-center rounded-full border border-gold-soft/35 text-ivory/85 transition hover:border-gold-soft hover:bg-ivory/5 hover:text-gold-soft";

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
      {/* Fine gold rule at the top edge. */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-soft/60 to-transparent" />

      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 pb-10 pt-14 sm:grid-cols-3 sm:pt-16 lg:grid-cols-12 lg:gap-x-8 lg:pb-12 lg:pt-20">
        <div className="col-span-2 flex flex-col items-start gap-5 sm:col-span-3 lg:col-span-4 lg:pr-6">
          <Logo tone="light" className="items-start" />
          <p className="max-w-sm text-sm leading-relaxed text-ivory/70">{brandConfig.description}</p>
          <ul className="flex items-center gap-2.5" aria-label="Social and contact links">
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

        <div className="lg:col-span-3">
          <LinkGroup title="Shop" links={shopLinks} />
        </div>
        <div className="lg:col-span-2">
          <LinkGroup title="Discover" links={footerExploreLinks} />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-10 sm:col-span-1 sm:grid-cols-1 lg:col-span-3">
          <LinkGroup title="Help" links={[...footerHelpLinks, ...policyLinks]} />
          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className={groupTitle}>
              Get in Touch
            </h2>
            <ul className="text-sm">
              <li>
                <a href={`mailto:${contact.email}`} className={`${footerLink} break-all`}>
                  {contact.email}
                </a>
              </li>
              <li>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={footerLink}>
                  WhatsApp {contact.whatsappDisplay}
                </a>
              </li>
              <li>
                <a href={brandConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className={footerLink}>
                  Instagram {brandConfig.instagramHandle}
                </a>
              </li>
            </ul>
          </section>
        </div>

        {deliveryStatus.newsletter && (
          <section aria-labelledby="footer-newsletter" className="col-span-2 border-t border-ivory/10 pt-8 sm:col-span-3 lg:col-span-12 lg:grid lg:grid-cols-12 lg:items-center lg:gap-8">
            <div className="lg:col-span-5">
              <h2 id="footer-newsletter" className="font-serif text-2xl text-ivory">
                Notes from the QALBI studio
              </h2>
              <p className="mt-1 text-sm text-ivory/65">New rituals and launches, occasionally. Unsubscribe any time.</p>
            </div>
            <div className="mt-4 lg:col-span-7 lg:mt-0">
              <NewsletterForm />
            </div>
          </section>
        )}
      </Container>

      <Container>
        <SprigOrnament className="justify-center text-gold-soft/70 before:w-full before:max-w-[40%] after:w-full after:max-w-[40%]" />
      </Container>

      <Container className="flex flex-col items-center gap-2 py-6 text-center text-xs text-ivory/55 sm:flex-row sm:justify-between sm:text-left">
        <p>
          © {year} {brandConfig.name}. All rights reserved.
        </p>
        <p className="font-serif text-sm italic tracking-wide text-gold-soft/80">{brandConfig.tagline}</p>
      </Container>
    </footer>
  );
}
