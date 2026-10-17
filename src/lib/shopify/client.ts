import "server-only";
import { shopifyConfig } from "./config";

export class ShopifyError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ShopifyError";
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

/** Typed Storefront API request. Tokens never leave the server. */
export async function shopifyFetch<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
): Promise<TData> {
  const { storeDomain, apiVersion, privateToken, publicToken } = shopifyConfig;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (privateToken) {
    headers["Shopify-Storefront-Private-Token"] = privateToken;
  } else {
    headers["X-Shopify-Storefront-Access-Token"] = publicToken;
  }

  const res = await fetch(`https://${storeDomain}/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ShopifyError(`Shopify request failed with status ${res.status}`, res.status);
  }

  const json = (await res.json()) as GraphQLResponse<TData>;
  if (json.errors?.length) {
    throw new ShopifyError(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new ShopifyError("Shopify response contained no data");
  }
  return json.data;
}
