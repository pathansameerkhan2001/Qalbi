import { Container } from "@/components/ui/container";
import { ProductGridSkeleton } from "@/components/ui/skeletons";

/**
 * Shown while a page streams in. At least a screen tall, so the footer starts below
 * the fold instead of appearing and then jumping down (a large layout shift on
 * desktop, where the skeleton alone is shorter than the window).
 */
export default function Loading() {
  return (
    <Container className="min-h-[100svh] py-12">
      <div className="mb-8 h-10 w-64 animate-pulse rounded bg-sand" />
      <ProductGridSkeleton />
    </Container>
  );
}
