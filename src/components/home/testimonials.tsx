import { MessageSquareQuote, Quote, Star } from "lucide-react";
import type { Review } from "@/types/content";
import { publishedReviews } from "@/data/reviews";
import { FloralBorder, FloralCorner } from "@/components/ui/flowers";
import { brandConfig } from "@/data/brand";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { whatsappLink } from "@/lib/utils";
import { ReviewCarousel } from "./review-carousel";

const feedbackLink = whatsappLink("Hello QALBI Naturals, I'd like to share feedback about my experience.");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gold-soft/40 bg-ivory p-6 shadow-[0_14px_34px_-22px_rgb(41_69_50/0.45)] sm:p-7">
      {/* Fine gold rule along the top edge. */}
      <span aria-hidden className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-soft/80 to-transparent" />
      <div className="flex items-center justify-between">
        <Quote aria-hidden className="size-7 rotate-180 fill-gold/15 text-gold" strokeWidth={1.2} />
        {/* Stars only for a rating the customer actually gave. */}
        {review.rating !== null && (
          <div className="flex" role="img" aria-label={`Rated ${review.rating} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} aria-hidden className={i < (review.rating ?? 0) ? "size-4 fill-gold text-gold" : "size-4 text-gold/40"} strokeWidth={1.5} />
            ))}
          </div>
        )}
      </div>
      <blockquote className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-ink/80">&ldquo;{review.quote}&rdquo;</blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold-soft/70 bg-cream font-serif text-base tracking-wide text-forest">
          {initials(review.name)}
        </span>
        <span>
          <span className="block font-serif text-lg leading-tight text-forest">{review.name}</span>
          {review.verifiedPurchase && <span className="text-xs text-muted">Verified customer</span>}
        </span>
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
      <a href={feedbackLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm shrink-0 self-start sm:self-auto">
        <WhatsAppIcon className="size-4" /> Share feedback on WhatsApp
      </a>
    </div>
  );
}

/**
 * Customer feedback (home and /reviews). Shows only reviews the customers have
 * approved (src/data/reviews.ts); until there are any, an invitation to share
 * feedback on WhatsApp.
 */
export function Testimonials({ as: Heading = "h2" }: { as?: "h1" | "h2" }) {
  return (
    <section aria-labelledby="reviews-heading" className="relative isolate overflow-hidden py-10 sm:py-14">
      {/* Behind the cards: a rose spray bottom right and jasmine top left (wide screens); a garland above the heading on every screen. */}
      <FloralCorner variant="rose" corner="br" size="lg" desktop />
      <FloralCorner variant="jasmine" corner="tl" size="md" desktop />
      <Container>
        <FloralBorder className="mb-6 sm:mb-8" />
        <SectionHeading
          as={Heading}
          id="reviews-heading"
          eyebrow="Customer Stories"
          title="Customer Feedback"
          description={`Every ritual tells a story. Discover the experiences shared by our ${brandConfig.shortName} community.`}
          action={publishedReviews.length > 3 && Heading === "h2" ? { label: "View All", href: "/reviews" } : undefined}
        />
        {publishedReviews.length ? (
          <>
            <ReviewCarousel label="Customer reviews">
              {publishedReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </ReviewCarousel>
            <div className="mt-8 flex flex-col items-center gap-3 text-center sm:mt-10">
              <p className="text-sm text-muted">Tried {brandConfig.shortName}? We&apos;d love to hear about your experience.</p>
              <a href={feedbackLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                <WhatsAppIcon className="size-4" /> Share feedback on WhatsApp
              </a>
            </div>
          </>
        ) : (
          <ReviewsEmptyState />
        )}
      </Container>
    </section>
  );
}
