import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AboutStory, ValuesStrip } from "@/components/home/about-story";
import { ReelsSection } from "@/components/home/reels-section";
import { Container } from "@/components/ui/container";
import { WhyQalbi } from "@/components/about/why-qalbi";

export const metadata: Metadata = {
  title: "About Us",
  description: "Why QALBI: a blend of Ancient Ayurvedic Wisdom and Modern Cosmetic Science, inspired by the healing power of herbs and botanicals.",
};

export default function AboutPage() {
  return (
    <>
      <AboutStory as="h1" showCta={false} />
      <WhyQalbi />
      <ValuesStrip />
      <section aria-labelledby="explore-heading" className="py-12 sm:py-16">
        <Container className="grid gap-4 md:grid-cols-2">
          <h2 id="explore-heading" className="sr-only">Explore QALBI</h2>
          {[
            { eyebrow: "Ingredients", title: "Know What Goes on Your Skin", href: "/ingredients", cta: "Explore Ingredients" },
            { eyebrow: "Customised Skincare", title: "Make Your Skincare Personal", href: "/customised-skincare", cta: "Start an Enquiry" },
          ].map((card) => (
            <Link key={card.href} href={card.href} className="group flex flex-col justify-between gap-8 rounded-[3px] border border-line bg-ivory p-7 transition hover:shadow-soft sm:p-9">
              <div>
                <p className="eyebrow mb-2">{card.eyebrow}</p>
                <p className="font-serif text-3xl text-ink">{card.title}</p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-forest">
                {card.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </Container>
      </section>
      <ReelsSection />
    </>
  );
}
