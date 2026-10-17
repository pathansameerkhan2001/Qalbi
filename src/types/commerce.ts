export interface Money {
  amount: number;
  currencyCode: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  /** True for development illustrations that must be replaced with real photography. */
  placeholder?: boolean;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  /** Only present when the commerce backend exposes inventory. */
  quantityAvailable: number | null;
  price: Money;
  compareAtPrice: Money | null;
  selectedOptions: { name: string; value: string }[];
  image: ProductImage | null;
}

export interface ProductOption {
  name: string;
  values: string[];
}

/** Genuine aggregate rating sourced from the store (e.g. Shopify review metafields). */
export interface ProductRating {
  value: number;
  scaleMax: number;
  count: number;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: ProductImage | null;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  priceRange: { min: Money; max: Money };
  compareAtPriceRange: { min: Money; max: Money } | null;
  rating: ProductRating | null;
  /** Supplied formulation information (Shopify metafields). Null when not supplied. */
  ingredients: string | null;
  directions: string | null;
  warnings: string | null;
  collectionHandles: string[];
}

export interface Collection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ProductImage | null;
}

export type ProductSortKey = "featured" | "price-asc" | "price-desc" | "newest" | "title";

export interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    selectedOptions: { name: string; value: string }[];
    product: { handle: string; title: string; featuredImage: ProductImage | null };
    price: Money;
  };
  cost: { totalAmount: Money };
}

export interface Cart {
  id: string;
  checkoutUrl: string | null;
  totalQuantity: number;
  lines: CartLine[];
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money | null;
  };
}

export interface ShopPolicy {
  title: string;
  body: string;
  handle: string;
}

/** Where catalogue data currently comes from. */
export type CommerceSource = "shopify" | "supabase" | "development-fixtures";
