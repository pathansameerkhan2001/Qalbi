import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FlaskConical, Flower2, Sprout } from "lucide-react";
import { aboutContent } from "@/data/content";
import { images } from "@/data/images";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const valueIcons = [Sprout, Flower2, FlaskConical];

export function AboutStory({ as: Heading = "h2", showCta = true }: { as?: "h1" | "h2"; showCta?: boolean }) {
  return (
    <section aria-labelledby="about-heading" className="overflow-hidden bg-sand">
      <div className="grid lg:grid-cols-2">
        <div className="relative z-10 flex flex-col justify-center px-4 py-10 sm:px-8 sm:py-14 lg:py-20 lg:pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))] lg:pr-12">
          <p className="eyebrow mb-3">{aboutContent.eyebrow}</p>
          <Heading id="about-heading" className={cn(Heading === "h1" ? "text-display" : "text-h2", "text-ink")}>
            {aboutContent.heading}
          </Heading>
          <div className="mt-5 max-w-md space-y-3 text-[0.95rem] leading-relaxed text-ink/75">
            {aboutContent.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {showCta && (
            <Link href="/about" className="btn btn-primary btn-sm mt-7 self-start">
              Our Story <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[460px]">
          <Image src={images.about.src} alt={images.about.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" preload={Heading === "h1"} />
        </div>
      </div>
    </section>
  );
}

export function ValuesStrip() {
  return (
    <section aria-label="Our values" className="border-b border-line bg-cream">
      <Container>
        <ul className="grid gap-8 py-10 text-center sm:grid-cols-3 sm:gap-4">
          {aboutContent.values.map((value, i) => {
            const Icon = valueIcons[i % valueIcons.length];
            return (
              <li key={value.title} className="flex flex-col items-center gap-2">
                <span className="mb-1 flex size-14 items-center justify-center rounded-full border border-gold/50 text-gold">
                  <Icon className="size-6" strokeWidth={1.2} aria-hidden />
                </span>
                <h3 className="font-sans text-sm font-medium text-ink">{value.title}</h3>
                <p className="text-xs text-muted">{value.text}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
