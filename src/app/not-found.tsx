import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SiteChrome } from "@/components/layout/site-chrome";

export default function NotFound() {
  return (
    <SiteChrome>
      <Container className="flex flex-col items-center py-24 text-center">
        <p className="eyebrow mb-3">404</p>
        <h1 className="text-h2 text-ink">This page couldn&apos;t be found</h1>
        <p className="mt-3 max-w-md text-sm text-muted">The page may have moved, or the product is no longer available.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/products" className="btn btn-primary">Shop all products</Link>
          <Link href="/" className="btn btn-outline">Back to home</Link>
        </div>
      </Container>
    </SiteChrome>
  );
}
