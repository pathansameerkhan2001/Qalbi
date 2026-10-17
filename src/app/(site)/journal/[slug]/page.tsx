import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getJournalArticle, getJournalArticles } from "@/lib/shopify";
import { formatDate } from "@/lib/utils";
import { Container } from "@/components/ui/container";

export async function generateStaticParams() {
  const articles = await getJournalArticles();
  // Cache Components requires at least one param; unknown slugs render notFound().
  return articles.length ? articles.map((a) => ({ slug: a.slug })) : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getJournalArticle(slug);
  return article ? { title: article.title, description: article.excerpt } : { title: "Article not found" };
}

async function Article({ params }: { params: PageProps<"/journal/[slug]">["params"] }) {
  const { slug } = await params;
  const article = await getJournalArticle(slug);
  if (!article) notFound();

  return (
    <article className="py-10 sm:py-14">
      <Container className="max-w-3xl">
        <Link href="/journal" className="inline-flex items-center gap-1.5 text-sm text-forest hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> The QALBI Journal
        </Link>
        <p className="eyebrow mt-8">{article.category}</p>
        <h1 className="mt-2 text-display text-ink">{article.title}</h1>
        <p className="mt-4 text-sm text-muted">
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          {article.readingMinutes && <> · {article.readingMinutes} min read</>}
          {article.author && <> · {article.author}</>}
        </p>
      </Container>
      <Container className="my-8 max-w-5xl">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[3px] bg-sand">
          <Image src={article.image.src} alt={article.image.alt} fill preload sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
        </div>
      </Container>
      <Container className="max-w-3xl space-y-5 text-[1.02rem] leading-relaxed text-ink/85">
        {article.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </Container>
    </article>
  );
}

export default function ArticlePage({ params }: PageProps<"/journal/[slug]">) {
  return (
    <Suspense fallback={<Container className="max-w-3xl py-14"><div className="h-12 w-3/4 animate-pulse rounded bg-sand" /></Container>}>
      <Article params={params} />
    </Suspense>
  );
}
