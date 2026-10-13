import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExplainClient } from "@/components/ExplainClient";
import { PageHeader } from "@/components/site/PageHeader";
import { DICTIONARIES, isLanguage } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/explain">): Promise<Metadata> {
  const { lang } = await params;
  return isLanguage(lang) ? { title: DICTIONARIES[lang].explainPage.title } : {};
}

export default async function ExplainPage({ params }: PageProps<"/[lang]/explain">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = DICTIONARIES[lang];
  return (
    <>
      <PageHeader eyebrow={t.nav.explain} title={t.explainPage.title} intro={t.intro} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <ExplainClient lang={lang} t={t} />
      </div>
    </>
  );
}
