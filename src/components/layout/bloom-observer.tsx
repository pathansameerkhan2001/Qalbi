"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for every floral arrangement (`.fl-onview`): the
 * first time one scrolls into view it gets its image (data-fl-src → src, so
 * nothing below the fold is downloaded early, and the file's own opening
 * animation plays once as the visitor arrives) and is revealed
 * (data-bloom="open"); then it is no longer watched — open artwork stays still.
 * New arrangements (client-side navigation) are picked up by a
 * MutationObserver. Before this runs arrangements wait hidden, as .reveal
 * content does; without scripting no floral image is loaded.
 */
export function BloomObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (typeof IntersectionObserver === "undefined") {
      root.dataset.bloom = "off";
      return;
    }
    // An SVG shown as an image doesn't see the reduced-motion setting, so those visitors get each file's still twin.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement | SVGElement;
          const src = el.getAttribute(still.matches ? "data-fl-still" : "data-fl-src");
          if (src && !el.getAttribute("src")) el.setAttribute("src", src);
          el.dataset.bloom = "open";
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const watch = (node: ParentNode) => node.querySelectorAll(".fl-onview").forEach((el) => io.observe(el));
    watch(document);
    const mo = new MutationObserver((records) => {
      for (const record of records)
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(".fl-onview")) io.observe(node);
          watch(node);
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    root.dataset.bloom = "ready";
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
