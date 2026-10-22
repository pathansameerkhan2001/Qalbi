import { Fragment } from "react";
import type { DescriptionBlock } from "@/lib/content/product-description";
import { cn } from "@/lib/utils";

/**
 * Renders **bold** and *italic* inside one line of stored product text. Output is
 * React text nodes and <strong>/<em> only — never HTML from the database — so
 * anything else in the text (including "<script>") is shown as plain characters.
 */
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={i} className="font-medium text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
          <em key={i}>{part.slice(1, -1)}</em>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function DescriptionBlocks({ blocks, className }: { blocks: DescriptionBlock[]; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i}>
            <InlineText text={b.text} />
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-botanical">
            {b.items.map((item, j) => (
              <li key={j}>
                <InlineText text={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
