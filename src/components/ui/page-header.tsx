import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { breadcrumbJsonLd } from "@/lib/site";
import { Container } from "./container";

interface PageHeaderProps {
  title: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  children?: React.ReactNode;
  /** Optional banner photo, shown beside the text on wide screens and above it on phones. */
  image?: { url: string; alt: string } | null;
}

export function PageHeader({ title, eyebrow, description, breadcrumbs, children, image }: PageHeaderProps) {
  return (
    <div className="border-b border-line bg-sand">
      <Container className="py-8 sm:py-12">
        {breadcrumbs && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd(breadcrumbs) }} />
        )}
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
              <li>
                <Link href="/" className="hover:text-forest">Home</Link>
              </li>
              {breadcrumbs.map((crumb) => (
                <li key={crumb.label} className="flex items-center gap-1">
                  <ChevronRight aria-hidden className="size-3" />
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-forest">{crumb.label}</Link>
                  ) : (
                    <span aria-current="page" className="text-ink">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className={image ? "grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-12" : undefined}>
          <div>
            {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
            <h1 className="text-h2 text-ink sm:text-[2.9rem]">{title}</h1>
            {description && <div className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-[0.95rem]">{description}</div>}
            {children}
          </div>
          {image && (
            <div className="relative order-first aspect-[4/3] overflow-hidden rounded-2xl border border-gold-soft/45 bg-ivory shadow-soft md:order-none">
              {/* Above the fold on every screen: load it straight away. */}
              <Image src={image.url} alt={image.alt} fill preload sizes="(min-width: 1024px) 448px, (min-width: 768px) 352px, 100vw" className="object-cover" />
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
