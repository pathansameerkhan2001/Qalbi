import Image from "next/image";
import type { JournalArticle } from "@/types/content";
import { formatDate } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { FloralCorner } from "@/components/ui/flowers";

/**
 * A journal article. Admin-written posts are rendered from structured text
 * blocks — every string is output as React text, never as HTML.
 * Shared by /journal/[slug] and the admin preview.
 */
export function ArticleView({ article, backLink }: { article: JournalArticle; backLink?: React.ReactNode }) {
  return (
    <article className="relative isolate overflow-hidden py-10 sm:py-14">
      {/* In the wide margins beside the text column (extra-wide screens only). */}
      <FloralCorner variant="jasmine" corner="tr" size="lg" className="hidden xl:block" />
      <Container className="max-w-3xl">
        {backLink}
        <p className="eyebrow mt-8">{article.category}</p>
        <h1 className="mt-2 text-display text-balance text-ink">{article.title}</h1>
        <p className="mt-4 text-sm text-muted">
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          {article.readingMinutes && <> · {article.readingMinutes} min read</>}
          {article.author && <> · {article.author}</>}
        </p>
      </Container>
      {article.image.src && (
        <Container className="my-8 max-w-5xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[3px] bg-sand">
            <Image src={article.image.src} alt={article.image.alt} fill preload sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
          </div>
        </Container>
      )}
      <Container className="max-w-3xl space-y-5 text-[1.02rem] leading-relaxed text-ink/85">
        {article.blocks
          ? article.blocks.map((block, i) => {
              switch (block.type) {
                case "h2":
                  return (
                    <h2 key={i} className="pt-4 font-serif text-[1.75rem] leading-snug text-ink">
                      {block.text}
                    </h2>
                  );
                case "h3":
                  return (
                    <h3 key={i} className="pt-2 font-serif text-xl text-ink">
                      {block.text}
                    </h3>
                  );
                case "ul":
                  return (
                    <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-gold">
                      {block.items.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  );
                default:
                  return <p key={i}>{block.text}</p>;
              }
            })
          : article.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
      </Container>
    </article>
  );
}
