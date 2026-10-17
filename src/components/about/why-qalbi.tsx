import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { images } from "@/data/images";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

/**
 * "Why QALBI" — brand statement supplied by QALBI (2026-10-17), reproduced verbatim.
 * The vegan / halal / cruelty-free and ingredient-exclusion statements are QALBI's own
 * claims; supporting documentation is tracked in /admin (setting `brand_claims`).
 * Do not add certification badges or icons for these claims until they are verified.
 */
export const whyQalbiCopy = {
  heading: "Why QALBI Is the Best Choice for Skincare?",
  body: "Our natural skincare range is a harmonious blend of Ancient Ayurvedic Wisdom and Modern Cosmetic Science. We carefully select natural, vegan, halal, and cruelty-free ingredients, ensuring that they are free from harmful chemicals like parabens, lead, silicones, and formaldehyde releasers. Committed to ethical and sustainable beauty solutions, we formulate natural skincare products that nourish and protect your skin without any compromise, delivering visible and lasting results inspired by the healing power of herbs and botanicals.",
};

export function WhyQalbi() {
  const image = images.lookbook.bloom;
  return (
    <section aria-labelledby="why-qalbi-heading" className="relative overflow-hidden bg-ivory py-14 sm:py-20">
      <Container className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[3px] shadow-lift">
            <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 38vw, (min-width: 640px) 28rem, 100vw" className="object-cover" />
          </div>
          <span aria-hidden className="absolute -bottom-4 -left-4 -z-10 hidden h-full w-full rounded-[3px] border border-gold-soft/50 sm:block" />
        </Reveal>
        <Reveal delay={0.1} className="max-w-[38rem]">
          <p className="ornament eyebrow mb-4 justify-start">Our Philosophy</p>
          <h2 id="why-qalbi-heading" className="text-h2 text-ink">
            {whyQalbiCopy.heading}
          </h2>
          <span aria-hidden className="mt-6 block h-px w-16 bg-gradient-to-r from-gold to-transparent" />
          <p className="mt-6 text-[1.02rem] leading-[1.85] text-ink/80 first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-[3.4rem] first-letter:leading-[0.9] first-letter:text-gold">
            {whyQalbiCopy.body}
          </p>
          <Link href="/products" className="btn btn-primary mt-8">
            Shop Products <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
