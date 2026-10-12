import { DocsArticle } from "@/components/docs/DocsArticle";
import { PAGES } from "@/features/docs/pages";

const page = PAGES[0];

export const metadata = {
  title: { absolute: `${page.title} · Luora Docs` },
  description: page.lead,
  alternates: { canonical: "/docs" },
};

export default function DocsHome() {
  return <DocsArticle page={page} />;
}
