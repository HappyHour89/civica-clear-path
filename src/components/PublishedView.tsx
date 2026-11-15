"use client";

import Link from "next/link";
import { DICTIONARIES } from "@/lib/i18n";
import type { LibraryEntry, PublishedPage } from "@/lib/publicPages";
import { Fact, ForYou } from "./BriefingView";
import { useCivica } from "./CivicaProvider";
import { Stagger, StaggerItem } from "./motion";
import { BulletList, Eyebrow, ExternalLink, PageIntro, Section, SourceList } from "./ui";

function formatDate(iso: string, language: string) {
  return new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
}

// A published briefing, laid out like a newspaper article: the review status
// up top, the briefing, then a public corrections box and the page history.
export function PublishedView({ page }: { page: PublishedPage }) {
  const t = DICTIONARIES[page.language];
  const b = page.briefing;
  return (
    <article lang={page.language} className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-4 border-b-4 border-double border-ink pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Eyebrow>
            <Link href="/library" className="hover:underline">
              Civica · {t.navLibrary}
            </Link>
          </Eyebrow>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              page.status === "reviewed" ? "border-accent bg-accent-soft text-accent" : "border-warn-ink/40 bg-warn-soft text-warn-ink"
            }`}
          >
            {t.pageStatus[page.status]}
          </span>
        </div>
        <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{b.title}</h1>
        {page.question && (
          <p className="text-muted">
            <span className="font-semibold text-ink">{t.pageQuestion}:</span> “{page.question}”
          </p>
        )}
        <p className="text-sm text-muted">
          {t.pagePublished} {formatDate(page.publishedAt, page.language)}
        </p>
      </header>

      <Section title={t.summary}>
        <p className="font-serif text-xl leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-6xl first-letter:leading-[0.85] first-letter:font-semibold">
          {b.summary}
        </p>
      </Section>
      <ForYou b={b} t={t} situations={[]} fromDocuments={false} />
      {b.what_it_does.length > 0 && (
        <Section title={t.whatItDoes}>
          <BulletList items={b.what_it_does} />
        </Section>
      )}
      {b.why_it_matters.length > 0 && (
        <Section title={t.whyItMatters}>
          <BulletList items={b.why_it_matters} />
        </Section>
      )}
      {b.key_facts.length > 0 && (
        <Section title={t.keyFacts} note={t.evidenceNote}>
          <ol className="list-decimal space-y-3 pl-5 marker:text-muted">
            {b.key_facts.map((fact, i) => (
              <Fact key={i} fact={fact} b={b} t={t} />
            ))}
          </ol>
        </Section>
      )}
      {b.perspectives.length > 0 && (
        <Section title={t.perspectives} note={t.perspectivesNote}>
          <div className="border-t border-line md:flex md:divide-x md:divide-line">
            {b.perspectives.map((p, i) => (
              <div key={i} className="space-y-2 border-b border-line py-5 last:border-b-0 md:flex-1 md:basis-0 md:border-b-0 md:px-5 md:first:pl-0 md:last:pr-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {t.viewpoint} {String.fromCharCode(65 + i)}
                </p>
                <h3 className="font-serif text-xl font-semibold leading-snug">{p.viewpoint}</h3>
                <p className="text-sm">
                  <span className="font-semibold">{t.coreValues}: </span>
                  {p.core_values}
                </p>
                <BulletList items={p.main_arguments} />
              </div>
            ))}
          </div>
        </Section>
      )}
      {b.common_ground.length > 0 && (
        <Section title={t.commonGround}>
          <BulletList items={b.common_ground} />
        </Section>
      )}
      {b.questions_to_consider.length > 0 && (
        <Section title={t.questionsToConsider}>
          <BulletList items={b.questions_to_consider} />
        </Section>
      )}
      {b.key_terms.length > 0 && (
        <Section title={t.keyTerms}>
          <dl className="divide-y divide-line">
            {b.key_terms.map((term) => (
              <div key={term.term} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-6">
                <dt className="font-serif font-semibold">{term.term}</dt>
                <dd className="text-muted">{term.definition}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      {b.uncertainties.length > 0 && (
        <Section title={t.uncertainties}>
          <BulletList items={b.uncertainties} />
        </Section>
      )}
      {b.helpful_websites.length > 0 && (
        <Section title={t.websites}>
          <ul className="divide-y divide-line">
            {b.helpful_websites.map((site) => (
              <li key={site.url} className="py-3">
                <ExternalLink href={site.url}>{site.name}</ExternalLink>
                <p className="text-sm text-muted">{site.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={t.sources} note={b.sources.length > 0 ? t.sourcesNote : undefined}>
        <SourceList sources={b.sources} scope="b" t={t} />
      </Section>

      <aside className="space-y-2 rounded-lg border-2 border-ink p-5">
        <h2 className="font-serif text-xl font-semibold">{t.pageCorrections}</h2>
        {page.corrections.length === 0 ? (
          <p className="text-sm text-muted">{t.pageNoCorrections}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {page.corrections.map((c, i) => (
              <li key={i}>
                <span className="font-semibold tabular-nums">{formatDate(c.at, page.language)}:</span> {c.text}
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className="space-y-2 text-sm text-muted">
        <h2 className="font-semibold text-ink">{t.pageHistory}</h2>
        <ul className="space-y-1">
          {page.history.map((h, i) => (
            <li key={i} className="tabular-nums">
              {formatDate(h.at, page.language)} · {h.note === "published" ? t.pageHistoryPublished : h.note}
            </li>
          ))}
        </ul>
      </section>
      <p>
        <Link href="/" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover">
          {t.pageAskYourOwn} →
        </Link>
      </p>
    </article>
  );
}

// The public library: published briefings, newest first, as a front page.
export function LibraryView({ entries }: { entries: LibraryEntry[] }) {
  const { t, language } = useCivica();
  const [lead, ...rest] = entries;
  return (
    <div className="space-y-10">
      <PageIntro title={t.navLibrary} intro={t.libraryIntro} />
      {!lead ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-muted">{t.libraryEmpty}</p>
      ) : (
        <div className="space-y-8">
          <Link href={`/p/${lead.slug}`} lang={lead.language} className="group block space-y-3 border-b border-line pb-8">
            <p className="text-xs text-muted">{formatDate(lead.publishedAt, language)}</p>
            <h2 className="font-serif text-3xl font-semibold leading-tight group-hover:underline sm:text-4xl">{lead.title}</h2>
            <p className="max-w-3xl font-serif text-lg leading-relaxed text-muted">{lead.summary}</p>
          </Link>
          <Stagger as="ul" className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((entry) => (
              <StaggerItem as="li" key={entry.slug} className="border-t border-line pt-4">
                <Link href={`/p/${entry.slug}`} lang={entry.language} className="group block space-y-2">
                  <p className="text-xs text-muted">{formatDate(entry.publishedAt, language)}</p>
                  <h3 className="font-serif text-xl font-semibold leading-snug group-hover:underline">{entry.title}</h3>
                  <p className="line-clamp-3 text-sm text-muted">{entry.summary}</p>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      )}
    </div>
  );
}
