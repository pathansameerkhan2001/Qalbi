import type { Metadata } from "next";
import { getJournalArticles } from "@/lib/shopify";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { JournalCard, JournalEmptyState } from "@/components/home/journal-preview";

export const metadata: Metadata = {
  title: "The QALBI Journal",
  description: "Skincare routines, ingredient education and tips from QALBI Naturals.",
};

export default async function JournalPage() {
  const articles = await getJournalArticles();
  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title="The QALBI Journal"
        description="Skincare routines, ingredient education and expert tips for your natural glow."
        breadcrumbs={[{ label: "Journal" }]}
      />
      <Container className="py-12 sm:py-16">
        {articles.length ? (
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
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
    </>
  );
}
