"use client";

import { useState } from "react";
import { Film, Monitor, Play, Smartphone, X } from "lucide-react";
import { HeroMedia, type HeroStill } from "@/components/home/hero-video";
import { cn } from "@/lib/utils";

export interface SequenceTile {
  key: string;
  kind: "film" | "slide";
  label: string;
  note: string;
  desktopSrc: string;
  mobileSrc: string;
  hasText: boolean;
}

export interface SequenceView {
  tiles: SequenceTile[];
  film: { desktop: string; mobile: string | null } | null;
  poster: HeroStill;
  photos: HeroStill[];
}

/**
 * The homepage hero in order, built by the same rule as the homepage
 * (lib/content/hero.ts). "Play preview" mounts the real hero component, so
 * the film, poster and slideshow behave exactly as visitors see them; it is
 * mounted only on request, so opening this page downloads no video.
 */
export function HeroSequence({ live, withHidden, hiddenCount }: { live: SequenceView; withHidden: SequenceView; hiddenCount: number }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [playing, setPlaying] = useState(false);
  const view = includeHidden ? withHidden : live;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Preview size" className="inline-flex rounded-[3px] border border-line p-0.5">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={cn("inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-1 text-xs capitalize", device === d ? "bg-forest text-ivory" : "text-muted hover:text-ink")}
            >
              {d === "desktop" ? <Monitor className="size-3.5" aria-hidden /> : <Smartphone className="size-3.5" aria-hidden />} {d}
            </button>
          ))}
        </div>
        {hiddenCount > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} className="accent-[var(--color-forest)]" />
            Include {hiddenCount} hidden slide{hiddenCount === 1 ? "" : "s"} (as if shown)
          </label>
        )}
        <button type="button" onClick={() => setPlaying((p) => !p)} className="btn btn-outline btn-sm ml-auto">
          {playing ? <X className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />} {playing ? "Close preview" : "Play preview"}
        </button>
      </div>

      <ol className="flex gap-3 overflow-x-auto pb-2">
        {view.tiles.map((t, i) => (
          <li key={t.key} className={cn("shrink-0", device === "desktop" ? "w-44" : "w-24")}>
            <div className={cn("relative overflow-hidden rounded-[3px] bg-sand ring-1 ring-line", device === "desktop" ? "aspect-[16/9]" : "aspect-[4/5]")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
              <img src={device === "desktop" ? t.desktopSrc : t.mobileSrc} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
              <span className="absolute left-1 top-1 rounded-full bg-ink/70 px-1.5 text-[0.65rem] font-medium tabular-nums text-ivory">{i + 1}</span>
              {t.kind === "film" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-8 items-center justify-center rounded-full bg-ink/60 text-ivory">
                    <Film className="size-4" aria-hidden />
                  </span>
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs font-medium text-ink" title={t.label}>
              {t.label}
            </p>
            <p className="truncate text-[0.7rem] text-muted" title={t.note}>
              {t.note}
              {t.hasText && " · with text"}
            </p>
          </li>
        ))}
      </ol>

      {playing && (
        <div className={cn("mx-auto overflow-hidden rounded-[3px] ring-1 ring-line", device === "desktop" ? "w-full" : "w-full max-w-[22rem]")}>
          {/* Phone frame 4:5 and desktop 16:9 here; the homepage sizes the frame to the viewport. The device switch picks the frame only: the files follow this window's width. */}
          <HeroMedia key={`${includeHidden}`} film={view.film} poster={view.poster} photos={view.photos} className={device === "desktop" ? "aspect-[16/9] w-full" : "aspect-[4/5] w-full"} />
        </div>
      )}
    </div>
  );
}
