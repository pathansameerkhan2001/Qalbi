import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { assetUrl } from "@/lib/assets";
import { SprigOrnament } from "@/components/ui/botanical-icons";

const BRANDNIX_INSTAGRAM = "https://www.instagram.com/_brandnix/?hl=en";

/**
 * Developer credit, directly above the footer: a quiet cream band with the
 * QALBI sprig divider, easing the page into the dark-green footer. The
 * Brandnix mark and name are one link to Brandnix's Instagram (new tab).
 */
export function DeveloperCredit() {
  return (
    <div className="border-t border-line/70 bg-cream">
      <div className="mx-auto flex max-w-[1320px] flex-col items-center gap-3 px-5 py-6 sm:gap-4 sm:px-8 sm:py-8">
        <SprigOrnament className="text-gold/70" />
        <p className="flex flex-col items-center gap-2.5 text-center sm:flex-row sm:gap-4">
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-muted">Designed &amp; Developed by</span>
          <a
            href={BRANDNIX_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Brandnix on Instagram (opens in a new tab)"
            className="group inline-flex items-center gap-2.5 rounded-full border border-gold-soft/45 bg-ivory py-1 pl-1 pr-3.5 text-forest shadow-[0_1px_0_rgb(168_130_63/0.08)] transition duration-300 hover:-translate-y-px hover:border-gold hover:shadow-[0_6px_18px_-8px_rgb(41_69_50/0.35)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {/* A 1.4 KB, 128 px file: served as is, so it stays sharp on 3x screens (the optimiser would cap it at 2x). */}
            <Image src={assetUrl("brand/brandnix-mark.webp")} alt="" width={36} height={36} unoptimized className="size-9 rounded-full" />
            <span className="font-serif text-lg leading-none tracking-wide">Brandnix</span>
            <ArrowUpRight className="size-3.5 text-gold transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </a>
        </p>
      </div>
    </div>
  );
}
