"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { parseProductDescription, sectionTemplates, type SectionKind } from "@/lib/content/product-description";
import { DescriptionBlocks, InlineText } from "@/components/products/rich-text";
import { cn } from "@/lib/utils";

const MAX = 4000;

/**
 * The product description, with buttons that insert the sections the product page
 * understands and a preview built by the same parser the website uses — so what
 * the administrator sees here is what customers see.
 */
export function DescriptionEditor({ defaultValue, productName, error }: { defaultValue: string; productName: string; error?: React.ReactNode }) {
  const [text, setText] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);
  const parsed = useMemo(() => parseProductDescription(text, productName), [text, productName]);

  const found: Record<SectionKind, number> = {
    benefits: parsed.benefits.length,
    keyIngredients: parsed.keyIngredients.length,
    howToUse: parsed.howToUse.length,
    suitableFor: parsed.suitableFor ? 1 : 0,
  };

  const insert = (snippet: string) => {
    const el = ref.current;
    const at = el ? el.selectionEnd : text.length;
    const before = text.slice(0, at).replace(/\s*$/, "");
    const next = `${before}${before ? "\n\n" : ""}${snippet}`;
    const cursor = next.length;
    setText(next + text.slice(at));
    setTab("write");
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor="p-description" className="label mb-0">
          Description
        </label>
        <div role="tablist" aria-label="Description view" className="flex rounded-full border border-line p-0.5 text-xs">
          {(["write", "preview"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-full px-3 py-1 capitalize", tab === t ? "bg-forest text-ivory" : "text-ink")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Add a section">
        {(Object.keys(sectionTemplates) as SectionKind[]).map((k) => (
          <button key={k} type="button" onClick={() => insert(sectionTemplates[k].text)} className="inline-flex items-center gap-1 rounded-full border border-line bg-ivory px-2.5 py-1 text-xs text-ink hover:border-forest">
            {found[k] ? <Check className="size-3 text-botanical" aria-hidden /> : <Plus className="size-3" aria-hidden />}
            {sectionTemplates[k].label}
            {found[k] > 1 && <span className="text-muted">({found[k]})</span>}
          </button>
        ))}
        <button type="button" onClick={() => insert("*For external use only. Perform a patch test before use.*")} className="inline-flex items-center gap-1 rounded-full border border-line bg-ivory px-2.5 py-1 text-xs text-ink hover:border-forest">
          <Plus className="size-3" aria-hidden /> Note
        </button>
      </div>

      {/* The textarea stays mounted (hidden in preview) so the value is always submitted. */}
      <textarea
        ref={ref}
        id="p-description"
        name="description"
        rows={14}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        hidden={tab !== "write"}
        aria-describedby="p-description-help"
        className="field mt-2 resize-y font-mono text-[0.82rem] leading-relaxed"
      />
      {tab === "preview" && <DescriptionPreview parsed={parsed} empty={!text.trim()} />}

      <p id="p-description-help" className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-muted">
        <span>
          Start with a short introduction. Use the buttons for sections; <code>**bold**</code>, <code>*italic*</code> and <code>- </code> lists are supported. Only write what the packaging or QALBI&apos;s
          approved information says.
        </span>
        <span className={cn(text.length > MAX * 0.95 && "text-[#7a5418]")}>
          {text.length.toLocaleString("en-IN")} / {MAX.toLocaleString("en-IN")}
        </span>
      </p>
      {error}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
      <p className="mb-1.5 font-serif text-lg text-forest">{title}</p>
      {children}
    </div>
  );
}

function DescriptionPreview({ parsed, empty }: { parsed: ReturnType<typeof parseProductDescription>; empty: boolean }) {
  if (empty) return <p className="mt-2 rounded-[3px] border border-dashed border-line p-4 text-sm text-muted">Nothing to preview yet.</p>;
  return (
    <div className="mt-2 space-y-4 rounded-[3px] border border-line bg-cream p-4 text-sm leading-relaxed text-ink/85">
      {parsed.intro.length > 0 ? <DescriptionBlocks blocks={parsed.intro} /> : <p className="text-[#7a5418]">No introduction — the product page will start straight with the sections.</p>}
      {parsed.benefits.length > 0 && (
        <Section title="Key Benefits">
          <ul className="list-disc space-y-1 pl-5">
            {parsed.benefits.map((b, i) => (
              <li key={i}>
                <InlineText text={b} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      {parsed.keyIngredients.length > 0 && (
        <Section title={`Key Ingredients (${parsed.keyIngredients.length})`}>
          <ul className="flex flex-wrap gap-1.5">
            {parsed.keyIngredients.map((k) => (
              <li key={k} className="rounded-full border border-line bg-ivory px-2.5 py-0.5 text-xs">
                {k}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {parsed.howToUse.length > 0 && (
        <Section title="How to Use">
          <ol className="list-decimal space-y-1 pl-5">
            {parsed.howToUse.map((s, i) => (
              <li key={i}>
                <InlineText text={s} />
              </li>
            ))}
          </ol>
        </Section>
      )}
      {parsed.suitableFor && (
        <Section title="Suitable For">
          <p>
            <InlineText text={parsed.suitableFor} />
          </p>
        </Section>
      )}
      {parsed.other.map((s) => (
        <Section key={s.heading} title={`${s.heading} (shown as its own section)`}>
          <DescriptionBlocks blocks={s.blocks} />
        </Section>
      ))}
      {parsed.notes.length > 0 && (
        <Section title="Notes (in “Ingredients & product information”)">
          {parsed.notes.map((n, i) => (
            <p key={i} className="italic">
              {n}
            </p>
          ))}
        </Section>
      )}
    </div>
  );
}
