import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { STORE_TAG } from "@/lib/store/catalog";

/** Result of an admin form action. `path` is set by image uploads. */
export interface ActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  path?: string;
}

export function invalid(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
}

const columnLabels: Record<string, string> = {
  name: "Name",
  slug: "URL handle",
  price: "Price",
  compare_at_price: "Compare-at price",
  stock_quantity: "Units in stock",
  sku: "SKU",
  category_id: "Category",
  image_url: "Image path",
  sort_order: "Sort order",
};

/** Constraint violations caused by what the admin entered: shown to them, not logged as server errors. */
const inputErrorCodes = new Set(["23505", "23502", "23514", "23503"]);

/** Maps database errors to clear messages; logs only unexpected codes. */
export function dbError(scope: string, error: { code?: string; message: string }, duplicate?: string): ActionState {
  if (!error.code || !inputErrorCodes.has(error.code)) console.error(`[admin] ${scope}:`, error.code ?? error.message);
  const column = /column "([a-z_]+)"/.exec(error.message)?.[1];
  const label = column ? (columnLabels[column] ?? column.replace(/_/g, " ")) : null;
  switch (error.code) {
    case "23505":
      return { ok: false, message: duplicate ?? `That ${scope === "product" ? "URL handle or SKU" : "handle"} is already in use.` };
    case "23502":
      return { ok: false, message: label ? `${label} is required.` : "A required field is missing." };
    case "23514":
      return { ok: false, message: "A value is outside the range the database allows. Please check the fields." };
    case "23503":
      return { ok: false, message: `This ${scope} is still linked to other records.` };
    case "42501":
      return { ok: false, message: "You don't have permission to do that." };
    case "PGRST205":
    case "42P01":
      return { ok: false, message: "The database setup for this section has not been applied yet." };
  }
  return { ok: false, message: `Could not save ${scope}. Please try again.` };
}

/** Refreshes cached storefront data after an admin write. */
export function refreshStore(...paths: string[]) {
  updateTag(STORE_TAG);
  for (const p of paths) revalidatePath(p);
}

export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
