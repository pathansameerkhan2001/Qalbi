/**
 * Product descriptions are stored as one plain-text field (products.description)
 * written in a small Markdown subset:
 *
 *   **Product name**                 ← optional title line (dropped: the page already shows the name)
 *   Intro paragraphs…
 *   **Key Benefits**                 ← a heading on its own line…
 *   - bullet
 *   **How to Use:** Apply to…        ← …or a heading followed by text on the same line
 *   *For external use only.*         ← a line in single asterisks = a note
 *
 * This module turns that text into sections. It never produces HTML: text is
 * rendered by React (components/products/rich-text.tsx), so stored text cannot
 * inject markup. No server-only imports: the admin preview runs it in the browser.
 */

export type DescriptionBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };

export interface DescriptionSection {
  heading: string;
  blocks: DescriptionBlock[];
}

export interface ParsedDescription {
  /** Paragraphs (and lists) before the first section heading. */
  intro: DescriptionBlock[];
  benefits: string[];
  /** Ingredient names as written in the "Key Ingredients" section. Not a full ingredient list. */
  keyIngredients: string[];
  /** Usage steps, in order, verbatim from "How to Use". */
  howToUse: string[];
  suitableFor: string | null;
  /** Lines written in single asterisks, e.g. *For external use only.* */
  notes: string[];
  /** Any other headed section, kept in order (e.g. FAQs written by the administrator). */
  other: DescriptionSection[];
}

export type SectionKind = "benefits" | "keyIngredients" | "howToUse" | "suitableFor";

/** Heading text → known section. Matched on the heading without punctuation, case-insensitively. */
export function classifyHeading(heading: string): SectionKind | null {
  const h = heading.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (/^(key )?benefits?$/.test(h) || h === "why you ll love it") return "benefits";
  if (/^(key |hero |star )?ingredients?$/.test(h)) return "keyIngredients";
  if (/^(how to use( it)?|directions( for use)?|usage|how to apply)$/.test(h)) return "howToUse";
  if (/^(suitable for|skin types?|who is it for)$/.test(h)) return "suitableFor";
  return null;
}

/** Template the admin editor inserts for each known section. */
export const sectionTemplates: Record<SectionKind, { label: string; text: string }> = {
  benefits: { label: "Key Benefits", text: "**Key Benefits**\n- " },
  keyIngredients: { label: "Key Ingredients", text: "**Key Ingredients:** " },
  howToUse: { label: "How to Use", text: "**How to Use**\n1. " },
  suitableFor: { label: "Suitable For", text: "**Suitable For:** " },
};

const HEADING_ONLY = /^\*\*([^*]+?)\*\*:?$/; //          **Key Benefits**  /  **Key Benefits:**
const HEADING_INLINE = /^\*\*([^*]+?):?\*\*:?\s+(.+)$/; // **How to Use:** Apply…
const MD_HEADING = /^#{1,4}\s+(.+?)#*$/; //               ## Key Benefits
const BULLET = /^(?:[-•]|\*(?!\*)|\d+[.)])\s+(.+)$/; //   - item  • item  * item  1. item
const NOTE = /^\*(?!\*)([^*].*?[^*]|[^*])\*$/; //         *a note*

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2);

/** True when a title line only repeats the product name (all of the product's words appear in it). */
function repeatsTitle(line: string, productTitle: string): boolean {
  const titleWords = words(productTitle).filter((w) => w !== "qalbi");
  if (titleWords.length === 0) return false;
  const lineWords = new Set(words(line));
  return titleWords.every((w) => lineWords.has(w));
}

/** "A, B, and C." → ["A", "B", "C"] (commas, semicolons, bullets; a final "and" is dropped). */
export function splitIngredientList(text: string): string[] {
  return text
    .replace(/\.$/, "")
    .split(/\s*[,;]\s*|\s+•\s+/)
    .map((s) => s.replace(/^(and|&)\s+/i, "").trim())
    .filter(Boolean);
}

/** Splits usage text into steps at sentence ends, keeping each sentence verbatim. */
function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

const blocksText = (blocks: DescriptionBlock[]) => blocks.flatMap((b) => (b.type === "p" ? [b.text] : b.items));
const blocksItems = (blocks: DescriptionBlock[]) => blocks.flatMap((b) => (b.type === "p" ? splitSentences(b.text) : b.items));

export function parseProductDescription(text: string, productTitle = ""): ParsedDescription {
  const result: ParsedDescription = { intro: [], benefits: [], keyIngredients: [], howToUse: [], suitableFor: null, notes: [], other: [] };
  const sections: DescriptionSection[] = [];
  let current: DescriptionBlock[] = result.intro;
  let paragraph: string[] = [];
  let list: string[] = [];
  let sawContent = false;

  const flush = () => {
    if (paragraph.length) current.push({ type: "p", text: paragraph.join(" ") });
    if (list.length) current.push({ type: "ul", items: list });
    paragraph = [];
    list = [];
  };
  const startSection = (heading: string) => {
    flush();
    const section = { heading: heading.trim().replace(/:$/, ""), blocks: [] };
    sections.push(section);
    current = section.blocks;
  };

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const headingOnly = HEADING_ONLY.exec(line) ?? MD_HEADING.exec(line);
    const headingInline = !headingOnly && HEADING_INLINE.exec(line);
    const bullet = !headingOnly && !headingInline && BULLET.exec(line);
    const note = !headingOnly && !headingInline && !bullet && NOTE.exec(line);

    if (headingOnly) {
      // A first line that only repeats the product name is a title, not a section.
      if (!sawContent && sections.length === 0 && !classifyHeading(headingOnly[1]) && repeatsTitle(headingOnly[1], productTitle)) {
        sawContent = true;
        continue;
      }
      startSection(headingOnly[1]);
    } else if (headingInline) {
      startSection(headingInline[1]);
      paragraph.push(headingInline[2]);
    } else if (bullet) {
      if (paragraph.length) {
        current.push({ type: "p", text: paragraph.join(" ") });
        paragraph = [];
      }
      list.push(bullet[1]);
    } else if (note) {
      flush();
      result.notes.push(note[1].trim());
    } else {
      if (list.length) {
        current.push({ type: "ul", items: list });
        list = [];
      }
      paragraph.push(line);
    }
    sawContent = true;
  }
  flush();

  for (const section of sections) {
    const kind = classifyHeading(section.heading);
    if (kind === "benefits") result.benefits.push(...blocksItems(section.blocks));
    else if (kind === "keyIngredients") result.keyIngredients.push(...blocksText(section.blocks).flatMap(splitIngredientList));
    else if (kind === "howToUse") result.howToUse.push(...blocksItems(section.blocks));
    else if (kind === "suitableFor") result.suitableFor = [result.suitableFor, ...blocksText(section.blocks)].filter(Boolean).join(" ") || null;
    else if (section.blocks.length) result.other.push(section);
  }
  return result;
}

/** Plain text without Markdown markers (meta descriptions, JSON-LD, short summaries). */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/^\s*(?:[-•]|\*(?!\*)|\d+[.)])\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Short summary for the top of the product page: the first intro paragraph, without markers. */
export function descriptionSummary(parsed: ParsedDescription): string | null {
  const first = parsed.intro.find((b) => b.type === "p");
  return first ? stripMarkdown(first.text) : null;
}

/**
 * True when the product's own "Key Ingredients" names this ingredient (whole-word,
 * case-insensitive: "Green Cardamom Extract" names Cardamom; "Rosemary" does not name Rose).
 */
export function namesIngredient(keyIngredients: string[], ingredientName: string): boolean {
  const pattern = new RegExp(`\\b${ingredientName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`, "i");
  return keyIngredients.some((k) => pattern.test(k));
}

/**
 * Products that contain an ingredient: those an administrator linked to it, plus
 * those whose own "Key Ingredients" section names it.
 */
export function productsWithIngredient<P extends { handle: string; title: string; description: string }>(ingredient: { name: string; productHandles: string[] }, products: P[]): P[] {
  return products.filter((p) => ingredient.productHandles.includes(p.handle) || namesIngredient(parseProductDescription(p.description, p.title).keyIngredients, ingredient.name));
}
