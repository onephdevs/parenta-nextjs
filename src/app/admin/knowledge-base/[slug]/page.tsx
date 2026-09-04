import { notFound } from 'next/navigation';
import KnowledgeArticleView from '@/components/features/knowledge-base/KnowledgeArticleView';
import { getKnowledgeArticle, KNOWLEDGE_ARTICLES } from '@/lib/knowledge-base/articles';

export function generateStaticParams() {
  return KNOWLEDGE_ARTICLES.map((article) => ({ slug: article.slug }));
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getKnowledgeArticle(slug);
  if (!article) notFound();
  return <KnowledgeArticleView article={article} />;
}
