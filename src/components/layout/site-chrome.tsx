import { AnnouncementBar } from "./announcement-bar";
import { Header } from "./header";
import { Footer } from "./footer";
import { DeveloperCredit } from "./developer-credit";
import { WhatsAppButton } from "./whatsapp-button";
import { FloatingBotanicals } from "./floating-botanicals";
import { FloralEntrance } from "./floral-entrance";
import { BloomObserver } from "./bloom-observer";
import { FloralBorder, FloralDefs } from "@/components/ui/flowers";
import { SitePetals } from "@/components/home/petal-drift";
import { Container } from "@/components/ui/container";
import { AnalyticsConsent } from "./analytics-consent";
import { CartProvider } from "@/components/cart/cart-provider";

/** Storefront frame: announcement bar, header, footer and floating helpers. Not used by /admin. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <FloralDefs />
      <FloralEntrance />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[3px] focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      {/* A blooming garland closes every page, just above the footer. */}
      <Container className="pt-6">
        <FloralBorder />
      </Container>
      <DeveloperCredit />
      <Footer />
      <FloatingBotanicals />
      <SitePetals />
      <BloomObserver />
      <WhatsAppButton />
      <AnalyticsConsent />
    </CartProvider>
  );
}
