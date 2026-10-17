import { Container } from "@/components/ui/container";
import { ProductGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <Container className="py-12">
      <div className="mb-8 h-10 w-64 animate-pulse rounded bg-sand" />
      <ProductGridSkeleton />
    </Container>
  );
}
