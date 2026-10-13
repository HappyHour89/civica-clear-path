import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BillSteps } from "@/components/learn/BillSteps";
import { BranchesDiagram } from "@/components/learn/BranchesDiagram";
import { RedistrictingMaps } from "@/components/learn/RedistrictingMaps";
import { SenateVotes } from "@/components/learn/SenateVotes";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { GUIDES, pick } from "@/content/learn";
import { DICTIONARIES, isLanguage, LANGUAGES } from "@/lib/i18n";

export function generateStaticParams() {
  return Object.keys(LANGUAGES).flatMap((lang) => GUIDES.map((guide) => ({ lang, topic: guide.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/learn/[topic]">): Promise<Metadata> {
  const { lang, topic } = await params;
  const guide = GUIDES.find((g) => g.slug === topic);
  return isLanguage(lang) && guide ? { title: pick(guide.title, lang), description: pick(guide.summary, lang) } : {};
}

export default async function GuidePage({ params }: PageProps<"/[lang]/learn/[topic]">) {
  const { lang, topic } = await params;
  const guide = GUIDES.find((g) => g.slug === topic);
  if (!isLanguage(lang) || !guide) notFound();
  const t = DICTIONARIES[lang].learn;

  const visual = {
    "how-a-bill-becomes-law": <BillSteps lang={lang} t={t} />,
    "three-branches": <BranchesDiagram lang={lang} t={t} />,
    filibuster: <SenateVotes t={t} />,
    redistricting: <RedistrictingMaps lang={lang} t={t} />,
  }[guide.slug];

  return (
    <>
      <PageHeader eyebrow={t.title} title={pick(guide.title, lang)} intro={pick(guide.summary, lang)}>
        <Link href={`/${lang}/learn`} className="inline-block text-sm font-medium text-brand underline underline-offset-4">
          ← {t.backToLearn}
        </Link>
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-14 px-4 sm:px-6">
        {/* The interactive visual leads for the bill guide; elsewhere it follows the opening section. */}
        {guide.slug === "how-a-bill-becomes-law" && visual}
        {guide.sections.map((section, i) => (
          <div key={i} className="space-y-14">
            <Reveal className="max-w-3xl space-y-4">
              <h2 className="font-serif text-3xl font-semibold tracking-tight">{pick(section.heading, lang)}</h2>
              {section.paragraphs.map((paragraph, j) => (
                <p key={j} className="text-lg leading-relaxed">
                  {pick(paragraph, lang)}
                </p>
              ))}
            </Reveal>
            {i === 0 && guide.slug !== "how-a-bill-becomes-law" && visual}
          </div>
        ))}
      </div>
    </>
  );
}
