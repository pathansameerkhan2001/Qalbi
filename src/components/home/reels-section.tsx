import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { brandConfig } from "@/data/brand";
import { images } from "@/data/images";
import { getInstagramReels } from "@/lib/instagram";
import { Container } from "@/components/ui/container";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { ScrollRow } from "@/components/ui/scroll-row";
import { Reveal } from "@/components/ui/reveal";
import { TrackedLink } from "./reel-link";

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

const cardClass = "group relative block aspect-[9/16] overflow-hidden rounded-lg bg-forest-deep ring-1 ring-gold-soft/25 transition duration-500 hover:-translate-y-1 hover:ring-gold-soft/70 hover:shadow-[0_24px_48px_-20px_rgb(0_0_0/0.6)]";
const itemClass = "w-[46%] shrink-0 sm:w-[31%] md:w-[23.5%] lg:w-[calc((100%-4rem)/5)]";

function CardOverlay({ title, video }: { title: string; video: boolean }) {
  return (
    <>
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-forest-deep/5 to-transparent" />
      <span aria-hidden className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-ink/25 text-ivory backdrop-blur-sm">
        {video ? <Play className="ml-0.5 size-3.5 fill-ivory" /> : <InstagramIcon className="size-4" />}
      </span>
      <span className="absolute inset-x-3 bottom-3">
        <span className="block font-serif text-lg leading-tight text-ivory">{title}</span>
        <span aria-hidden className="mt-1 flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.16em] text-gold-pale/90 opacity-80 transition group-hover:opacity-100">
          {brandConfig.instagramHandle} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </>
  );
}

export async function ReelsSection() {
  const { reels } = await getInstagramReels();

  return (
    <section aria-labelledby="reels-heading" className="relative overflow-hidden bg-forest py-14 text-ivory sm:py-20">
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
          <ScrollRow label="QALBI on Instagram" listClassName="-mx-4 gap-3 px-4 pb-2 pt-1 sm:mx-0 sm:gap-4 sm:px-0">
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
