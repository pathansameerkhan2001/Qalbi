"use client";

import Link from "next/link";
import { brandConfig } from "@/data/brand";
import { Container } from "@/components/ui/container";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="eyebrow mb-3">Something went wrong</p>
      <h1 className="text-h2 text-ink">We couldn&apos;t load this page</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Please try again in a moment. If the problem continues, reach us at{" "}
        <a href={brandConfig.emailUrl} className="text-forest underline underline-offset-4">{brandConfig.email}</a>.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-outline">Back to home</Link>
      </div>
    </Container>
  );
}
