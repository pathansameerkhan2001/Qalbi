import { cn } from "@/lib/utils";
import type { FloralVariant } from "@/lib/florals/art";
import { floralFiles } from "@/lib/florals/manifest";

/*
 * QALBI's floral artwork on the page. The flowers themselves (champagne
 * roses, ivory jasmine with gold centres, sage and botanical-green leaves,
 * coloured from the brand tokens) live in small cached SVG files —
 * src/lib/florals/art.ts, generated into public/florals/ by
 * scripts/build-florals.mts — each with its own opening animation (petals
 * unfold, leaves grow, stems draw) and a reduced-motion rule built in.
 *
 * Here they are plain images: a page carries one element per arrangement, and
 * a file is only requested when its arrangement scrolls into view
 * (layout/bloom-observer.tsx moves data-fl-src to src), so it opens as the
 * visitor arrives at it. Decorative only: empty alt, hidden from assistive
 * technology, never takes clicks.
 */

export type SprigVariant = "rose" | "jasmine" | "leaf" | "bouquet" | "cluster";

/**
 * One arrangement as an image. Default: loads and opens as it scrolls into
 * view, then sways gently while on screen. `eager`: loads with the page
 * (lazily, so a hidden copy never downloads) — for the entrance.
 */
export function FloralArt({ variant, className, eager = false }: { variant: FloralVariant; className?: string; eager?: boolean }) {
  const file = floralFiles[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static, pre-optimised SVG artwork; next/image adds nothing here
    <img
      alt=""
      aria-hidden
      width={file.width}
      height={file.height}
      decoding="async"
      draggable={false}
      {...(eager ? { src: file.src, loading: "lazy" as const } : { "data-fl-src": file.src, "data-fl-still": file.still })}
      className={cn("fl-art pointer-events-none select-none", !eager && "fl-onview fl-sway", className)}
    />
  );
}

const corners = {
  br: "-bottom-3 -right-3",
  bl: "-bottom-3 -left-3 -scale-x-100",
  tr: "-right-3 -top-3 -scale-y-100",
  tl: "-left-3 -top-3 -scale-100",
};

const sizes = {
  sm: "w-24 sm:w-32 lg:w-44",
  md: "w-28 sm:w-44 lg:w-64 xl:w-72",
  lg: "w-32 sm:w-52 lg:w-80 xl:w-96",
};

/** The phone composition for a corner: a slim branch along the same edge, growing in from the same side. */
const branches = {
  br: "bottom-0 right-0 -scale-x-100",
  bl: "bottom-0 left-0",
  tr: "top-0 right-0 -scale-100",
  tl: "top-0 left-0 -scale-y-100",
};

/**
 * An arrangement in a corner of the nearest `relative isolate` box, behind its
 * content (z-index -10 inside that stacking context, above its background):
 * cards, photos and text always cover it.
 *
 * `desktop`: the arrangement shows from 1024 px; on phones and tablets a slim
 * branch lies along the section's top or bottom padding instead — composed for
 * portrait screens, clear of the content rather than a shrunken corner.
 */
export function FloralCorner({
  variant,
  corner = "br",
  size = "md",
  desktop = false,
  className,
}: {
  variant: SprigVariant;
  corner?: keyof typeof corners;
  size?: keyof typeof sizes;
  desktop?: boolean;
  className?: string;
}) {
  return (
    <>
      <FloralArt variant={variant} className={cn("absolute -z-10", corners[corner], sizes[size], desktop && "hidden lg:block", className)} />
      {desktop && <FloralArt variant="branch" className={cn("absolute -z-10 h-auto w-1/2 max-w-[19rem] lg:hidden", branches[corner])} />}
    </>
  );
}

/**
 * A garland border: a stem waving across the width with roses and jasmine in
 * turn, opening as it scrolls into view. Fixed height; on narrow screens the
 * sides are cropped rather than the flowers shrunk.
 */
export function FloralBorder({ className }: { className?: string }) {
  return <FloralArt variant="border" className={cn("block h-12 w-full object-cover sm:h-16", className)} />;
}

/** A small symmetrical spray (rose, jasmine and leaves) above centred section headings. */
export function HeadingSpray({ className }: { className?: string }) {
  return <FloralArt variant="spray" className={cn("mx-auto block h-10 w-auto sm:h-12", className)} />;
}

/** Tiny five-petal flower for eyebrow labels (inline: a few bytes). */
export function FlowerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" aria-hidden focusable="false" className={cn("size-3 shrink-0 text-gold", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} transform={`rotate(${i * 72})`} d="M0 -1.5C-3 -3.5 -3.2 -8.5 0 -10.5C3.2 -8.5 3 -3.5 0 -1.5Z" fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth={0.9} />
      ))}
      <circle r={1.6} style={{ fill: "var(--fl-centre)" }} />
    </svg>
  );
}
