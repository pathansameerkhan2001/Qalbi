/** Raw Storefront API response shapes (only the fields we query). */

export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  price: ShopifyMoney;
  compareAtPrice: ShopifyMoney | null;
  selectedOptions: { name: string; value: string }[];
  image: ShopifyImage | null;
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: ShopifyImage | null;
  images: { nodes: ShopifyImage[] };
  options: { name: string; optionValues: { name: string }[] }[];
  variants: { nodes: ShopifyVariant[] };
  priceRange: { minVariantPrice: ShopifyMoney; maxVariantPrice: ShopifyMoney };
  compareAtPriceRange: { minVariantPrice: ShopifyMoney; maxVariantPrice: ShopifyMoney } | null;
  collections: { nodes: { handle: string }[] };
  metafields: ({ namespace: string; key: string; value: string } | null)[];
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ShopifyImage | null;
  products?: { nodes: ShopifyProduct[] };
}

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  cost: { totalAmount: ShopifyMoney };
  merchandise: {
    id: string;
    title: string;
    selectedOptions: { name: string; value: string }[];
    price: ShopifyMoney;
    product: { handle: string; title: string; featuredImage: ShopifyImage | null };
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: ShopifyMoney; totalAmount: ShopifyMoney };
  lines: { nodes: ShopifyCartLine[] };
}

export interface ShopifyUserError {
  field: string[] | null;
  message: string;
}

export interface ShopifyPolicy {
  title: string;
  body: string;
  handle: string;
}

export interface ShopifyArticle {
  handle: string;
  title: string;
  excerpt: string | null;
  content: string;
  publishedAt: string;
  tags: string[];
  authorV2: { name: string } | null;
  image: ShopifyImage | null;
}
