import Link from "next/link";
import { Mail } from "lucide-react";
import { brandConfig } from "@/data/brand";
import { footerNavigation } from "@/data/navigation";
import { Container } from "@/components/ui/container";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { whatsappLink } from "@/lib/utils";
import { Logo } from "./logo";

function BotanicalLineArt() {
  return (
    <svg viewBox="0 0 200 260" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden className="pointer-events-none absolute -right-6 bottom-0 hidden h-64 text-gold-soft/25 md:block">
      <path d="M100 258 C 100 190 110 120 150 40" />
      {[[110, 200, -1], [118, 160, 1], [126, 120, -1], [136, 85, 1], [146, 55, -1]].map(([x, y, d], i) => (
        <path key={i} d={`M${x} ${y} C ${x + 30 * d} ${y - 10} ${x + 50 * d} ${y - 35} ${x + 55 * d} ${y - 50} C ${x + 25 * d} ${y - 45} ${x + 5 * d} ${y - 25} ${x} ${y}`} />
      ))}
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-forest text-ivory">
      <BotanicalLineArt />
      <Container className="relative grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.1fr_repeat(3,0.7fr)_1.4fr] lg:gap-8 lg:py-16">
        <div className="flex flex-col items-start gap-4">
          <Logo tone="light" className="items-start" />
          <p className="max-w-xs text-sm leading-relaxed text-ivory/70">{brandConfig.description}</p>
        </div>

        {footerNavigation.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="mb-4 font-sans text-sm font-medium tracking-wide text-ivory">{group.title}</h2>
            <ul className="space-y-2.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-underline text-sm text-ivory/70 hover:text-ivory">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="md:col-span-2 lg:col-span-1">
          <h2 className="mb-4 font-sans text-sm font-medium tracking-wide text-ivory">Join Our Newsletter</h2>
          <NewsletterForm />
          <ul className="mt-5 flex items-center gap-3" aria-label="Contact and social links">
            <li>
              <a href={brandConfig.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="QALBI Naturals on Instagram" className="inline-flex size-10 items-center justify-center rounded-full border border-ivory/25 text-ivory/85 transition hover:border-gold-soft hover:text-gold-soft">
                <InstagramIcon className="size-[1.05rem]" />
              </a>
            </li>
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label="Chat with QALBI on WhatsApp" className="inline-flex size-10 items-center justify-center rounded-full border border-ivory/25 text-ivory/85 transition hover:border-gold-soft hover:text-gold-soft">
                <WhatsAppIcon className="size-[1.05rem]" />
              </a>
            </li>
            <li>
              <a href={brandConfig.emailUrl} aria-label={`Email ${brandConfig.email}`} className="inline-flex size-10 items-center justify-center rounded-full border border-ivory/25 text-ivory/85 transition hover:border-gold-soft hover:text-gold-soft">
                <Mail className="size-[1.05rem]" aria-hidden />
              </a>
            </li>
          </ul>
        </div>
      </Container>
      <div className="relative border-t border-ivory/10">
        <Container className="flex flex-col gap-2 py-5 text-xs text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {brandConfig.name}. All rights reserved.</p>
          <p>
            <a href={brandConfig.emailUrl} className="hover:text-ivory">{brandConfig.email}</a>
            <span className="mx-2" aria-hidden>·</span>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="hover:text-ivory">WhatsApp {brandConfig.whatsappNumber}</a>
          </p>
        </Container>
      </div>
    </footer>
  );
}
