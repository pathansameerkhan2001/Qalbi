import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { brandConfig } from "@/data/brand";
import { siteUrl } from "@/lib/site";
import { siteOpenGraph, socialImage } from "@/lib/social";
import "./globals.css";

const serif = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

/** Vercel preview deployments must never be indexed (they duplicate the live site). */
const isPreviewDeployment = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  ...(isPreviewDeployment ? { robots: { index: false, follow: false } } : {}),
  title: {
    default: `${brandConfig.name} — ${brandConfig.tagline}`,
    template: `%s | ${brandConfig.name}`,
  },
  description: brandConfig.description,
  applicationName: brandConfig.name,
  openGraph: siteOpenGraph,
  twitter: {
    card: "summary_large_image",
    title: siteOpenGraph.title,
    description: siteOpenGraph.description,
    images: [socialImage],
  },
};

export const viewport: Viewport = {
  themeColor: "#294532",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Runs before any image starts loading: an image that fails (a missing upload,
 * a cold optimiser timeout) is marked data-broken, which globals.css hides so
 * its frame shows a quiet floral placeholder instead of a broken-image icon.
 * Capture phase, because image errors don't bubble. One listener, no React.
 */
const brokenImages = `addEventListener("error",function(e){var t=e.target;if(t&&t.tagName==="IMG")t.setAttribute("data-broken","")},true)`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${serif.variable} ${sans.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: brokenImages }} />
      </head>
      <body className="flex min-h-dvh flex-col overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
