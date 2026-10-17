import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LoaderCircle, LogOut } from "lucide-react";
import { brandAssets } from "@/data/brand";
import { requireAdmin } from "@/lib/admin/auth";
import { signOutAction } from "@/lib/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";

/**
 * Every admin page renders inside AdminGate, which verifies the administrator
 * on the server before any admin content is produced. Pages and actions also
 * call requireAdmin() themselves (defence in depth).
 */
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-5 animate-spin" aria-hidden /> Checking your access…
        </div>
      }
    >
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-forest text-ivory lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block lg:py-6">
          <Link href="/admin" className="flex items-center gap-3">
            {brandAssets.logoSrc && <Image src={brandAssets.logoSrc} alt="QALBI Naturals" width={1067} height={450} className="h-auto w-24 brightness-125" />}
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-gold-soft">Admin</span>
          </Link>
        </div>
        <AdminNav />
        <div className="hidden space-y-3 px-5 py-6 text-xs text-ivory/60 lg:block">
          <p className="truncate" title={admin.email}>
            {admin.email}
          </p>
          <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 hover:text-ivory">
            View website <ExternalLink className="size-3" aria-hidden />
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="inline-flex items-center gap-1.5 hover:text-ivory">
              <LogOut className="size-3.5" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-end gap-4 border-b border-line bg-ivory px-5 py-2 text-xs text-muted lg:hidden">
          <span className="truncate">{admin.email}</span>
          <form action={signOutAction}>
            <button type="submit" className="inline-flex items-center gap-1 text-forest">
              <LogOut className="size-3.5" aria-hidden /> Sign out
            </button>
          </form>
        </div>
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
