import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GlossarySearch } from "@/components/learn/GlossarySearch";
import { PageHeader } from "@/components/site/PageHeader";
import { DICTIONARIES, isLanguage } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/learn/glossary">): Promise<Metadata> {
  const { lang } = await params;
  return isLanguage(lang) ? { title: DICTIONARIES[lang].learn.glossaryTitle } : {};
}

export default async function GlossaryPage({ params }: PageProps<"/[lang]/learn/glossary">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = DICTIONARIES[lang].learn;
  return (
    <>
      <PageHeader eyebrow={t.title} title={t.glossaryTitle} intro={t.glossaryIntro}>
        <Link href={`/${lang}/learn`} className="inline-block text-sm font-medium text-brand underline underline-offset-4">
          ← {t.backToLearn}
        </Link>
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <GlossarySearch lang={lang} t={t} />
      </div>
    </>
  );
}
