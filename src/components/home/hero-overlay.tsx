import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isExternalLink } from "@/lib/content/rules";
import type { HeroContent } from "@/lib/content/hero";

export { hasHeroContent, type HeroContent } from "@/lib/content/hero";

/**
 * Optional heading / subtitle / button over a hero slide. A bottom gradient
 * keeps ivory text readable on any photograph. Shared by the storefront slider
 * and the admin preview so both look identical.
 */
export function HeroOverlay({ content, headingLevel = "p", inert = false }: { content: HeroContent; headingLevel?: "h2" | "p"; inert?: boolean }) {
  const Heading = headingLevel;
  const external = content.buttonHref ? isExternalLink(content.buttonHref) : false;
  const buttonClass = "btn btn-light btn-sm mt-4 pointer-events-auto sm:mt-5";
  return (
    <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-ink/70 via-ink/20 to-transparent">
      {/* Bottom padding clears the hero's slideshow controls (bottom-left, hero-video.tsx). */}
      <div className="mx-auto w-full max-w-[1320px] px-5 pb-20 sm:px-8 sm:pb-24 lg:pb-28">
        <div className="max-w-xl text-ivory">
          {content.heading && <Heading className="font-serif text-[2rem] leading-[1.1] text-balance sm:text-5xl">{content.heading}</Heading>}
          {content.subtitle && <p className="mt-2 max-w-md text-sm leading-relaxed text-ivory/85 sm:mt-3 sm:text-base">{content.subtitle}</p>}
          {content.buttonLabel &&
            content.buttonHref &&
            (inert ? (
              <span className={buttonClass}>
                {content.buttonLabel} <ArrowRight className="size-4" aria-hidden />
              </span>
            ) : external ? (
              <a href={content.buttonHref} target="_blank" rel="noopener noreferrer" className={buttonClass}>
                {content.buttonLabel} <ArrowRight className="size-4" aria-hidden />
              </a>
            ) : (
              <Link href={content.buttonHref} className={buttonClass}>
                {content.buttonLabel} <ArrowRight className="size-4" aria-hidden />
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
