/**
 * Product sharing: the message, the canonical link and the official share
 * links, built from the product itself. Pure (no React, no browser APIs), so
 * the share button, product pages and unit tests (tests/share.test.mts) use
 * the same rules.
 */

export interface ShareableProduct {
  title: string;
  /** Site path of the product page, e.g. /products/radiance-glow-cream. */
  path: string;
  /** Formatted price ("₹349"), only when the catalogue's prices are confirmed; null otherwise. */
  price: string | null;
}

export interface ProductShare {
  url: string;
  title: string;
  /** The message without the link (navigator.share sends the link separately). */
  text: string;
  /** Message and link together, for channels that take a single text. */
  textWithUrl: string;
  whatsappUrl: string;
  facebookUrl: string;
}

/**
 * The product page's public URL. `origin` is the configured production site
 * (NEXT_PUBLIC_SITE_URL) when it is a real https site; only when it isn't
 * (local development, previews) the page's own origin is used instead.
 */
export function productShareUrl(path: string, origin: string): string {
  return new URL(path.startsWith("/") ? path : `/${path}`, origin).href;
}

export function buildProductShare(product: ShareableProduct, origin: string, brand: string): ProductShare {
  const url = productShareUrl(product.path, origin);
  const text = `Discover ${product.title}${product.price ? ` (${product.price})` : ""} at ${brand}. Explore the product here:`;
  const textWithUrl = `${text} ${url}`;
  return {
    url,
    title: `${product.title} | ${brand}`,
    text,
    textWithUrl,
    // No phone number: WhatsApp lets the customer choose who to send it to.
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(textWithUrl)}`,
    // Facebook reads the title, description and image from the page's Open Graph tags.
    facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}
