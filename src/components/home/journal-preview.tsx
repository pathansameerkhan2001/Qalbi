import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { JournalArticle } from "@/types/content";
import { getJournalArticles } from "@/lib/shopify";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { FloralCorner } from "@/components/ui/flowers";

export function JournalCard({ article }: { article: JournalArticle }) {
  return (
    <article className="group flex h-full flex-col">
      <Link href={`/journal/${article.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-[3px] bg-sand" tabIndex={-1} aria-hidden>
        <Image src={article.image.src} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-1 flex-col pt-4">
        <p className="eyebrow text-[0.65rem]">{article.category}</p>
        <h3 className="mt-1.5 font-serif text-xl leading-snug text-ink">
          <Link href={`/journal/${article.slug}`} className="hover:text-forest">
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted">{article.excerpt}</p>
        <Link href={`/journal/${article.slug}`} className="mt-3 text-sm font-medium text-forest underline-offset-4 hover:underline">
          Read more<span className="sr-only">: {article.title}</span>
        </Link>
      </div>
    </article>
  );
}

export function JournalEmptyState() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[3px] border border-dashed border-line bg-ivory/60 p-6 sm:flex-row sm:items-center sm:p-8">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-gold/50 text-gold">
        <BookOpen className="size-5" strokeWidth={1.3} aria-hidden />
      </span>
      <div>
        <p className="font-serif text-2xl text-ink">Our first journal stories are being written</p>
        <p className="mt-1 text-sm text-muted">Skincare routines, ingredient notes and ritual guides will appear here soon.</p>
      </div>
    </div>
  );
}

export async function JournalPreview() {
  const articles = (await getJournalArticles()).slice(0, 3);
  return (
    <section aria-labelledby="journal-heading" className="relative isolate overflow-hidden py-10 sm:py-14">
      {/* The article cards have no background: kept small and to extra-wide screens, so it stays in the margin, never behind their text. */}
      <FloralCorner variant="leaf" corner="bl" size="sm" className="hidden 2xl:block" />
      <Container>
        <SectionHeading
          id="journal-heading"
          eyebrow="Blog"
          title="The QALBI Journal"
          description="Skincare routines, ingredient education and expert tips for your natural glow."
          action={articles.length ? { label: "View All Articles", href: "/journal" } : undefined}
        />
        {articles.length ? (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.slug}>
                <JournalCard article={article} />
              </li>
            ))}
          </ul>
        ) : (
          <JournalEmptyState />
        )}
      </Container>
    </section>
  );
}
