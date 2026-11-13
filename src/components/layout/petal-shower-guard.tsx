"use client";

import { useEffect } from "react";

/**
 * Starts the petal clock when its inline script didn't run: React doesn't
 * execute scripts it renders on the client, so arriving at the storefront by
 * client-side navigation (e.g. from /admin) would otherwise leave the shower
 * without its 20-second end. The clock marks <html data-petals> whenever it
 * has run, so on a normal page load this does nothing. Same code, one clock.
 */
export function PetalShowerGuard({ clock }: { clock: string }) {
  useEffect(() => {
    if (document.documentElement.hasAttribute("data-petals")) return;
    const script = document.createElement("script");
    script.textContent = clock;
    document.body.appendChild(script);
    script.remove();
  }, [clock]);
  return null;
}
