import type { Metadata } from "next";
import { Testimonials } from "@/components/home/testimonials";

export const metadata: Metadata = {
  title: "Customer Feedback",
  description: "What customers say about QALBI Naturals.",
};

export default function ReviewsPage() {
  return <Testimonials as="h1" />;
}
