"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion, type HeroSlide } from "./hero-slider";

/** Bucket URLs of the hero film; `mobile` (6:5, lighter) is optional. */
export interface HeroFilmSources {
  desktop: string;
  mobile: string | null;
}

/** A hero image with the CSS object-position that keeps its product in frame (default centred). */
export type HeroStill = Omit<HeroSlide, "content"> & { position?: string };

/** Phones: the hero frame is 6:5 here, matching the mobile encode. */
const PHONE = "(max-width: 639px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const PHOTO_INTERVAL = 6000;

/** Data-saver or slow (2G/3G) connection. */
function isConstrainedConnection() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(connection?.saveData) || /(^|-)(2g|3g)$/.test(connection?.effectiveType ?? "");
}

/** `isConstrainedConnection`, but `false` during SSR and hydration so server and client markup match. */
function useConstrainedConnection() {
  return useSyncExternalStore(() => () => {}, isConstrainedConnection, () => false);
}

/** Starts the film, choosing its file on first use: exactly one per page view (mobile on phones when available), so resizing never fetches the other. */
function playFilm(el: HTMLVideoElement, film: HeroFilmSources, onBlocked: () => void, onFailed: () => void) {
  if (!el.getAttribute("src")) el.src = film.mobile && window.matchMedia(PHONE).matches ? film.mobile : film.desktop;
  // React does not reflect `muted` reliably; autoplay policies require it.
  el.muted = true;
  el.play().catch((error: DOMException) => {
    if (error.name === "NotAllowedError") onBlocked();
    // AbortError: a pause() or new src interrupted this play() — not a failure.
    else if (error.name !== "AbortError") onFailed();
  });
}

function Still({ still, priority = false, imgClassName }: { still: HeroStill; priority?: boolean; imgClassName?: string }) {
  return (
    <picture className="absolute inset-0 block">
      <source media="(min-width: 640px)" srcSet={still.desktopSrcSet} sizes="(min-width: 768px) 62vw, 100vw" />
      <source srcSet={still.mobileSrcSet} sizes="100vw" />
      <img
        src={still.src}
        width={still.width}
        height={still.height}
        alt={still.alt}
        fetchPriority={priority ? "high" : "low"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: still.position }}
        className={cn("absolute inset-0 h-full w-full object-cover", imgClassName)}
      />
    </picture>
  );
}

const glass = "border border-ivory/40 bg-ink/45 text-ivory shadow-[0_6px_24px_rgb(0_0_0/0.22)] backdrop-blur-md";
const iconButton = "flex size-11 items-center justify-center rounded-full transition hover:bg-ivory/15 focus-visible:outline-ivory";

/**
 * Hero visual: QALBI's film first, then a crossfading slideshow of the real
 * product photos — never both at once. Without a film the slideshow starts
 * straight away.
 *
 * The film autoplays muted where allowed and goes to the photos when it ends
 * or fails (with a button to watch / retry it). Its poster is the first paint
 * and stays up, with a play button, when autoplay is blocked or not wanted:
 * the <video> has no src until it may play, so reduced-motion, data-saver and
 * slow-connection visitors download nothing unless they press play. Film and
 * slideshow pause while off screen; the slideshow also holds on hover or
 * keyboard focus, stops for good once a visitor navigates or pauses it, and never
 * advances (or zooms) for reduced-motion visitors. Each photo is fetched only
 * when it is next, one ahead of the one on screen.
 */
export function HeroMedia({ film, poster, photos, className }: { film: HeroFilmSources | null; poster: HeroStill; photos: HeroStill[]; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"film" | "photos">(film ? "film" : "photos");
  // The visitor's play / pause choice; null = autoplay rules decide.
  const [choice, setChoice] = useState<"play" | "pause" | null>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  // How many photos are mounted (and so fetched); only grows.
  const [mounted, setMounted] = useState(film ? 0 : 2);
  const [stopped, setStopped] = useState(false);
  const [held, setHeld] = useState(false);
  const [status, setStatus] = useState("");
  const reduceMotion = usePrefersReducedMotion();
  const constrained = useConstrainedConnection();

  const onPhotos = phase === "photos" || failed;
  const wantFilm = Boolean(film) && !onPhotos && (choice ? choice === "play" : !reduceMotion && !constrained);
  const autoAdvance = onPhotos && photos.length > 1 && !stopped && !reduceMotion;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el || !film) return;
    // Read the preferences directly as well: during hydration the hooks still report the server value (false).
    const unwanted = choice === null && (window.matchMedia(REDUCED_MOTION).matches || isConstrainedConnection());
    if (!wantFilm || !visible || unwanted) {
      el.pause();
      return;
    }
    playFilm(
      el,
      film,
      () => setChoice("pause"),
      () => {
        setFailed(true);
        setMounted((n) => Math.max(n, 2));
      },
    );
  }, [film, wantFilm, visible, choice]);

  useEffect(() => {
    if (!autoAdvance || held || !visible) return;
    const id = window.setTimeout(() => {
      const next = (active + 1) % photos.length;
      setPrevious(active);
      setActive(next);
      setMounted((n) => Math.max(n, next + 2));
    }, PHOTO_INTERVAL);
    return () => window.clearTimeout(id);
  }, [active, autoAdvance, held, visible, photos.length]);

  function showPhoto(i: number) {
    if (i !== active) {
      setPrevious(active);
      setActive(i);
    }
    setMounted((n) => Math.max(n, i + 2));
    setStopped(true);
    setStatus(`Photo ${i + 1} of ${photos.length}: ${photos[i].alt}`);
  }

  function toPhotos() {
    setChoice("pause");
    setPhase("photos");
    setMounted((n) => Math.max(n, 2));
    setStatus("Showing QALBI product photos");
  }

  function toggleFilm() {
    const el = video.current;
    if (!el || !film) return;
    if (!onPhotos && wantFilm) {
      setChoice("pause");
      el.pause();
      setStatus("Video paused");
      return;
    }
    if (failed) {
      // Retry: drop the failed source so playFilm loads it afresh.
      el.removeAttribute("src");
      el.load();
      setFailed(false);
    } else if (onPhotos || el.ended) {
      el.currentTime = 0;
    }
    setPhase("film");
    setChoice("play");
    setStatus("Video playing");
    // Start inside the click as well: some browsers only allow playback during the gesture.
    playFilm(el, film, () => setChoice("pause"), () => setFailed(true));
  }

  const filmLabel = onPhotos ? (failed ? "Retry the QALBI Naturals hero video" : "Watch the QALBI Naturals hero video") : wantFilm ? "Pause QALBI Naturals hero video" : "Play QALBI Naturals hero video";
  const count = Math.min(photos.length, mounted);

  return (
    <div
      ref={box}
      className={cn("relative overflow-hidden bg-[#0b1a10]", className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      // Keyboard focus only: a mouse click leaves focus on the button, which must not hold the slideshow for good.
      onFocus={(e) => setHeld(e.target.matches(":focus-visible"))}
      onBlur={() => setHeld(false)}
    >
      {film && (
        <>
          <Still still={poster} priority />
          <video
            ref={video}
            muted
            playsInline
            preload="none"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden
            tabIndex={-1}
            onPlaying={() => {
              setShown(true);
              // The first photo comes next: fetch it while the film plays.
              setMounted((n) => Math.max(n, 1));
            }}
            onEnded={() => {
              setPhase("photos");
              setChoice(null);
              setStopped(false);
              setPrevious(null);
              setActive(0);
              setMounted((n) => Math.max(n, 2));
            }}
            onError={(e) => {
              if (!e.currentTarget.getAttribute("src")) return;
              setFailed(true);
              setMounted((n) => Math.max(n, 2));
            }}
            className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out", shown && !failed ? "opacity-100" : "opacity-0")}
          />
        </>
      )}

      {photos.length > 0 && (
        <div
          role="group"
          aria-roledescription="carousel"
          aria-label="QALBI Naturals product photos"
          aria-hidden={!onPhotos}
          // The slow zoom waits while the photos are hidden (and never snaps back: its class stays on).
          className={cn("absolute inset-0 transition-opacity duration-1000 ease-out motion-reduce:duration-300", onPhotos ? "opacity-100" : "pointer-events-none opacity-0 [&_.kenburns]:[animation-play-state:paused]")}
        >
          {photos.slice(0, count).map((photo, i) => (
            <div
              key={photo.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${photos.length}`}
              aria-hidden={i !== active}
              // The incoming photo fades in over the outgoing one, which stays opaque underneath: no blank frames.
              className={cn("absolute inset-0", i === active ? "z-[2] opacity-100 transition-opacity duration-[1200ms] ease-out motion-reduce:duration-300" : i === previous ? "z-[1] opacity-100" : "opacity-0")}
            >
              <Still still={photo} priority={!film && i === 0} imgClassName={cn(!reduceMotion && (i === active || i === previous) && "kenburns")} />
            </div>
          ))}
        </div>
      )}

      {/* Phones: film control bottom-left, photo controls bottom-right, both clear of the centred product. md+: together bottom-left, away from the WhatsApp button. */}
      <div className="absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-2 sm:inset-x-5 sm:bottom-5 md:right-auto md:justify-start">
        {film && (
          <button type="button" onClick={toggleFilm} aria-label={filmLabel} className={cn("group flex items-center rounded-full focus-visible:outline-ivory", glass, wantFilm ? "p-1" : "p-1 sm:pr-5")}>
            <span className="flex size-11 items-center justify-center rounded-full bg-ivory/15 ring-1 ring-ivory/50 transition group-hover:bg-ivory/30 sm:size-12">
              {wantFilm ? <Pause className="size-4" fill="currentColor" aria-hidden /> : <Play className="size-4 translate-x-px" fill="currentColor" aria-hidden />}
            </span>
            {!wantFilm && <span className="ml-3 hidden text-[0.7rem] font-medium uppercase tracking-[0.2em] sm:inline">{onPhotos ? (failed ? "Retry film" : "Watch film") : "Play film"}</span>}
          </button>
        )}

        {film && !onPhotos && photos.length > 0 && (
          <button type="button" onClick={toPhotos} aria-label="Show QALBI product photos" className={cn("flex items-center gap-1 rounded-full py-1 pl-4 pr-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] focus-visible:outline-ivory", glass)}>
            <span className="hidden sm:inline">Photos</span>
            <span className="flex size-9 items-center justify-center sm:size-8">
              <ChevronRight className="size-4" aria-hidden />
            </span>
          </button>
        )}

        {onPhotos && photos.length > 1 && (
          <div className={cn("flex items-center rounded-full p-0.5", glass)}>
            <button type="button" onClick={() => showPhoto((active - 1 + photos.length) % photos.length)} aria-label="Previous photo" className={iconButton}>
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="hidden min-w-10 text-center text-xs tabular-nums text-ivory/90 sm:inline" aria-hidden>
              {active + 1} / {photos.length}
            </span>
            <button type="button" onClick={() => showPhoto((active + 1) % photos.length)} aria-label="Next photo" className={iconButton}>
              <ChevronRight className="size-4" aria-hidden />
            </button>
            {/* Pause only (WCAG 2.2.2): once stopped, the photos stay put and the film button is the one play control. */}
            {autoAdvance && (
              <button
                type="button"
                onClick={() => {
                  setStopped(true);
                  setStatus("Slideshow paused");
                }}
                aria-label="Pause slideshow"
                className={iconButton}
              >
                <Pause className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
