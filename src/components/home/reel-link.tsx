"use client";

import { track, type AnalyticsEvent } from "@/lib/analytics";

/** External link that records a privacy-safe analytics event on click. */
export function TrackedLink({
  href,
  event,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  event: AnalyticsEvent;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={ariaLabel} onClick={() => track(event)}>
      {children}
    </a>
  );
}
