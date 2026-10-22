import type { Metadata } from "next";
import { Fragment } from "react";
import { brandAssets, brandConfig } from "@/data/brand";
import { absoluteUrl } from "@/lib/site";
import { Hero } from "@/components/home/hero";
import { OfferBar } from "@/components/home/offer-bar";
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
import { getSetting } from "@/lib/store/settings";
import { resolveHomepageSections, type HomepageSectionId } from "@/lib/content/homepage";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Organization + WebSite structured data, from the verified business details in src/data/brand.ts. */
function siteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: brandConfig.name,
        url: absoluteUrl("/"),
        ...(brandAssets.logoSrc ? { logo: absoluteUrl(brandAssets.logoSrc) } : {}),
        email: brandConfig.email,
        sameAs: [brandConfig.instagramUrl],
        contactPoint: { "@type": "ContactPoint", contactType: "customer service", telephone: brandConfig.whatsappNumber.replace(/\s/g, ""), email: brandConfig.email, availableLanguage: ["en"] },
      },
      { "@type": "WebSite", "@id": absoluteUrl("/#website"), name: brandConfig.name, url: absoluteUrl("/"), publisher: { "@id": absoluteUrl("/#organization") } },
    ],
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Homepage sections in their default order; /admin/homepage can reorder or hide them. */
const sections: Record<HomepageSectionId, () => React.ReactNode> = {
  trust_badges: () => <TrustBadges />,
  categories: () => <CategoryScroller />,
  favourites: () => (
    <Reveal>
      <Favourites />
    </Reveal>
  ),
  reels: () => <ReelsSection />,
  lookbook: () => <Lookbook />,
  about: () => (
    <Reveal>
      <AboutStory />
    </Reveal>
  ),
  values: () => <ValuesStrip />,
  ingredients: () => (
    <Reveal>
      <IngredientsPreview />
    </Reveal>
  ),
  custom_skincare: () => (
    <Reveal>
      <CustomSkincareSection />
    </Reveal>
  ),
  journal: () => (
    <Reveal>
      <JournalPreview />
    </Reveal>
  ),
  testimonials: () => (
    <Reveal>
      <Testimonials />
    </Reveal>
  ),
};

export default async function HomePage() {
  const layout = resolveHomepageSections((await getSetting("homepage_sections"))?.sections);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd() }} />
      <h1 className="sr-only">
        {brandConfig.name} — {brandConfig.tagline}
      </h1>
      <Hero />
      <OfferBar />
      {layout
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]()}</Fragment>
        ))}
    </>
  );
}
