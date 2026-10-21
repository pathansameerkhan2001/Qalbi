import { Suspense } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { getMainNavigation } from "@/lib/navigation";
import { Container } from "@/components/ui/container";
import { CartButton } from "./cart-button";
import { DesktopNav, DesktopNavView } from "./desktop-nav";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { SearchDialog } from "./search-dialog";

export async function Header() {
  const mainNavigation = await getMainNavigation();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
      <Container className="grid h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:h-[5.25rem] lg:grid-cols-[auto_1fr_auto] lg:gap-10">
        <div className="flex items-center lg:hidden">
          <MobileMenu items={mainNavigation} />
        </div>
        <Logo preload className="justify-self-center lg:justify-self-start" />
        <div className="hidden justify-center lg:flex">
          <Suspense fallback={<DesktopNavView items={mainNavigation} pathname="" />}>
            <DesktopNav items={mainNavigation} />
          </Suspense>
        </div>
        <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
          <SearchDialog />
          <Link
            href="/admin/login"
            prefetch={false}
            className="hidden size-10 items-center justify-center text-ink transition hover:text-forest focus-visible:text-forest sm:inline-flex"
            aria-label="Sign in"
            title="Sign in"
          >
            <User className="size-[1.3rem]" strokeWidth={1.6} aria-hidden />
          </Link>
          <CartButton />
        </div>
      </Container>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-gold-soft/70 to-transparent" />
    </header>
  );
}
