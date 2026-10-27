"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroContent } from "@/lib/content/hero";
import { cn } from "@/lib/utils";
import { HeroOverlay } from "./hero-overlay";
import { PetalDrift } from "./petal-drift";

/**
 * One hero slide as the browser receives it. `still` is the image (image
 * slides) or the poster (video slides; null when none) with desktop sources
 * from 640 px and mobile below; `position` keeps its product in frame and
 * `fit` lets it show in full over a blurred copy of itself where the frame is
 * too wide or tall to crop it (globals.css, .hero-still). `video` holds the
 * bucket URLs (`mobile` optional). `content` is an optional heading /
 * subtitle / button.
 */
export interface HeroSlideView {
  key: string;
  alt: string;
  still: { desktopSrcSet: string; mobileSrcSet: string; src: string; width: number; height: number } | null;
  video: { desktop: string; mobile: string | null } | null;
  content: HeroContent | null;
  position?: string;
  fit?: "square" | "wide";
}

/** Phones: the hero frame is 4:5 here, matching the mobile encode. */
const PHONE = "(max-width: 639px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const PHOTO_INTERVAL = 6000;
/** Longest a video slide waits on its poster for enough of the file to play through. */
const BUFFER_TIMEOUT_MS = 15_000;

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

/**
 * Loads a video — choosing its file on first use, exactly one per page view
 * (mobile on phones when there is one), so resizing never fetches the other —
 * and calls `onReady` once enough is buffered to reach the end without
 * stalling at the measured download rate (or it is fully buffered): started
 * at their first frame, heavy files stalled on slower connections, which read
 * as stutter. Calls `onTooSlow` instead after BUFFER_TIMEOUT_MS. Returns a cleanup.
 */
function bufferVideo(el: HTMLVideoElement, video: NonNullable<HeroSlideView["video"]>, loadStart: { current: number }, onReady: () => void, onTooSlow: () => void): () => void {
  if (!el.getAttribute("src")) {
    el.src = video.mobile && window.matchMedia(PHONE).matches ? video.mobile : video.desktop;
    el.preload = "auto";
    el.load();
    loadStart.current = performance.now();
  }
  const enough = () => {
    const duration = el.duration;
    if (!Number.isFinite(duration) || duration <= 0 || el.buffered.length === 0 || el.buffered.start(0) > 0.1) return false;
    const buffered = el.buffered.end(0);
    // Seconds of video arriving per second; at or above 1 the download outpaces playback.
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

type VideoCallbacks = { onPlaying: () => void; onEnded: () => void; onUnavailable: (reason: string) => void };

/**
 * A video slide's player. It has no src until `load` (on screen, or next in
 * line), and plays only while `active` and `onScreen`; scrolling away and
 * back resumes where it was, and returning to the slide replays it from the
 * start without downloading it again.
 */
function SlideVideo({ video, load, active, onScreen, loop, callbacks }: { video: NonNullable<HeroSlideView["video"]>; load: boolean; active: boolean; onScreen: boolean; loop: boolean; callbacks: VideoCallbacks }) {
  const ref = useRef<HTMLVideoElement>(null);
  const loadStart = useRef(0);
  const latest = useRef(callbacks);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    latest.current = callbacks;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !load || ready) return;
    // Read the preferences directly as well: during hydration the hooks still report the server value (false).
    if (window.matchMedia(REDUCED_MOTION).matches || isConstrainedConnection()) return;
    return bufferVideo(
      el,
      video,
      loadStart,
      () => setReady(true),
      () => {
        // Stop the download as well: the poster (or the next slide) takes over.
        el.removeAttribute("src");
        el.load();
        setGone(true);
        latest.current.onUnavailable("too-slow-to-buffer");
      },
    );
  }, [load, ready, video]);

  // Coming back to this slide replays it from the start.
  useEffect(() => {
    const el = ref.current;
    if (el && active && ready && el.currentTime > 0) el.currentTime = 0;
  }, [active, ready]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    if (!active || !onScreen) {
      el.pause();
      return;
    }
    // React does not reflect `muted` reliably; autoplay policies require it.
    el.muted = true;
    // Always the film's own speed: nothing here may speed it up or slow it down.
    el.defaultPlaybackRate = 1;
    el.playbackRate = 1;
    el.play().catch((error: DOMException) => {
      // AbortError: a pause() interrupted this play() — not a failure.
      if (error.name === "AbortError") return;
      setGone(true);
      latest.current.onUnavailable(error.name === "NotAllowedError" ? "autoplay-blocked" : "failed");
    });
  }, [active, onScreen, ready]);

  return (
    <video
      ref={ref}
      muted
      playsInline
      loop={loop}
      preload="none"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden
      tabIndex={-1}
      onPlaying={() => {
        setShown(true);
        latest.current.onPlaying();
      }}
      onEnded={() => latest.current.onEnded()}
      onError={(e) => {
        if (!e.currentTarget.getAttribute("src")) return;
        setGone(true);
        latest.current.onUnavailable("failed");
      }}
      className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out", shown && !gone ? "opacity-100" : "opacity-0")}
    />
  );
}

function Still({ slide, priority = false, imgClassName }: { slide: HeroSlideView; priority?: boolean; imgClassName?: string }) {
  const still = slide.still;
  if (!still) return null;
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
        style={{ objectPosition: slide.position }}
        className={cn("absolute inset-0 h-full w-full", className)}
      />
    </picture>
  );
  return (
    <div className="hero-still absolute inset-0 overflow-hidden" data-fit={slide.fit}>
      {slide.fit && <div aria-hidden>{layer("hero-still-backdrop", "", false)}</div>}
      {layer(cn("hero-still-main", imgClassName), slide.alt, priority)}
    </div>
  );
}

const glass = "border border-ivory/40 bg-ink/45 text-ivory shadow-[0_6px_24px_rgb(0_0_0/0.22)] backdrop-blur-md";
const iconButton = "flex size-11 items-center justify-center rounded-full transition hover:bg-ivory/15 focus-visible:outline-ivory";

/**
 * Hero slideshow of images and videos in the given order, crossfading from
 * one to the next. Images stay PHOTO_INTERVAL; a video plays once (muted,
 * inline, autoplaying where the browser allows) and the slideshow moves on
 * when it ends — a lone video loops. Its poster is shown at once and stays up
 * while the video buffers enough to play through without stalling. When a
 * video does not play on its own — reduced motion, data saver or a slow
 * connection, too slow to buffer, autoplay refused, or a playback error — its
 * poster stands in for it, or the slide is skipped if it has none.
 *
 * Downloads: each image only when it is on screen or next; each video only
 * when it is on screen or next, never for visitors who can't play it, one file
 * per page view (phone or desktop). Everything pauses while off screen; the
 * slideshow holds on hover or keyboard focus and stops advancing once a
 * visitor navigates. There is no pause/play control (owner's decision,
 * 2026-10-26); reduced-motion visitors get no autoplay, zoom or auto-advance.
 */
export function HeroMedia({ slides, className }: { slides: HeroSlideView[]; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  // Slides mounted (and so fetched) ahead of need; only grows.
  const [mounted, setMounted] = useState(0);
  // Visitor navigated: no more auto-advance.
  const [stopped, setStopped] = useState(false);
  const [held, setHeld] = useState(false);
  // Video slides that won't play on their own, with the reason; and the video now on screen / finished.
  const [unavailable, setUnavailable] = useState<Record<string, string>>({});
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [endedKey, setEndedKey] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const reduceMotion = usePrefersReducedMotion();
  const constrained = useConstrainedConnection();

  const videoOff = reduceMotion ? "reduced-motion" : constrained ? "data-saver-or-slow-connection" : null;
  const canPlay = (s: HeroSlideView) => Boolean(s.video) && !videoOff && !unavailable[s.key];
  const showable = (s: HeroSlideView) => !s.video || s.still !== null || canPlay(s);
  const count = slides.length;
  const step = (from: number, dir: 1 | -1) => {
    for (let k = 1; k <= count; k++) {
      const j = (((from + dir * k) % count) + count) % count;
      if (showable(slides[j])) return j;
    }
    return from;
  };
  // A video slide that can't play and has no poster is passed over.
  const current = count === 0 || showable(slides[active]) ? active : step(active, 1);
  const next = count > 1 ? step(current, 1) : current;
  const showableCount = slides.filter(showable).length;
  const slide: HeroSlideView | undefined = slides[current];
  const videoOnScreen = slide ? canPlay(slide) && endedKey !== slide.key : false;
  const autoAdvance = showableCount > 1 && !stopped && !reduceMotion;

  // For checking a real device in DevTools: <div data-film="…">.
  const filmState = !slide?.video ? "photos" : (videoOff ?? unavailable[slide.key] ?? (!visible ? "paused-off-screen" : playingKey === slide.key ? "playing" : endedKey === slide.key ? "ended" : "buffering"));

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function go(i: number, byVisitor = false) {
    if (i !== current) {
      setPrevious(current);
      setActive(i);
    }
    setEndedKey(null);
    setMounted((n) => Math.max(n, i + 2));
    if (byVisitor) {
      setStopped(true);
      setStatus(`Slide ${i + 1} of ${count}: ${slides[i].alt}`);
    }
  }

  // Images (and posters standing in for videos) advance on a timer; a playing video advances when it ends.
  useEffect(() => {
    if (!autoAdvance || held || !visible || videoOnScreen) return;
    const id = window.setTimeout(() => go(next), endedKey === slide?.key ? 400 : PHOTO_INTERVAL);
    return () => window.clearTimeout(id);
  });

  // The one on screen and the next; never the whole list at once.
  const rendered = (i: number) => i < Math.max(mounted, current + 2) || i === next || i === current;

  return (
    <div
      ref={box}
      data-film={filmState}
      data-onscreen={visible}
      data-slide={current + 1}
      className={cn("hero-frame relative overflow-hidden bg-[#0b1a10]", className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      // Keyboard focus only: a mouse click leaves focus on the button, which must not hold the slideshow for good.
      onFocus={(e) => setHeld(e.target.matches(":focus-visible"))}
      onBlur={() => setHeld(false)}
    >
      <div role="group" aria-roledescription="carousel" aria-label="QALBI Naturals" className="absolute inset-0">
        {slides.map((s, i) =>
          !rendered(i) ? null : (
            <div
              key={s.key}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== current}
              // The incoming slide fades in over the outgoing one, which stays opaque underneath: no blank frames.
              className={cn("absolute inset-0", i === current ? "z-[2] opacity-100 transition-opacity duration-[1200ms] ease-out motion-reduce:duration-300" : i === previous ? "z-[1] opacity-100" : "opacity-0")}
            >
              <Still slide={s} priority={i === 0} imgClassName={cn(!s.video && !reduceMotion && (i === current || i === previous) && "kenburns")} />
              {s.video && !videoOff && (
                <SlideVideo
                  video={s.video}
                  load={!unavailable[s.key] && (i === current || i === next)}
                  active={i === current}
                  onScreen={visible}
                  loop={showableCount === 1}
                  callbacks={{
                    onPlaying: () => {
                      setPlayingKey(s.key);
                      // The next slide comes after this video: fetch its image or poster meanwhile.
                      setMounted((n) => Math.max(n, i + 2));
                    },
                    onEnded: () => {
                      setPlayingKey(null);
                      setEndedKey(s.key);
                    },
                    onUnavailable: (reason) => {
                      setPlayingKey(null);
                      setUnavailable((u) => ({ ...u, [s.key]: reason }));
                    },
                  }}
                />
              )}
              {/* Hidden slides are inert so their buttons are never focusable. */}
              {s.content && (
                <div inert={i !== current}>
                  <HeroOverlay content={s.content} headingLevel="h2" />
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {/* Bottom-left, clear of the centred product and of the WhatsApp button. */}
      {/* Above the media, below any slide text and the arrows; click-through. */}
      {count > 0 && <PetalDrift />}

      {/* Slide arrows only: shown when there is more than one slide (a lone video gets no control at all). */}
      {showableCount > 1 && (
        <div className="absolute bottom-3 left-3 z-10 sm:bottom-5 sm:left-5 lg:bottom-8 lg:left-8">
          <div className={cn("flex items-center rounded-full p-0.5", glass)}>
            <button type="button" onClick={() => go(step(current, -1), true)} aria-label="Previous slide" className={iconButton}>
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="hidden min-w-10 text-center text-xs tabular-nums text-ivory/90 sm:inline" aria-hidden>
              {current + 1} / {count}
            </span>
            <button type="button" onClick={() => go(step(current, 1), true)} aria-label="Next slide" className={iconButton}>
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
