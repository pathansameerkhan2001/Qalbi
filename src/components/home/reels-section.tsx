import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { brandConfig } from "@/data/brand";
import { images } from "@/data/images";
import { getInstagramReels } from "@/lib/instagram";
import { Container } from "@/components/ui/container";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { ScrollRow } from "@/components/ui/scroll-row";
import { Reveal } from "@/components/ui/reveal";
import { TrackedLink } from "./reel-link";
import { CardOverlay, cardClass, itemClass } from "./reel-card";
import { FloralCorner } from "@/components/ui/flowers";

function FollowButton({ location, className }: { location: string; className?: string }) {
  return (
    <TrackedLink
      href={brandConfig.instagramUrl}
      event={{ name: "instagram_profile_clicked", params: { location } }}
      className={`btn btn-light btn-sm ${className ?? ""}`}
      ariaLabel="Follow QALBI on Instagram (opens Instagram)"
    >
      <InstagramIcon className="size-4" /> Follow {brandConfig.instagramHandle} <ArrowRight className="size-4" aria-hidden />
    </TrackedLink>
  );
}

export async function ReelsSection() {
  const { reels } = await getInstagramReels();

  return (
    <section aria-labelledby="reels-heading" className="relative isolate overflow-hidden bg-forest py-14 text-ivory sm:py-20">
      {/* White jasmine on the deep green. */}
      <FloralCorner variant="jasmine" corner="tr" size="md" desktop className="opacity-90" />
      <span aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-gold/15 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-botanical/40 blur-3xl" />
      <Container className="relative">
        <Reveal className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ornament eyebrow mb-3 justify-start text-gold-soft">
              <span className="text-gold-soft">On Instagram</span>
            </p>
            <h2 id="reels-heading" className="text-h2 text-ivory">
              A Little QALBI on Your Feed
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ivory/70 sm:text-[0.95rem]">
              {reels.length > 0
                ? "Discover our products, skincare rituals, and behind-the-scenes moments."
                : "Moments from our studio campaign — follow us on Instagram for our latest Reels."}
            </p>
          </div>
          <FollowButton location="reels-header" className="hidden self-start sm:inline-flex sm:self-auto" />
        </Reveal>

        <Reveal delay={0.1}>
          <ScrollRow label="QALBI on Instagram" tone="dark" autoAdvance={reels.length > 0 ? 4500 : undefined} listClassName="-mx-4 scroll-px-4 gap-3 px-4 pb-2 pt-1 sm:mx-0 sm:scroll-px-0 sm:gap-4 sm:px-0">
            {reels.length > 0
              ? reels.map((reel) => (
                  <li key={reel.id} className={itemClass}>
                    <TrackedLink
                      href={reel.reelUrl}
                      event={{ name: "instagram_reel_clicked", params: { reel_id: reel.id } }}
                      ariaLabel={`${reel.title} — watch on Instagram`}
                      className={cardClass}
                    >
                      <Image src={reel.thumbnailUrl} alt={reel.alt} fill loading="lazy" sizes="(min-width: 1024px) 240px, 46vw" className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                      <CardOverlay title={reel.title} video />
                    </TrackedLink>
                  </li>
                ))
              : images.moments.map((moment) => (
                  <li key={moment.id} className={itemClass}>
                    <TrackedLink
                      href={brandConfig.instagramUrl}
                      event={{ name: "instagram_profile_clicked", params: { location: `moment-${moment.id}` } }}
                      ariaLabel={`${moment.title} — see more on Instagram`}
                      className={cardClass}
                    >
                      <Image src={moment.src} alt={moment.alt} fill loading="lazy" sizes="(min-width: 1024px) 240px, 46vw" className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                      <CardOverlay title={moment.title} video={false} />
                    </TrackedLink>
                  </li>
                ))}
          </ScrollRow>
        </Reveal>
        <FollowButton location="reels-mobile" className="mt-6 w-full sm:hidden" />
      </Container>
    </section>
  );
}
