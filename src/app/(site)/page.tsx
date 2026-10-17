import { brandConfig } from "@/data/brand";
import { Hero } from "@/components/home/hero";
import { CategoryScroller } from "@/components/home/category-scroller";
import { TrustBadges } from "@/components/home/trust-badges";
import { Favourites } from "@/components/home/favourites";
import { ReelsSection } from "@/components/home/reels-section";
import { AboutStory, ValuesStrip } from "@/components/home/about-story";
import { IngredientsPreview } from "@/components/home/ingredients-preview";
import { CustomSkincareSection } from "@/components/home/custom-skincare-section";
import { JournalPreview } from "@/components/home/journal-preview";
import { Testimonials } from "@/components/home/testimonials";
import { Lookbook } from "@/components/home/lookbook";
import { Reveal } from "@/components/ui/reveal";

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">
        {brandConfig.name} — {brandConfig.tagline}
      </h1>
      <Hero />
      <CategoryScroller />
      <TrustBadges />
      <Reveal>
        <Favourites />
      </Reveal>
      <ReelsSection />
      <Lookbook />
      <Reveal>
        <AboutStory />
      </Reveal>
      <ValuesStrip />
      <Reveal>
        <IngredientsPreview />
      </Reveal>
      <Reveal>
        <CustomSkincareSection />
      </Reveal>
      <Reveal>
        <JournalPreview />
      </Reveal>
      <Reveal>
        <Testimonials />
      </Reveal>
    </>
  );
}
