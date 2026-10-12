import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocsArticle } from "@/components/docs/DocsArticle";
import { hrefOf, PAGES, pageBySlug } from "@/features/docs/pages";

export const generateStaticParams = () =>
  PAGES.filter((p) => p.slug).map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">) {
  const page = pageBySlug((await params).slug);
  if (!page) return { title: "Docs" };
  return {
    title: { absolute: `${page.title} · Luora Docs` },
    description: page.lead,
    alternates: { canonical: hrefOf(page) },
  };
}

async function Content({ params }: PageProps<"/docs/[slug]">) {
  const page = pageBySlug((await params).slug);
  if (!page?.slug) notFound();
  return <DocsArticle page={page} />;
}

// like the other dynamic pages: the URL is read inside Suspense, so navigation stays instant
export default function DocsSlugPage(props: PageProps<"/docs/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <Content {...props} />
    </Suspense>
  );
}
