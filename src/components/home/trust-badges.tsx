import type { CSSProperties } from "react";
import { getTrustBadges } from "@/lib/store/content";
import type { TrustBadge } from "@/types/content";
import { MarqueePause } from "./marquee-pause";

/** Widest screen the loop must cover without a gap, and a conservative width per badge. */
const MAX_VIEWPORT = 2560;
const MIN_BADGE_WIDTH = 200;
/** Seconds per badge: about 40 px a second, slow enough to read while it moves. */
const SECONDS_PER_BADGE = 5.5;

/**
 * Benefits strip, one row at every width (styles: `.benefits` in globals.css).
 * - Mouse/trackpad screens from 768 px: a slow seamless marquee. The list is
 *   repeated just enough to cover a wide screen; only the first copy is exposed
 *   to assistive technology. Hover, keyboard focus or the pause button stops it.
 * - Touch screens and phones: a swipeable, snapping row, nothing moves on its own.
 * - Reduced motion (mouse screens): static, in balanced rows.
 */
export async function TrustBadges() {
  const badges = await getTrustBadges();
  if (badges.length === 0) return null;
  const sets = 1 + Math.ceil(MAX_VIEWPORT / (badges.length * MIN_BADGE_WIDTH));
  const style = { "--benefits-sets": sets, "--benefits-duration": `${badges.length * SECONDS_PER_BADGE}s` } as CSSProperties;
  return (
    <section aria-label="Why QALBI" data-benefits className="benefits relative border-b border-line/70 bg-ivory">
      <div className="benefits-viewport">
        <div className="benefits-track" style={style}>
          {Array.from({ length: sets }, (_, copy) => (
            <ul key={copy} data-copy={copy} aria-hidden={copy > 0 || undefined} className="benefits-set">
              {badges.map((badge) => (
                <Badge key={badge.id} badge={badge} />
              ))}
            </ul>
          ))}
        </div>
      </div>
      <MarqueePause />
    </section>
  );
}

function Badge({ badge: { icon: Icon, title, subtitle } }: { badge: TrustBadge }) {
  return (
    <li className="benefit flex shrink-0 items-center gap-3 px-5 py-4 sm:gap-3.5 sm:px-7 sm:py-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/45 bg-cream/70 text-gold sm:size-11">
        <Icon className="size-[1.1rem] sm:size-5" strokeWidth={1.3} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[0.84rem] font-medium leading-snug text-forest">{title}</span>
        <span className="text-[0.74rem] leading-snug text-muted">{subtitle}</span>
      </span>
    </li>
  );
}
