import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CivicaMark } from "@/components/site/CivicaLogo";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/Reveal";
import { DICTIONARIES, fmt, isLanguage } from "@/lib/i18n";
import { DATA_DOWNLOADED } from "@/lib/legislators";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  return isLanguage(lang) ? { title: DICTIONARIES[lang].about.title } : {};
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = DICTIONARIES[lang].about;
  const dateFormat = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const snapshot = fmt(t.data.updated, { date: dateFormat(DATA_DOWNLOADED) });
  const sources = [
    { label: t.data.legislators, href: "https://github.com/unitedstates/congress-legislators", note: snapshot },
    { label: t.data.photos, href: "https://github.com/unitedstates/images", note: snapshot },
    { label: t.data.census, href: "https://geocoding.geo.census.gov/geocoder/", note: t.data.live },
    { label: t.data.vote, href: "https://vote.gov/", note: fmt(t.data.updated, { date: dateFormat("2026-10-13") }) },
    { label: t.data.ai, href: "https://www.anthropic.com/claude", note: t.data.live },
  ];

  return (
    <>
      <PageHeader eyebrow={DICTIONARIES[lang].nav.about} title={t.title} />
      <div className="mx-auto max-w-6xl space-y-16 px-4 sm:px-6">
        <Reveal className="grid items-start gap-8 md:grid-cols-[auto_1fr]">
          <CivicaMark size={96} />
          <div className="max-w-3xl space-y-3">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">{t.missionTitle}</h2>
            <p className="text-xl leading-relaxed">{t.mission}</p>
          </div>
        </Reveal>

        <section className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <Reveal>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">{t.howTitle}</h2>
            </Reveal>
            <RevealGroup className="space-y-3" stagger={0.08}>
              {t.how.map((item, i) => (
                <RevealItem key={i} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
                  <span className="font-serif font-semibold text-accent-ink">{String(i + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
          <div className="space-y-5">
            <Reveal>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">{t.neutralityTitle}</h2>
            </Reveal>
            <RevealGroup className="space-y-3" stagger={0.08}>
              {t.neutrality.map((item, i) => (
                <RevealItem key={i} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
                  <span aria-hidden className="font-semibold text-brand">
                    ✓
                  </span>
                  <span>{item}</span>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section className="space-y-5">
          <Reveal>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">{t.dataTitle}</h2>
          </Reveal>
          <RevealGroup className="divide-y divide-line rounded-3xl border border-line bg-surface" stagger={0.06}>
            {sources.map((source) => (
              <RevealItem key={source.href} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand underline underline-offset-4"
                >
                  {source.label}
                </a>
                <span className="text-sm text-muted">{source.note}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        <Reveal className="rounded-3xl border-l-4 border-accent bg-accent-soft p-6 sm:p-8">
          <h2 className="font-serif text-2xl font-semibold">{t.errorsTitle}</h2>
          <p className="mt-2 text-lg">{t.errors}</p>
        </Reveal>
      </div>
    </>
  );
}
