"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Pause } from "lucide-react";
import type { HeroContent } from "@/lib/content/hero";
import { cn } from "@/lib/utils";
import { HeroOverlay } from "./hero-overlay";

/** Bucket URLs of the hero film; `mobile` (4:5, lighter) is optional. */
export interface HeroFilmSources {
  desktop: string;
  mobile: string | null;
}

/**
 * A hero image (desktop sources from 640 px, mobile below) with the CSS
 * object-position that keeps its product in frame (default centred). `fit`
 * lets it show in full over a blurred copy of itself where the frame is too
 * wide or tall to crop it (globals.css, .hero-still). `content` is an admin
 * slide's optional heading / subtitle / button.
 */
export interface HeroStill {
  key: string;
  desktopSrcSet: string;
  mobileSrcSet: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  content: HeroContent | null;
  position?: string;
  fit?: "square" | "wide";
}

/** Phones: the hero frame is 4:5 here, matching the mobile encode. */
const PHONE = "(max-width: 639px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const PHOTO_INTERVAL = 6000;

/** Reduced-motion preference; `false` during SSR and hydration so server and client markup match. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED_MOTION);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Data-saver or slow (2G/3G) connection. */
function isConstrainedConnection() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(connection?.saveData) || /(^|-)(2g|3g)$/.test(connection?.effectiveType ?? "");
}

/** `isConstrainedConnection`, but `false` during SSR and hydration so server and client markup match. */
function useConstrainedConnection() {
  return useSyncExternalStore(() => () => {}, isConstrainedConnection, () => false);
}

/** Longest the poster waits for the film to buffer before the hero moves on to the photos. */
const BUFFER_TIMEOUT_MS = 15_000;

function playFilm(el: HTMLVideoElement, onBlocked: () => void, onFailed: () => void) {
  // React does not reflect `muted` reliably; autoplay policies require it.
  el.muted = true;
  el.play().catch((error: DOMException) => {
    if (error.name === "NotAllowedError") onBlocked();
    // AbortError: a pause() or new src interrupted this play() — not a failure.
    else if (error.name !== "AbortError") onFailed();
  });
}

/**
 * Loads the film — choosing its file on first use, exactly one per page view
 * (mobile on phones when available), so resizing never fetches the other — and
 * calls `onReady` once enough is buffered to reach the end without stalling at
 * the measured download rate (or it is fully buffered). The films are about
 * 12 Mbit/s: started at their first frame they stalled and dropped frames on
 * any slower connection (measured in Chrome), which read as stutter. Calls
 * `onTooSlow` instead after BUFFER_TIMEOUT_MS. Returns a cleanup.
 */
function bufferFilm(el: HTMLVideoElement, film: HeroFilmSources, loadStart: { current: number }, onReady: () => void, onTooSlow: () => void): () => void {
  if (!el.getAttribute("src")) {
    el.src = film.mobile && window.matchMedia(PHONE).matches ? film.mobile : film.desktop;
    el.preload = "auto";
    el.load();
    loadStart.current = performance.now();
  }
  const enough = () => {
    const duration = el.duration;
    if (!Number.isFinite(duration) || duration <= 0 || el.buffered.length === 0 || el.buffered.start(0) > 0.1) return false;
    const buffered = el.buffered.end(0);
    // Seconds of film arriving per second; at or above 1 the download outpaces playback.
    const rate = buffered / Math.max(0.001, (performance.now() - loadStart.current) / 1000);
    return buffered >= duration - 0.1 || (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && buffered >= duration * (1 - Math.min(rate, 1)) + 1);
  };
  if (enough()) {
    onReady();
    return () => {};
  }
  const id = window.setInterval(() => {
    if (enough()) {
      window.clearInterval(id);
      onReady();
    } else if (performance.now() - loadStart.current > BUFFER_TIMEOUT_MS) {
      window.clearInterval(id);
      onTooSlow();
    }
  }, 200);
  return () => window.clearInterval(id);
}

function Still({ still, priority = false, imgClassName }: { still: HeroStill; priority?: boolean; imgClassName?: string }) {
  // Both layers use the same srcset and sizes, so the browser fetches the file once.
  const layer = (className: string, alt: string, eager: boolean) => (
    <picture className="absolute inset-0 block">
      <source media="(min-width: 640px)" srcSet={still.desktopSrcSet} sizes="100vw" />
      <source srcSet={still.mobileSrcSet} sizes="100vw" />
      <img
        src={still.src}
        width={still.width}
        height={still.height}
        alt={alt}
        fetchPriority={eager ? "high" : "low"}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: still.position }}
        className={cn("absolute inset-0 h-full w-full", className)}
      />
    </picture>
  );
  return (
    <div className="hero-still absolute inset-0 overflow-hidden" data-fit={still.fit}>
      {still.fit && <div aria-hidden>{layer("hero-still-backdrop", "", false)}</div>}
      {layer(cn("hero-still-main", imgClassName), still.alt, priority)}
    </div>
  );
}

const glass = "border border-ivory/40 bg-ink/45 text-ivory shadow-[0_6px_24px_rgb(0_0_0/0.22)] backdrop-blur-md";
const iconButton = "flex size-11 items-center justify-center rounded-full transition hover:bg-ivory/15 focus-visible:outline-ivory";

/**
 * Hero visual: QALBI's film first, then a crossfading slideshow of the real
 * product photos — never both at once. Without a film the slideshow starts
 * straight away.
 *
 * The film autoplays muted and inline where the browser allows it; there is no
 * play/pause button. "Photos" stops it and shows the photos (the WCAG 2.2.2
 * stop mechanism), as does its end. Its poster is the first paint and stays
 * up while the film buffers enough to play through without stalling
 * (bufferFilm). When the film does not play on its own — reduced motion, data
 * saver or a slow connection, too slow to buffer, autoplay refused by the
 * browser, or a playback error — the poster crossfades to the photos instead. The <video> has no src until it may
 * play, so those visitors download no video. Film and slideshow pause while
 * off screen; the slideshow also holds on hover or keyboard focus, stops for
 * good once a visitor navigates or pauses it, and never advances (or zooms)
 * for reduced-motion visitors. Each photo is fetched only when it is next, one
 * ahead of the one on screen.
 */
export function HeroMedia({ film, poster, photos, className }: { film: HeroFilmSources | null; poster: HeroStill; photos: HeroStill[]; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"film" | "photos">(film ? "film" : "photos");
  const [failed, setFailed] = useState(false);
  // The browser refused muted autoplay (e.g. iOS Low Power Mode).
  const [blocked, setBlocked] = useState(false);
  // The film could not buffer enough within BUFFER_TIMEOUT_MS: the photos are shown instead.
  const [tooSlow, setTooSlow] = useState(false);
  // Enough of the film is buffered to play through; and when its download began.
  const ready = useRef(false);
  const loadStart = useRef(0);
  // Frames are actually being shown (from the video's own events, not from what was asked for).
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(false);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  // Photos mounted (and so fetched) ahead of need; only grows.
  const [mounted, setMounted] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [held, setHeld] = useState(false);
  const [status, setStatus] = useState("");
  const reduceMotion = usePrefersReducedMotion();
  const constrained = useConstrainedConnection();

  // Why the film will not play on its own; any reason sends the hero to the photos.
  const fallback = failed ? "failed" : blocked ? "autoplay-blocked" : tooSlow ? "too-slow-to-buffer" : reduceMotion ? "reduced-motion" : constrained ? "data-saver-or-slow-connection" : null;
  const onPhotos = !film || phase === "photos" || fallback !== null;
  const autoAdvance = onPhotos && photos.length > 1 && !stopped && !reduceMotion;
  // For checking a real device in DevTools: <div data-film="…">.
  const filmState = !film ? "off" : (fallback ?? (phase === "photos" ? "photos" : playing ? "playing" : !visible ? "paused-off-screen" : shown ? "starting" : "buffering"));

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
    const unwanted = window.matchMedia(REDUCED_MOTION).matches || isConstrainedConnection();
    if (onPhotos || !visible || unwanted) {
      el.pause();
      return;
    }
    const play = () => playFilm(el, () => setBlocked(true), () => setFailed(true));
    if (ready.current) {
      play();
      return;
    }
    return bufferFilm(
      el,
      film,
      loadStart,
      () => {
        ready.current = true;
        play();
      },
      () => {
        // Stop the download as well: the photos take over.
        el.removeAttribute("src");
        el.load();
        setTooSlow(true);
      },
    );
  }, [film, onPhotos, visible]);

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
    setPhase("photos");
    setStatus("Video stopped. Showing QALBI product photos");
  }

  // On the photos: the one on screen and the next. While the film plays: the first.
  const count = Math.min(photos.length, Math.max(mounted, onPhotos ? active + 2 : 0));

  return (
    <div
      ref={box}
      data-film={filmState}
      className={cn("hero-frame relative overflow-hidden bg-[#0b1a10]", className)}
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
              setPlaying(true);
              setShown(true);
              // The first photo comes next: fetch it while the film plays.
              setMounted((n) => Math.max(n, 1));
            }}
            onPause={() => setPlaying(false)}
            onEmptied={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setPhase("photos");
              setPrevious(null);
              setActive(0);
            }}
            onError={(e) => {
              if (!e.currentTarget.getAttribute("src")) return;
              setPlaying(false);
              setFailed(true);
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
              key={photo.key}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${photos.length}`}
              aria-hidden={i !== active}
              // The incoming photo fades in over the outgoing one, which stays opaque underneath: no blank frames.
              className={cn("absolute inset-0", i === active ? "z-[2] opacity-100 transition-opacity duration-[1200ms] ease-out motion-reduce:duration-300" : i === previous ? "z-[1] opacity-100" : "opacity-0")}
            >
              <Still still={photo} priority={!film && i === 0} imgClassName={cn(!reduceMotion && (i === active || i === previous) && "kenburns")} />
              {/* Hidden slides are inert so their buttons are never focusable. */}
              {photo.content && (
                <div inert={i !== active || !onPhotos}>
                  <HeroOverlay content={photo.content} headingLevel="h2" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom-left, clear of the centred product and of the WhatsApp button. */}
      <div className="absolute bottom-3 left-3 z-10 flex items-end gap-2 sm:bottom-5 sm:left-5 lg:bottom-8 lg:left-8">
        {film && !onPhotos && photos.length > 0 && (
          <button type="button" onClick={toPhotos} aria-label="Stop the video and show QALBI product photos" className={cn("flex items-center gap-1 rounded-full py-1 pl-4 pr-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] focus-visible:outline-ivory", glass)}>
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
            {/* Pause only (WCAG 2.2.2): once stopped, the photos stay put. */}
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
