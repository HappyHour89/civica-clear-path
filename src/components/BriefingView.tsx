"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { Briefing } from "@/lib/schemas";
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
function useBriefing(): { t: Dictionary; b: Briefing; fromDocument: boolean } | null {
  const { t, result } = useCivica();
  return result?.briefing.in_scope ? { t, b: result.briefing, fromDocument: result.fromDocument } : null;
}

// A key fact with numbered footnotes and labels for the kind of evidence
// behind it. Clicking a number opens that source inline: type, date, quoted
// passage, and a link to the full list.
function Fact({ fact, b, t }: { fact: Briefing["key_facts"][number]; b: Briefing; t: Dictionary }) {
  const [open, setOpen] = useState<number | null>(null);
  const cited = b.sources.filter((s) => fact.source_ids.includes(s.id));
  const source = cited.find((s) => s.id === open);
  return (
    <li className="space-y-1">
      <span>
        {fact.fact}
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
      <span className="flex flex-wrap gap-1.5">
        <EvidenceLabel level={evidenceLevel(cited)} t={t} />
        {fact.disputed && (
          <span className="inline-block rounded-sm border border-warn-ink/40 px-1.5 text-xs font-medium text-warn-ink">
            {t.disputed}
          </span>
        )}
      </span>
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
    </li>
  );
}

export function OverviewSection() {
  const data = useBriefing();
  if (!data) return null;
  const { t, b, fromDocument } = data;
  // A document gets "what it is / does / could mean for you" framing.
  const labels = fromDocument
    ? { summary: t.docWhatItIs, does: t.docWhatItDoes, matters: t.docMeansForYou }
    : { summary: t.summary, does: t.whatItDoes, matters: t.whyItMatters };
  return (
    <>
      <Section title={labels.summary}>
        <p className="font-serif text-xl leading-relaxed">{b.summary}</p>
      </Section>
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
