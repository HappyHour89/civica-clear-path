"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { Briefing } from "@/lib/schemas";
import type { Situation } from "@/lib/situations";
import { BriefingActions } from "./BriefingActions";
import { useCivica } from "./CivicaProvider";
import { FollowUpChat } from "./FollowUpChat";
import { ProgressBar, softSpring, spring, Stagger, StaggerItem } from "./motion";
import { Officials } from "./Officials";
import { evidenceLevel } from "@/lib/sources";
import {
  BulletList,
  cardClass,
  citationClass,
  EvidenceLabel,
  ExternalLink,
  Eyebrow,
  Section,
  sourceAnchor,
  SourceExcerpt,
  SourceList,
  SourceMeta,
} from "./ui";

const SOURCES_PATH = "/briefing/sources";

function tabs(t: Dictionary) {
  return [
    { href: "/briefing", label: t.tabOverview },
    { href: "/briefing/perspectives", label: t.tabPerspectives },
    { href: "/briefing/terms", label: t.tabTerms },
    { href: "/briefing/contacts", label: t.tabContacts },
    { href: SOURCES_PATH, label: t.tabSources },
    { href: "/briefing/follow-up", label: t.tabFollowUp },
  ];
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted">{text}</p>;
}

// Shared frame for every briefing page: headline plus the section index.
// Shows an in-progress or empty state when there is no briefing yet.
export function BriefingFrame({ children }: { children: React.ReactNode }) {
  const { t, result, asking } = useCivica();
  const pathname = usePathname();

  if (!result) {
    return (
      <div className={`${cardClass} max-w-2xl space-y-4`}>
        <h1 className="font-serif text-2xl font-semibold">{t.noBriefingTitle}</h1>
        {asking ? (
          <div role="status" className="space-y-3">
            <ProgressBar />
            <p className="text-muted">{t.briefingInProgress}</p>
          </div>
        ) : (
          <p className="text-muted">
            {t.noBriefingBody}{" "}
            <Link href="/" className="text-accent underline underline-offset-2">
              {t.navAsk}
            </Link>{" "}
            ·{" "}
            <Link href="/document" className="text-accent underline underline-offset-2">
              {t.navDocument}
            </Link>
          </p>
        )}
      </div>
    );
  }

  const b = result.briefing;
  if (!b.in_scope) {
    return (
      <div className={`${cardClass} max-w-2xl space-y-3`}>
        <h1 className="font-serif text-2xl font-semibold">{t.outOfScope}</h1>
        <p>{b.out_of_scope_message}</p>
      </div>
    );
  }

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <Eyebrow>{result.fromDocument ? t.documentEyebrow : t.briefingEyebrow}</Eyebrow>
        <motion.h1
          key={b.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={softSpring}
          className="max-w-3xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl"
        >
          {b.title}
        </motion.h1>
        {result.question && <p className="max-w-2xl text-muted">“{result.question}”</p>}
        <BriefingActions />
        {asking && (
          <p role="status" className="text-sm text-muted">
            {t.briefingInProgress}
          </p>
        )}
      </header>
      <nav aria-label={t.briefingSections} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <LayoutGroup id="briefing-tabs">
          <ul className="-ml-3 flex min-w-max border-b border-line">
            {tabs(t).map((tab) => {
              const active = pathname === tab.href;
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative block px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <motion.span
                        layoutId="tab-underline"
                        className="absolute inset-x-3 -bottom-px h-0.5 bg-accent"
                        transition={spring}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>
      {/* Spacing between sections comes from app/briefing/template.tsx. */}
      <div className="max-w-3xl">{children}</div>
    </article>
  );
}

// Each section renders only inside BriefingFrame, which handles the
// no-briefing and out-of-scope cases.
function useBriefing(): { t: Dictionary; b: Briefing; fromDocument: boolean; situations: Situation[] } | null {
  const { t, result } = useCivica();
  return result?.briefing.in_scope
    ? { t, b: result.briefing, fromDocument: result.fromDocument, situations: result.situations }
    : null;
}

// A claim with numbered footnotes. Clicking a number opens that source
// inline: type, date, quoted passage, and a link to the full list. `labels`
// sit under the text (evidence level, disputed, certainty).
function Claim(props: { text: string; sourceIds: number[]; b: Briefing; t: Dictionary; labels?: React.ReactNode }) {
  const { b, t } = props;
  const [open, setOpen] = useState<number | null>(null);
  const cited = b.sources.filter((s) => props.sourceIds.includes(s.id));
  const source = cited.find((s) => s.id === open);
  return (
    <>
      <span>
        {props.text}
        {cited.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-expanded={open === s.id}
            onClick={() => setOpen(open === s.id ? null : s.id)}
            className={`${citationClass} ${open === s.id ? "bg-cite-soft" : ""}`}
          >
            {s.id}
          </button>
        ))}
      </span>
      {props.labels && <span className="flex flex-wrap gap-1.5">{props.labels}</span>}
      <AnimatePresence initial={false}>
        {source && (
          <motion.span
            key={source.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={softSpring}
            className="block overflow-hidden"
          >
            <span className="mt-2 block space-y-2 border-l-2 border-cite bg-cite-soft/60 px-3 py-2.5 text-sm">
              <span className="block">
                <span className="font-semibold text-cite">{source.id}</span>{" "}
                <ExternalLink href={source.url}>{source.title}</ExternalLink>
                {source.publisher && <span className="text-muted"> · {source.publisher}</span>}
              </span>
              <SourceMeta source={source} t={t} />
              <SourceExcerpt source={source} t={t} />
              <Link
                href={`${SOURCES_PATH}#${sourceAnchor("b", source.id)}`}
                className="inline-block text-xs text-muted underline underline-offset-2"
              >
                {t.allSources}
              </Link>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}

function Fact({ fact, b, t }: { fact: Briefing["key_facts"][number]; b: Briefing; t: Dictionary }) {
  const cited = b.sources.filter((s) => fact.source_ids.includes(s.id));
  return (
    <li className="space-y-1">
      <Claim
        text={fact.fact}
        sourceIds={fact.source_ids}
        b={b}
        t={t}
        labels={
          <>
            <EvidenceLabel level={evidenceLevel(cited)} t={t} />
            {fact.disputed && (
              <span className="inline-block rounded-sm border border-warn-ink/40 px-1.5 text-xs font-medium text-warn-ink">
                {t.disputed}
              </span>
            )}
          </>
        }
      />
    </li>
  );
}

const certaintyStyles: Record<Briefing["for_you"][number]["certainty"], string> = {
  clear: "border-accent/40 text-accent",
  depends: "border-warn-ink/40 text-warn-ink",
  not_affected: "border-line text-muted",
};

const watchIcons: Record<Briefing["watch_outs"][number]["kind"], React.ReactNode> = {
  deadline: <path d="M10 5.5V10l3 2M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />,
  money: <path d="M10 3v14M13.5 6.5c-.6-1-1.9-1.5-3.5-1.5-2 0-3.5 1-3.5 2.5S8 9.7 10 10s3.5 1 3.5 2.5S12 15 10 15c-1.6 0-3-.6-3.6-1.7" />,
  rights: <path d="M10 3l6 2.5v4.2c0 3.6-2.5 6.3-6 7.3-3.5-1-6-3.7-6-7.3V5.5z" />,
  automatic: <path d="M15.5 8A6 6 0 004.6 6.5M4.5 12a6 6 0 0010.9 1.5M4.5 3.5v3h3M15.5 16.5v-3h-3" />,
  penalty: <path d="M10 3.5l7 12.5H3zM10 8.5v3.5M10 14.2v.3" />,
  other: <path d="M10 9v5M10 6v.3M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />,
};

// "Worth a second look": clauses in an uploaded document a careful reader
// would double-check, each quoted word for word.
function WatchOuts({ b, t }: { b: Briefing; t: Dictionary }) {
  if (b.watch_outs.length === 0) return null;
  return (
    <Section title={t.watchTitle} note={t.watchNote}>
      <Stagger as="ol" className="space-y-3">
        {b.watch_outs.map((item, i) => (
          <StaggerItem as="li" key={i} className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-lg border border-line bg-surface p-4">
            <span className="grid size-10 place-items-center rounded-full bg-warn-soft text-warn-ink">
              <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {watchIcons[item.kind]}
              </svg>
            </span>
            <span className="min-w-0 space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-warn-ink [:lang(ko)_&]:tracking-normal">
                {t.watchKinds[item.kind]}
              </span>
              <span className="block font-serif text-lg font-semibold leading-snug">{item.title}</span>
              <span className="block">{item.explanation}</span>
              {item.quote && (
                <figure className="space-y-1 pt-1">
                  <blockquote className="border-l-2 border-warn-ink/40 pl-3 font-serif text-[0.95em] italic text-muted">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="text-xs text-muted">{t.watchQuote}</figcaption>
                </figure>
              )}
            </span>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

// "What changes for you": one card per situation the reader picked, or the
// groups most affected when they picked none.
function ForYou({ b, t, situations }: { b: Briefing; t: Dictionary; situations: Situation[] }) {
  if (b.for_you.length === 0) return null;
  const personal = situations.length > 0;
  return (
    <Section title={personal ? t.forYouTitle : t.forYouGeneralTitle}>
      {personal && (
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {t.forYouBasedOn}
          {situations.map((id) => (
            <span key={id} className="rounded-sm bg-accent-soft px-1.5 py-0.5 font-medium text-accent">
              {t.situationLabels[id]}
            </span>
          ))}
        </p>
      )}
      <Stagger as="ul" className="grid items-start gap-3 sm:grid-cols-2">
        {b.for_you.map((item, i) => (
          <StaggerItem
            as="li"
            key={i}
            className={`space-y-2 rounded-r-md border-l-4 bg-surface px-4 py-3 ${
              item.certainty === "not_affected" ? "border-line" : "border-accent"
            }`}
          >
            <span className="block font-serif text-lg font-semibold leading-snug">{item.who}</span>
            <span className="block space-y-1.5">
              <Claim
                text={item.what_changes}
                sourceIds={item.source_ids}
                b={b}
                t={t}
                labels={
                  <span className={`inline-block rounded-sm border px-1.5 text-xs font-medium ${certaintyStyles[item.certainty]}`}>
                    {t.certainty[item.certainty]}
                  </span>
                }
              />
            </span>
          </StaggerItem>
        ))}
      </Stagger>
      {!personal && <p className="text-sm text-muted">{t.forYouPickHint}</p>}
    </Section>
  );
}

export function OverviewSection() {
  const data = useBriefing();
  if (!data) return null;
  const { t, b, fromDocument, situations } = data;
  // A document gets "what it is / does / could mean for you" framing.
  const labels = fromDocument
    ? { summary: t.docWhatItIs, does: t.docWhatItDoes, matters: t.docMeansForYou }
    : { summary: t.summary, does: t.whatItDoes, matters: t.whyItMatters };
  return (
    <>
      <Section title={labels.summary}>
        <p className="font-serif text-xl leading-relaxed">{b.summary}</p>
      </Section>
      <ForYou b={b} t={t} situations={situations} />
      {fromDocument && <WatchOuts b={b} t={t} />}
      {b.what_it_does.length > 0 && (
        <Section title={labels.does}>
          <BulletList items={b.what_it_does} />
        </Section>
      )}
      {b.why_it_matters.length > 0 && (
        <Section title={labels.matters}>
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
      {b.uncertainties.length > 0 && (
        <Section title={t.uncertainties}>
          <BulletList items={b.uncertainties} />
        </Section>
      )}
    </>
  );
}

// Viewpoints as equal columns divided by rules, labeled by neutral letters;
// no colors, so neither side reads as the "good" one.
export function PerspectivesSection() {
  const data = useBriefing();
  if (!data) return null;
  const { t, b } = data;
  if (b.perspectives.length === 0) return <Empty text={t.nothingHere} />;
  return (
    <>
      <Section title={t.perspectives} note={t.perspectivesNote}>
        <Stagger className="border-t border-line md:flex md:divide-x md:divide-line">
          {b.perspectives.map((perspective, i) => (
            <StaggerItem
              key={i}
              className="space-y-3 border-b border-line py-5 last:border-b-0 md:flex-1 md:basis-0 md:border-b-0 md:px-5 md:first:pl-0 md:last:pr-0"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted [:lang(ko)_&]:tracking-normal">
                {t.viewpoint} {String.fromCharCode(65 + i)}
              </p>
              <h3 className="font-serif text-xl font-semibold leading-snug">{perspective.viewpoint}</h3>
              <p className="text-sm">
                <span className="font-semibold">{t.coreValues}: </span>
                {perspective.core_values}
              </p>
              <BulletList items={perspective.main_arguments} />
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
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
    </>
  );
}

export function TermsSection() {
  const data = useBriefing();
  if (!data) return null;
  const { t, b } = data;
  if (b.key_terms.length === 0) return <Empty text={t.nothingHere} />;
  return (
    <Section title={t.keyTerms}>
      <Stagger as="dl" className="divide-y divide-line">
        {b.key_terms.map((term) => (
          <StaggerItem key={term.term} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-6">
            <dt className="font-serif font-semibold">{term.term}</dt>
            <dd className="text-muted">{term.definition}</dd>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

export function ContactsSection() {
  const { result, officials } = useCivica();
  const data = useBriefing();
  if (!data || !result) return null;
  const { t, b } = data;
  const officialsForState = result.state && officials?.state === result.state ? officials : null;
  return (
    <>
      <Section title={t.yourOfficials}>
        {officialsForState ? (
          <Officials officials={officialsForState.officials} error={officialsForState.error} t={t} />
        ) : (
          <p className="text-muted">
            {t.noOfficialsYet}{" "}
            <Link href="/representatives" className="text-accent underline underline-offset-2">
              {t.setYourState}
            </Link>
          </p>
        )}
      </Section>
      {b.leaders.length > 0 && (
        <Section title={t.leaders}>
          <ul className="divide-y divide-line">
            {b.leaders.map((leader, i) => (
              <li key={i} className="py-3">
                <span className="font-semibold">{leader.name}</span>
                <span className="text-muted"> · {leader.role}</span>
                <p className="text-sm">{leader.relevance}</p>
              </li>
            ))}
          </ul>
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
      {b.phone_numbers.length > 0 && (
        <Section title={t.phoneNumbers} note={t.phoneWarning}>
          <ul className="divide-y divide-line">
            {b.phone_numbers.map((entry, i) => (
              <li key={i} className="py-3">
                <span className="font-semibold">{entry.organization}: </span>
                <a
                  href={`tel:${entry.number.replace(/[^\d+]/g, "")}`}
                  className="text-accent underline underline-offset-2"
                >
                  {entry.number}
                </a>
                <p className="text-sm text-muted">{entry.when_to_call}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

export function SourcesSection() {
  const data = useBriefing();
  if (!data) return null;
  const { t, b } = data;
  return (
    <Section title={t.sources} note={b.sources.length > 0 ? t.sourcesNote : undefined}>
      <SourceList sources={b.sources} scope="b" t={t} />
    </Section>
  );
}

export function FollowUpSection() {
  const { language, result } = useCivica();
  const data = useBriefing();
  if (!data || !result) return null;
  const { t, b } = data;
  return (
    <Section title={t.followUpTitle}>
      <FollowUpChat t={t} language={language} state={result.state} originalQuestion={result.question} briefing={b} />
    </Section>
  );
}
