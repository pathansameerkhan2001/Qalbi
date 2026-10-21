import { ArrowRight, Play } from "lucide-react";
import { brandConfig } from "@/data/brand";
import { InstagramIcon } from "@/components/ui/brand-icons";

/** Reel card visuals, shared by the homepage Reels row and the admin preview. */
export const cardClass = "group relative block aspect-[9/16] overflow-hidden rounded-lg bg-forest-deep ring-1 ring-gold-soft/25 transition duration-500 hover:-translate-y-1 hover:ring-gold-soft/70 hover:shadow-[0_24px_48px_-20px_rgb(0_0_0/0.6)]";
export const itemClass = "w-[46%] shrink-0 sm:w-[31%] md:w-[23.5%] lg:w-[calc((100%-4rem)/5)]";

export function CardOverlay({ title, video }: { title: string; video: boolean }) {
  return (
    <>
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-forest-deep/5 to-transparent" />
      {video ? (
        <span aria-hidden className="absolute left-1/2 top-[42%] flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/60 bg-forest-deep/30 text-ivory backdrop-blur-[2px] transition duration-500 group-hover:scale-110 group-hover:border-gold-soft group-hover:bg-forest-deep/50">
          <Play className="ml-1 size-5 fill-ivory" />
        </span>
      ) : (
        <span aria-hidden className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-ink/25 text-ivory backdrop-blur-sm">
          <InstagramIcon className="size-4" />
        </span>
      )}
      <span className="absolute inset-x-3 bottom-3">
        <span className="block font-serif text-lg leading-tight text-ivory">{title}</span>
        <span aria-hidden className="mt-1 flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.16em] text-gold-pale/90 opacity-80 transition group-hover:opacity-100">
          {brandConfig.instagramHandle} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </>
  );
}
