import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: { label: string; href: string; external?: boolean };
  as?: "h1" | "h2";
  align?: "left" | "center";
  className?: string;
  id?: string;
}

export function SectionHeading({ title, eyebrow, description, action, as: Tag = "h2", align = "left", className, id }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "items-center text-center sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <Tag id={id} className="text-h2 text-ink">
          {title}
        </Tag>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[0.95rem]">{description}</p>}
      </div>
      {action &&
        (action.external ? (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-forest underline-offset-4 hover:text-gold hover:underline"
          >
            {action.label} <ArrowRight aria-hidden className="size-4" />
          </a>
        ) : (
          <Link href={action.href} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-forest underline-offset-4 hover:text-gold hover:underline">
            {action.label} <ArrowRight aria-hidden className="size-4" />
          </Link>
        ))}
    </div>
  );
}
