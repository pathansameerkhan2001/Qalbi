import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { JournalArticle } from "@/types/content";
import { brandConfig } from "@/data/brand";
import { getJournalArticle, getJournalArticles } from "@/lib/shopify";
import { truncate } from "@/lib/content/rules";
import { absoluteUrl } from "@/lib/site";
import { Container } from "@/components/ui/container";
import { ArticleView } from "@/components/journal/article-view";

export async function generateStaticParams() {
  const articles = await getJournalArticles();
  // Cache Components requires at least one param; unknown slugs render notFound().
  return articles.length ? articles.map((a) => ({ slug: a.slug })) : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getJournalArticle(slug);
  if (!article) return { title: "Article not found", robots: { index: false } };
  const title = article.seoTitle || article.title;
  const description = truncate(article.seoDescription || article.excerpt, 160);
  return {
    title,
    description,
    alternates: { canonical: `/journal/${article.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/journal/${article.slug}`,
      publishedTime: article.publishedAt,
      ...(article.updatedAt ? { modifiedTime: article.updatedAt } : {}),
      ...(article.author ? { authors: [article.author] } : {}),
      images: article.image.src ? [{ url: article.image.src, alt: article.image.alt }] : undefined,
    },
  };
}

function articleJsonLd(article: JournalArticle) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.seoDescription || article.excerpt,
    datePublished: article.publishedAt,
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    ...(article.image.src ? { image: [absoluteUrl(article.image.src)] } : {}),
    author: article.author ? { "@type": "Person", name: article.author } : { "@type": "Organization", name: brandConfig.name },
    publisher: { "@type": "Organization", name: brandConfig.name },
    mainEntityOfPage: absoluteUrl(`/journal/${article.slug}`),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

async function Article({ params }: { params: PageProps<"/journal/[slug]">["params"] }) {
  const { slug } = await params;
  const article = await getJournalArticle(slug);
  if (!article) notFound();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd(article) }} />
      <ArticleView
        article={article}
        backLink={
          <Link href="/journal" className="inline-flex items-center gap-1.5 text-sm text-forest hover:underline">
            <ArrowLeft className="size-4" aria-hidden /> The QALBI Journal
          </Link>
        }
      />
    </>
  );
}

export default function ArticlePage({ params }: PageProps<"/journal/[slug]">) {
  return (
    <Suspense fallback={<Container className="max-w-3xl py-14"><div className="h-12 w-3/4 animate-pulse rounded bg-sand" /></Container>}>
      <Article params={params} />
    </Suspense>
  );
}
