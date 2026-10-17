const image = /* GraphQL */ `url altText width height`;
const money = /* GraphQL */ `amount currencyCode`;

/**
 * Metafields read for each product. Create these definitions in Shopify admin:
 * - reviews.rating / reviews.rating_count — written by Shopify-compatible review apps
 * - qalbi.ingredients / qalbi.directions / qalbi.warnings — multi-line text
 */
export const PRODUCT_METAFIELDS = [
  { namespace: "reviews", key: "rating" },
  { namespace: "reviews", key: "rating_count" },
  { namespace: "qalbi", key: "ingredients" },
  { namespace: "qalbi", key: "directions" },
  { namespace: "qalbi", key: "warnings" },
] as const;

export const PRODUCT_FRAGMENT = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    productType
    tags
    availableForSale
    featuredImage { ${image} }
    images(first: 10) { nodes { ${image} } }
    options { name optionValues { name } }
    variants(first: 50) {
      nodes {
        id
        title
        availableForSale
        quantityAvailable @include(if: $withInventory)
        price { ${money} }
        compareAtPrice { ${money} }
        selectedOptions { name value }
        image { ${image} }
      }
    }
    priceRange { minVariantPrice { ${money} } maxVariantPrice { ${money} } }
    compareAtPriceRange { minVariantPrice { ${money} } maxVariantPrice { ${money} } }
    collections(first: 10) { nodes { handle } }
    metafields(identifiers: [${PRODUCT_METAFIELDS.map((m) => `{ namespace: "${m.namespace}", key: "${m.key}" }`).join(", ")}]) {
      namespace
      key
      value
    }
  }
`;

export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!, $sortKey: ProductSortKeys, $reverse: Boolean, $query: String, $withInventory: Boolean!) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse, query: $query) {
      nodes { ...ProductFields }
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const PRODUCT_QUERY = /* GraphQL */ `
  query Product($handle: String!, $withInventory: Boolean!) {
    product(handle: $handle) { ...ProductFields }
  }
  ${PRODUCT_FRAGMENT}
`;

export const PRODUCT_RECOMMENDATIONS_QUERY = /* GraphQL */ `
  query Recommendations($productId: ID!, $withInventory: Boolean!) {
    productRecommendations(productId: $productId) { ...ProductFields }
  }
  ${PRODUCT_FRAGMENT}
`;

export const COLLECTION_QUERY = /* GraphQL */ `
  query Collection($handle: String!, $first: Int!, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $withInventory: Boolean!) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image { ${image} }
      products(first: $first, sortKey: $sortKey, reverse: $reverse) {
        nodes { ...ProductFields }
      }
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const COLLECTIONS_QUERY = /* GraphQL */ `
  query Collections {
    collections(first: 50) {
      nodes { id handle title description image { ${image} } }
    }
  }
`;

export const SHOP_POLICIES_QUERY = /* GraphQL */ `
  query ShopPolicies {
    shop {
      privacyPolicy { title body handle }
      refundPolicy { title body handle }
      shippingPolicy { title body handle }
      termsOfService { title body handle }
    }
  }
`;

export const BLOG_ARTICLES_QUERY = /* GraphQL */ `
  query BlogArticles($handle: String!) {
    blog(handle: $handle) {
      articles(first: 30, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          handle
          title
          excerpt
          content
          publishedAt
          tags
          authorV2 { name }
          image { ${image} }
        }
      }
    }
  }
`;

const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { ${money} }
      totalAmount { ${money} }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost { totalAmount { ${money} } }
        merchandise {
          ... on ProductVariant {
            id
            title
            selectedOptions { name value }
            price { ${money} }
            product { handle title featuredImage { ${image} } }
          }
        }
      }
    }
  }
`;

export const CART_QUERY = /* GraphQL */ `
  query Cart($cartId: ID!) { cart(id: $cartId) { ...CartFields } }
  ${CART_FRAGMENT}
`;

export const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_LINES_UPDATE_MUTATION = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

export const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;
