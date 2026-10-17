import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { images } from "@/data/images";
import { brandConfig } from "@/data/brand";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Sparkle } from "@/components/layout/logo";

const { forest, bloom, touch, sky } = images.lookbook;

function Frame({ image, className, sizes }: { image: (typeof images.lookbook)[keyof typeof images.lookbook]; className?: string; sizes: string }) {
  return (
    <figure className={`group relative overflow-hidden rounded-[3px] bg-sand shadow-lift ${className ?? ""}`}>
      <Image src={image.src} alt={image.alt} fill sizes={sizes} className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]" />
      <span aria-hidden className="pointer-events-none absolute inset-2 rounded-[2px] border border-ivory/40 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </figure>
  );
}

/** Editorial band of QALBI studio photography. */
export function Lookbook() {
  return (
    <section aria-labelledby="lookbook-heading" className="relative overflow-hidden bg-gradient-to-b from-cream via-sand to-cream py-14 sm:py-20">
      <Container className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal className="relative z-10 max-w-md">
          <p className="ornament eyebrow mb-4 justify-start">The QALBI Ritual</p>
          <h2 id="lookbook-heading" className="text-display text-ink">
            Elegance in <span className="text-gold-sheen italic">Every Drop</span>
          </h2>
          <p className="mt-5 text-[0.98rem] leading-relaxed text-ink/75">
            Saffron, rose and time-honoured botanicals — composed into a ritual that feels as beautiful as it looks. Every {brandConfig.shortName}{" "}
            essential is made to turn your everyday routine into a quiet moment of self-care.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn btn-primary">
              Shop the Collection <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/customised-skincare" className="btn btn-outline">
              Personalise Your Ritual
            </Link>
          </div>
        </Reveal>

        <div className="relative grid grid-cols-2 gap-3 sm:gap-5">
          <Sparkle className="float-twinkle absolute -left-3 top-6 z-10 size-5 text-gold sm:-left-6" />
          <Sparkle className="float-twinkle absolute -right-2 bottom-10 z-10 size-4 text-gold [--delay:-2s]" />
          <div className="flex flex-col gap-3 sm:gap-5">
            <Reveal>
              <Frame image={forest} className="aspect-[3/4]" sizes="(min-width: 1024px) 28vw, 48vw" />
            </Reveal>
            <Reveal delay={0.15}>
              <Frame image={sky} className="aspect-[4/5]" sizes="(min-width: 1024px) 28vw, 48vw" />
            </Reveal>
          </div>
          <div className="mt-12 flex flex-col gap-3 sm:mt-20 sm:gap-5">
            <Reveal delay={0.1}>
              <Frame image={bloom} className="aspect-[4/5]" sizes="(min-width: 1024px) 28vw, 48vw" />
            </Reveal>
            <Reveal delay={0.25}>
              <Frame image={touch} className="aspect-[4/5]" sizes="(min-width: 1024px) 28vw, 48vw" />
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
