import Image from "next/image";
import Link from "next/link";
import { brandAssets, brandConfig } from "@/data/brand";
import { cn } from "@/lib/utils";

/** Four-point star matching the sparkles in the QALBI logo. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 0c.7 6.6 4.9 10.8 12 12-7.1 1.2-11.3 5.4-12 12-.7-6.6-4.9-10.8-12-12C7.1 10.8 11.3 6.6 12 0Z" />
    </svg>
  );
}

/** Positions of the two sparkles inside the logo artwork (percent of width / height). */
const glints = [
  { left: "14%", top: "41%", delay: "0s" },
  { left: "96.2%", top: "10%", delay: "2.4s" },
];

/**
 * Official QALBI logo. The original PNG always renders; when the stylesheet is
 * available a metallic gold finish (same silhouette, via CSS mask) with a slow
 * light sweep and twinkling sparkles is layered exactly on top of it.
 * Falls back to a typographic wordmark only if no logo file is configured.
 */
export function Logo({ className, tone = "gold", preload = false }: { className?: string; tone?: "gold" | "light"; preload?: boolean }) {
  return (
    <Link href="/" aria-label={`${brandConfig.name} — home`} className={cn("logo-link inline-flex flex-col items-center leading-none", className)}>
      {brandAssets.logoSrc ? (
        <span className={cn("relative block overflow-visible", tone === "gold" ? "w-[120px] sm:w-[156px]" : "w-[170px]")}>
          <Image
            src={brandAssets.logoSrc}
            alt={`${brandConfig.name} — ${brandConfig.tagline}`}
            width={brandAssets.logoWidth}
            height={brandAssets.logoHeight}
            preload={preload}
            sizes="(min-width: 640px) 170px, 120px"
            className="block h-auto w-full"
          />
          {brandAssets.logoMaskSrc && (
            <>
              <span
                aria-hidden
                className={cn("logo-mark absolute inset-0", tone === "light" && "logo-mark--light")}
                style={{ "--logo-mask": `url("${brandAssets.logoMaskSrc}")` } as React.CSSProperties}
              />
              {glints.map((g) => (
                <span
                  key={g.left}
                  aria-hidden
                  className="logo-glint pointer-events-none absolute block aspect-square w-[9%] -translate-x-1/2 -translate-y-1/2 opacity-0"
                  style={{ left: g.left, top: g.top, animationDelay: g.delay }}
                >
                  <Sparkle className="block size-full" />
                </span>
              ))}
            </>
          )}
        </span>
      ) : (
        <>
          <span className={cn("font-serif text-[2.15rem] font-semibold italic tracking-tight sm:text-[2.5rem]", tone === "gold" ? "text-gold" : "text-gold-soft")} style={{ lineHeight: 0.9 }}>
            Qalbi
          </span>
          <span className={cn("mt-1 font-serif text-[0.62rem] italic tracking-wide sm:text-[0.68rem]", tone === "gold" ? "text-gold/90" : "text-gold-soft/90")}>
            {brandConfig.tagline}
          </span>
        </>
      )}
    </Link>
  );
}
