"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { NavItem } from "@/types/content";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Dropdown({ item, active }: { item: NavItem; active: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const focusItem = (index: number) => {
    const links = wrapperRef.current?.querySelectorAll<HTMLAnchorElement>("[data-menu-item]");
    if (!links?.length) return;
    links[(index + links.length) % links.length].focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const links = Array.from(wrapperRef.current?.querySelectorAll<HTMLAnchorElement>("[data-menu-item]") ?? []);
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      requestAnimationFrame(() => focusItem(current + 1));
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      focusItem(current - 1);
    }
  };

  return (
    <li
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        window.clearTimeout(closeTimer.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        closeTimer.current = window.setTimeout(() => setOpen(false), 120);
      }}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 py-2 text-[0.8rem] font-medium tracking-wide transition-colors hover:text-gold",
          active ? "text-gold" : "text-ink",
        )}
      >
        {item.label}
        <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <div
        id={menuId}
        hidden={!open}
        className="absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-3"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <ul className="animate-fade-in rounded-[3px] border border-line bg-ivory py-2 shadow-lift">
          <li>
            <Link data-menu-item href={item.href} className="block px-5 py-2 text-sm font-medium text-forest hover:bg-cream focus-visible:bg-cream">
              Shop All Products
            </Link>
          </li>
          {item.children?.map((child) => (
            <li key={child.href}>
              <Link data-menu-item href={child.href} className="block px-5 py-2 text-sm text-ink hover:bg-cream hover:text-forest focus-visible:bg-cream">
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export function DesktopNav({ items }: { items: NavItem[] }) {
  return <DesktopNavView items={items} pathname={usePathname()} />;
}

/** Pure view — also used as the prerendered Suspense fallback (no active state). */
export function DesktopNavView({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-8 xl:gap-10">
        {items.map((item) => {
          const active = isActive(pathname, item.href) || Boolean(item.children?.some((c) => isActive(pathname, c.href)));
          return item.children ? (
            <Dropdown key={item.href} item={item} active={active} />
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative py-2 text-[0.8rem] font-medium tracking-wide transition-colors hover:text-gold",
                  active ? "text-gold after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-gold" : "text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
