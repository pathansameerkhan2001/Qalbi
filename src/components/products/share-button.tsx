"use client";

import { useId, useRef, useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";
import { brandConfig } from "@/data/brand";
import { buildProductShare, type ProductShare, type ShareableProduct } from "@/lib/share";
import { isProductionSiteUrl, siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { FacebookIcon, WhatsAppIcon } from "@/components/ui/brand-icons";

type CopyState = "idle" | "copied" | "failed";

/** The configured public site; only without one (local development, previews) the page's own origin. */
const shareOrigin = () => (isProductionSiteUrl ? siteUrl : window.location.origin);

/** Native share sheet. true: shared or cancelled by the visitor (both end here); false: unavailable or failed — offer the menu. */
async function nativeShare(share: ProductShare): Promise<boolean> {
  if (typeof navigator.share !== "function") return false;
  const data = { title: share.title, text: share.text, url: share.url };
  if (navigator.canShare && !navigator.canShare(data)) return false;
  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    // AbortError: the visitor closed the sheet — not an error, nothing to show.
    return error instanceof DOMException && error.name === "AbortError";
  }
}

/**
 * Share one product. Phones and tablets with a native share sheet get it
 * straight away; elsewhere (or if it fails) a small menu offers WhatsApp,
 * Facebook, Copy link and — where the browser has one — the native sheet as
 * “More options”. Instagram can't be pre-filled from a website, so the menu
 * says to paste the copied link there.
 *
 * The click never reaches the product card behind it (no navigation, no Add
 * to Cart), a second click while the sheet is open is ignored, and copying
 * reports “Link copied” only once the clipboard has accepted the link —
 * otherwise the link is shown, selected, to copy by hand.
 */
export function ShareProductButton({ product, variant = "icon", className }: { product: ShareableProduct; variant?: "icon" | "labelled"; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [share, setShare] = useState<ProductShare | null>(null);
  const [copy, setCopy] = useState<CopyState>("idle");
  const [hasNative, setHasNative] = useState(false);
  const titleId = useId();

  async function onShare(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy.current) return;
    busy.current = true;
    try {
      const next = buildProductShare(product, shareOrigin(), brandConfig.name);
      setShare(next);
      setCopy("idle");
      setHasNative(typeof navigator.share === "function");
      // Touch devices: the native sheet first (WhatsApp, Instagram, Messages… as installed).
      if (window.matchMedia("(pointer: coarse)").matches && (await nativeShare(next))) return;
      dialog.current?.showModal();
    } finally {
      busy.current = false;
    }
  }

  async function onCopy() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopy("copied");
    } catch {
      // No clipboard access (permission, insecure page): show the link to copy by hand.
      setCopy("failed");
    }
  }

  async function onMore() {
    if (!share) return;
    dialog.current?.close();
    if (!(await nativeShare(share))) dialog.current?.showModal();
  }

  const option = "flex w-full items-center gap-3 rounded-[3px] border border-line bg-ivory px-4 py-3 text-left text-sm text-ink transition hover:border-gold-soft hover:bg-cream focus-visible:outline-forest";

  return (
    <>
      <button
        type="button"
        onClick={onShare}
        aria-label={`Share ${product.title}`}
        aria-haspopup="dialog"
        className={cn(
          variant === "icon"
            ? "flex size-10 items-center justify-center rounded-full border border-line/80 bg-ivory/90 text-forest shadow-soft backdrop-blur-sm transition hover:border-gold-soft hover:text-gold-deep focus-visible:outline-forest sm:size-9"
            : "inline-flex items-center gap-2 rounded-full border border-line bg-ivory px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-forest transition hover:border-gold-soft hover:text-gold-deep focus-visible:outline-forest",
          className,
        )}
      >
        <Share2 className={variant === "icon" ? "size-4" : "size-3.5"} aria-hidden />
        {variant === "labelled" && <span>Share</span>}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        // Clicks on the backdrop (the dialog element itself) close it.
        onClick={(e) => {
          e.stopPropagation();
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        className="m-auto mb-0 w-full max-w-none rounded-t-2xl border border-line bg-ivory p-0 text-ink shadow-xl backdrop:bg-ink/45 sm:mb-auto sm:w-[min(26rem,calc(100vw-2rem))] sm:rounded-[3px]"
      >
        {share && (
          <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Share</p>
                <h2 id={titleId} className="mt-1 font-serif text-xl leading-snug">
                  {product.title}
                </h2>
              </div>
              <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="-mr-2 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-forest">
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="grid gap-2">
              <a href={share.whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => dialog.current?.close()} className={option}>
                <WhatsAppIcon className="size-5 text-[#1f8a4c]" /> WhatsApp
              </a>
              <a href={share.facebookUrl} target="_blank" rel="noopener noreferrer" onClick={() => dialog.current?.close()} className={option}>
                <FacebookIcon className="size-5 text-[#1f5fbf]" /> Facebook
              </a>
              <button type="button" onClick={onCopy} className={option} autoFocus>
                {copy === "copied" ? <Check className="size-5 text-forest" aria-hidden /> : <Copy className="size-5 text-forest" aria-hidden />}
                {copy === "copied" ? "Link copied" : "Copy link"}
              </button>
              {hasNative && (
                <button type="button" onClick={onMore} className={option}>
                  <Share2 className="size-5 text-forest" aria-hidden /> More options
                </button>
              )}
            </div>

            <p role="status" aria-live="polite" className={cn("text-xs", copy === "failed" ? "text-danger" : "text-muted")}>
              {copy === "copied" && "The link is on your clipboard."}
              {copy === "failed" && "Your browser didn't allow copying. Select the link below and copy it."}
              {copy === "idle" && "Instagram: copy the link, then paste it into your story, post or message."}
            </p>
            {copy === "failed" && (
              <label className="block">
                <span className="sr-only">Product link</span>
                <input readOnly value={share.url} onFocus={(e) => e.currentTarget.select()} autoFocus className="field font-mono text-xs" />
              </label>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
