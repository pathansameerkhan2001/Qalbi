import { MessageSquareQuote, Quote, Star } from "lucide-react";
import type { Review } from "@/types/content";
import { reviews } from "@/data/content";
import { brandConfig } from "@/data/brand";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { ScrollRow } from "@/components/ui/scroll-row";
import { whatsappLink } from "@/lib/utils";

function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="flex h-full flex-col rounded-[3px] border border-line bg-ivory p-6">
      <Quote aria-hidden className="size-6 text-gold" />
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink/80">&ldquo;{review.quote}&rdquo;</blockquote>
      <div className="mt-4 flex" aria-label={`Rated ${review.rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} aria-hidden className={i < review.rating ? "size-4 fill-gold text-gold" : "size-4 text-gold/40"} strokeWidth={1.5} />
        ))}
      </div>
      <figcaption className="mt-3 text-sm">
        <span className="font-medium text-ink">{review.name}</span>
        {review.verifiedPurchase && <span className="block text-xs text-muted">Verified customer</span>}
      </figcaption>
    </figure>
  );
}

export function ReviewsEmptyState() {
  return (
    <div className="flex flex-col gap-5 rounded-[3px] border border-dashed border-line bg-ivory/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-gold/50 text-gold">
          <MessageSquareQuote className="size-5" strokeWidth={1.3} aria-hidden />
        </span>
        <div>
          <p className="font-serif text-2xl text-ink">Tried QALBI? We&apos;d love to hear from you.</p>
          <p className="mt-1 text-sm text-muted">Customer stories will be shared here, with permission, as they come in.</p>
        </div>
      </div>
      <a href={whatsappLink("Hello QALBI Naturals, I'd like to share feedback about my experience.")} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm shrink-0 self-start sm:self-auto">
        <WhatsAppIcon className="size-4" /> Share feedback on WhatsApp
      </a>
    </div>
  );
}

export function Testimonials({ as: Heading = "h2" }: { as?: "h1" | "h2" }) {
  return (
    <section aria-labelledby="reviews-heading" className="py-10 sm:py-14">
      <Container>
        <SectionHeading
          as={Heading}
          id="reviews-heading"
          eyebrow="Testimonials"
          title="Customer Feedback"
          description={`Real people. Real experiences. Hear what our customers say about ${brandConfig.shortName}.`}
          action={reviews.length > 0 && Heading === "h2" ? { label: "View All", href: "/reviews" } : undefined}
        />
        {reviews.length ? (
          <ScrollRow label="Customer reviews" listClassName="-mx-4 gap-4 px-4 sm:mx-0 sm:px-0">
            {reviews.map((review) => (
              <li key={review.id} className="w-[85%] shrink-0 sm:w-[46%] lg:w-[calc((100%-2rem)/3)]">
                <ReviewCard review={review} />
              </li>
            ))}
          </ScrollRow>
        ) : (
          <ReviewsEmptyState />
        )}
      </Container>
    </section>
  );
}
