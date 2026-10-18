"use client";

import Link from "next/link";

/** Unexpected admin page errors (data errors are shown inline with SetupNotice). Details stay in the server logs. */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" className="rounded-[3px] border border-line bg-ivory p-6 text-sm">
      <h1 className="font-serif text-2xl text-ink">This page couldn&apos;t be loaded</h1>
      <p className="mt-2 text-muted">Please try again. If it keeps happening, check that the latest database migration has been applied.</p>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-primary btn-sm">
          Try again
        </button>
        <Link href="/admin" className="btn btn-outline btn-sm">
          Dashboard
        </Link>
      </div>
    </section>
  );
}
