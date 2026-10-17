import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { brandAssets } from "@/data/brand";
import { checkAdmin } from "@/lib/admin/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-[3px] border border-line bg-ivory p-8 shadow-soft">
        {brandAssets.logoSrc && <Image src={brandAssets.logoSrc} alt="QALBI Naturals" width={1067} height={450} className="mx-auto h-auto w-32" preload />}
        <h1 className="mt-6 text-center font-serif text-2xl text-ink">Administrator sign in</h1>
        {isSupabaseConfigured() ? (
          <Suspense
            fallback={
              <div className="flex h-56 items-center justify-center gap-2 text-sm text-muted">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading…
              </div>
            }
          >
            <LoginGate searchParams={searchParams} />
          </Suspense>
        ) : (
          <p className="mt-4 text-center text-sm text-muted">Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable the admin area.</p>
        )}
      </div>
      <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted transition hover:text-forest">
        <ArrowLeft className="size-3.5" aria-hidden /> Back to the store
      </Link>
    </main>
  );
}

/** Sends a signed-in administrator straight to the dashboard; everyone else gets the form. */
async function LoginGate({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [admin, { error }] = await Promise.all([checkAdmin(), searchParams]);
  if (admin.status === "ok") redirect("/admin");
  const forbidden = admin.status === "forbidden" || error === "forbidden";
  return (
    <>
      {forbidden && (
        <p role="alert" className="mt-4 rounded-[3px] border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          This account doesn&apos;t have administrator access. Sign in with an admin account.
        </p>
      )}
      <LoginForm />
    </>
  );
}
