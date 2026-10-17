import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "./container";

interface PageHeaderProps {
  title: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  children?: React.ReactNode;
}

export function PageHeader({ title, eyebrow, description, breadcrumbs, children }: PageHeaderProps) {
  return (
    <div className="border-b border-line bg-sand">
      <Container className="py-8 sm:py-12">
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
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-h2 text-ink sm:text-[2.9rem]">{title}</h1>
        {description && <div className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-[0.95rem]">{description}</div>}
        {children}
      </Container>
    </div>
  );
}
