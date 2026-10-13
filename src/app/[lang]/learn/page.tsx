import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CivicIcon } from "@/components/site/CivicIcons";
import { PageHeader } from "@/components/site/PageHeader";
import { RevealGroup, RevealItem } from "@/components/site/Reveal";
import { GLOSSARY } from "@/content/glossary";
import { GUIDES, pick } from "@/content/learn";
import { DICTIONARIES, fmt, isLanguage } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/learn">): Promise<Metadata> {
  const { lang } = await params;
  return isLanguage(lang) ? { title: DICTIONARIES[lang].learn.title } : {};
}

const cardClass =
  "group flex h-full flex-col gap-4 rounded-3xl border border-line bg-surface p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-[0_24px_50px_-36px_rgba(15,92,82,0.8)]";

export default async function LearnPage({ params }: PageProps<"/[lang]/learn">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = DICTIONARIES[lang].learn;

  return (
    <>
      <PageHeader eyebrow={DICTIONARIES[lang].nav.learn} title={t.title} intro={t.intro} />
      <RevealGroup className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6" stagger={0.08}>
        {GUIDES.map((guide) => (
          <RevealItem key={guide.slug}>
            <Link href={`/${lang}/learn/${guide.slug}`} className={cardClass}>
              <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-ink">
                <CivicIcon name={guide.icon} className="size-8" />
              </span>
              <span className="font-serif text-2xl font-semibold">{pick(guide.title, lang)}</span>
              <span className="flex-1 text-muted">{pick(guide.summary, lang)}</span>
              <span className="font-semibold text-brand">
                {t.readGuide}{" "}
                <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </RevealItem>
        ))}
        <RevealItem className="sm:col-span-2">
          <Link href={`/${lang}/learn/glossary`} className={`${cardClass} sm:flex-row sm:items-center`}>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
              <CivicIcon name="glossary" className="size-8" />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-2xl font-semibold">{t.glossaryTitle}</span>
              <span className="text-muted">
                {t.glossaryIntro} · {fmt(t.glossaryCount, { count: GLOSSARY.length })}
              </span>
            </span>
            <span aria-hidden className="text-brand transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </RevealItem>
      </RevealGroup>
    </>
  );
}
