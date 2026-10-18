"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, GalleryHorizontal, Image as ImageIcon, LayoutDashboard, LayoutList, Megaphone, MessageSquare, Clapperboard, Newspaper, Package, Settings, ShoppingBag, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/hero", label: "Hero Sections", icon: GalleryHorizontal },
  { href: "/admin/offer-bar", label: "Offer Bar", icon: Megaphone },
  { href: "/admin/homepage", label: "Homepage Sections", icon: LayoutList },
  { href: "/admin/reels", label: "Instagram Reels", icon: Clapperboard },
  { href: "/admin/blog", label: "Blogs", icon: Newspaper },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/ingredients", label: "Ingredients", icon: FlaskConical },
  { href: "/admin/media", label: "Media Library", icon: ImageIcon },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
  { href: "/admin/settings", label: "Store Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="scroll-row gap-1 px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-[3px] px-3 py-2 text-sm transition",
              active ? "bg-ivory/12 text-ivory" : "text-ivory/70 hover:bg-ivory/8 hover:text-ivory",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
