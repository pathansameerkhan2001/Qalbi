"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion, type HeroSlide } from "./hero-slider";

/** Bucket URLs of the hero film; `mobile` (6:5, lighter) is optional. */
export interface HeroFilmSources {
  desktop: string;
  mobile: string | null;
}

/** Phones: the hero frame is 6:5 here, matching the mobile encode. */
const PHONE = "(max-width: 639px)";

/** Data-saver or slow (2G/3G) connection. */
function isConstrainedConnection() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(connection?.saveData) || /(^|-)(2g|3g)$/.test(connection?.effectiveType ?? "");
}

/** `isConstrainedConnection`, but `false` during SSR and hydration so server and client markup match. */
function useConstrainedConnection() {
  return useSyncExternalStore(() => () => {}, isConstrainedConnection, () => false);
}

/**
 * Hero visual: an art-directed poster image, with the looping, muted film over
 * it when `sources` is given. The poster is never blank and stays the fallback
 * when the film fails, is blocked, or isn't wanted: the <video> has no src
 * until it may play, so nothing is downloaded for reduced-motion, data-saver or
 * slow-connection visitors. Exactly one file is chosen per page view (mobile on
 * phones when available), so resizing never fetches the other. The film fades
 * in once actually playing, pauses while off screen, and has one small pause
 * control (WCAG 2.2.2) instead of browser controls. When the film won't play,
 * `fallback` (if given) replaces the poster; for reduced motion it is chosen by
 * the <picture> itself, so it shows from the first paint.
 */
export function HeroVideo({
  sources,
  poster,
  posterPosition,
  fallback,
  fallbackPosition,
  className,
}: {
  sources: HeroFilmSources | null;
  poster: Omit<HeroSlide, "content">;
  /** CSS object-position for the poster crop (default centred). */
  posterPosition?: string;
  /** Still image for visitors who don't get the film (reduced motion, data saver, slow connection, playback failure). */
  fallback?: Omit<HeroSlide, "content">;
  fallbackPosition?: string;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [shown, setShown] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  // Keep a still image for data-saver and slow (2G/3G) connections.
  const constrained = useConstrainedConnection();
  const enabled = Boolean(sources) && !reduceMotion && !constrained && !failed;
  const still = fallback && sources && !enabled ? fallback : poster;
  const stillPosition = still === fallback ? fallbackPosition : posterPosition;

  useEffect(() => {
    const el = video.current;
    if (!el || !sources) return;
    // Read the preferences directly as well: during hydration the hooks still report the server value (false).
    if (!enabled || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches || isConstrainedConnection()) {
      el.pause();
      return;
    }
    // Choose once: switching on resize would download the other file as well.
    if (!el.getAttribute("src")) el.src = sources.mobile && window.matchMedia(PHONE).matches ? sources.mobile : sources.desktop;
    // React does not reflect `muted` reliably; autoplay policies require it.
    el.muted = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => setFailed(true));
      else el.pause();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, paused, sources]);

  return (
    <div className={cn("relative overflow-hidden bg-[#0b1a10]", className)}>
      <picture className="absolute inset-0 block">
        {fallback && sources && (
          <>
            <source media="(prefers-reduced-motion: reduce) and (min-width: 640px)" srcSet={fallback.desktopSrcSet} sizes="(min-width: 768px) 62vw, 100vw" />
            <source media="(prefers-reduced-motion: reduce)" srcSet={fallback.mobileSrcSet} sizes="100vw" />
          </>
        )}
        <source media="(min-width: 640px)" srcSet={still.desktopSrcSet} sizes="(min-width: 768px) 62vw, 100vw" />
        <source srcSet={still.mobileSrcSet} sizes="100vw" />
        <img src={still.src} width={still.width} height={still.height} alt={still.alt} fetchPriority="high" loading="eager" decoding="async" style={{ objectPosition: stillPosition }} className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      {sources && (
        <video
          ref={video}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden
          tabIndex={-1}
          onPlaying={() => setShown(true)}
          onError={() => setFailed(true)}
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out", shown && !failed ? "opacity-100" : "opacity-0")}
        />
      )}
      {shown && enabled && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play background video" : "Pause background video"}
          aria-pressed={paused}
          className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full border border-ivory/35 bg-ink/30 text-ivory/90 backdrop-blur-sm transition hover:bg-ink/50 hover:text-ivory focus-visible:outline-ivory sm:bottom-5 sm:right-5"
        >
          {paused ? <Play className="size-3.5 translate-x-px" fill="currentColor" aria-hidden /> : <Pause className="size-3.5" fill="currentColor" aria-hidden />}
        </button>
      )}
    </div>
  );
}
