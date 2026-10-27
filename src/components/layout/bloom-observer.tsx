"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for every floral arrangement (`.fl-onview`): it
 * opens an arrangement the first time it scrolls into view
 * (data-bloom="open"), and marks it on screen or off (data-inview) so its
 * gentle sway only runs while visible. New arrangements (client-side
 * navigation) are picked up by a MutationObserver. While scripting is on but
 * before this runs, arrangements wait closed (globals.css, “Florals”), as
 * .reveal content does; without scripting they are simply shown open.
 */
export function BloomObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (typeof IntersectionObserver === "undefined") {
      root.dataset.bloom = "off";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement | SVGElement;
          if (entry.isIntersecting) {
            el.dataset.bloom = "open";
            el.dataset.inview = "";
          } else {
            delete el.dataset.inview;
          }
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
