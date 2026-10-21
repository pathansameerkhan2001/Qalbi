import "server-only";

/**
 * Shopify Storefront API configuration (server-only).
 * See `.env.example` for descriptions of every variable.
 */
export const shopifyConfig = {
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "",
  apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION || "2026-07",
  /** Preferred: private Storefront token, sent only from the server. */
  privateToken: process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN ?? "",
  /** Alternative: public Storefront access token. */
  publicToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? "",
  /** Requires the `unauthenticated_read_product_inventory` scope. */
  inventoryAccess: process.env.SHOPIFY_INVENTORY_ACCESS === "true",
  bestsellersCollection: process.env.SHOPIFY_BESTSELLERS_COLLECTION || "bestsellers",
  blogHandle: process.env.SHOPIFY_BLOG_HANDLE || "",
  revalidationSecret: process.env.SHOPIFY_REVALIDATION_SECRET ?? "",
};

export function isShopifyConfigured(): boolean {
  return Boolean(shopifyConfig.storeDomain && (shopifyConfig.privateToken || shopifyConfig.publicToken));
}

/**
 * Development fixtures are allowed only when Shopify is not configured, the
 * database catalogue is not selected (COMMERCE_SOURCE=supabase never falls back
 * to preview products) and we are not explicitly in strict production mode.
 */
export function allowDevelopmentFixtures(): boolean {
  return !isShopifyConfigured() && process.env.COMMERCE_SOURCE !== "supabase" && process.env.COMMERCE_DISABLE_FIXTURES !== "true";
}
