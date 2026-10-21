"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, Mail, Menu, User, X } from "lucide-react";
import type { NavItem } from "@/types/content";
import { brandConfig } from "@/data/brand";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { Logo } from "./logo";
import { cn, whatsappLink } from "@/lib/utils";

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const trigger = triggerRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center text-ink"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <Menu className="size-6" strokeWidth={1.5} aria-hidden />
      </button>

      {/* Portalled to <body>: the header's backdrop-filter would otherwise confine this fixed drawer to the header box. */}
      {isClient &&
        createPortal(
          <>
            {/* Always mounted, so opening and closing animate with CSS (.drawer-* in globals.css); inert while closed. */}
            <div
              className="drawer-overlay invisible fixed inset-0 z-[70] bg-ink/40 opacity-0 data-[open]:visible data-[open]:opacity-100"
              data-open={open ? "" : undefined}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              id="mobile-menu"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              inert={!open}
              data-open={open ? "" : undefined}
              className="drawer-panel invisible fixed inset-y-0 left-0 z-[80] flex w-[86vw] max-w-sm -translate-x-full flex-col bg-ivory shadow-lift data-[open]:visible data-[open]:translate-x-0"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                {/* Closing on navigation: the logo links home. */}
                <div onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
                  <Logo className="items-start [&>span]:w-[104px]" />
                </div>
                <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="inline-flex size-10 items-center justify-center" aria-label="Close menu">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <nav
                aria-label="Mobile"
                className="flex-1 overflow-y-auto px-5 py-4"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) setOpen(false);
                }}
              >
                <ul className="divide-y divide-line">
                  {items.map((item) => (
                    <li key={item.href}>
                      {item.children ? (
                        <>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between py-3.5 text-left font-serif text-xl text-ink"
                            aria-expanded={expanded === item.href}
                            onClick={() => setExpanded((v) => (v === item.href ? null : item.href))}
                          >
                            {item.label}
                            <ChevronDown aria-hidden className={cn("size-4 transition-transform", expanded === item.href && "rotate-180")} />
                          </button>
                          {expanded === item.href && (
                            <ul className="pb-3 pl-3">
                              <li>
                                <Link href={item.href} className="block py-2 text-sm font-medium text-forest">
                                  Shop All Products
                                </Link>
                              </li>
                              {item.children.map((child) => (
                                <li key={child.href}>
                                  <Link href={child.href} className="block py-2 text-sm text-muted hover:text-forest">
                                    {child.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <Link href={item.href} className="block py-3.5 font-serif text-xl text-ink hover:text-gold">
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="space-y-3 border-t border-line px-5 py-5 text-sm">
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-ink hover:text-forest">
                  <WhatsAppIcon className="size-4 text-botanical" /> {brandConfig.whatsappNumber}
                </a>
                <a href={brandConfig.emailUrl} className="flex items-center gap-3 text-ink hover:text-forest">
                  <Mail aria-hidden className="size-4 text-botanical" /> {brandConfig.email}
                </a>
                <a href={brandConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-ink hover:text-forest">
                  <InstagramIcon className="size-4 text-botanical" /> {brandConfig.instagramHandle}
                </a>
                <Link href="/admin/login" prefetch={false} onClick={() => setOpen(false)} className="flex items-center gap-3 text-ink hover:text-forest">
                  <User aria-hidden className="size-4 text-botanical" strokeWidth={1.8} /> Sign in
                </Link>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

function subscribeNoop() {
  return () => {};
}
