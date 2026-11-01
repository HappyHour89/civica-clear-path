"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";
import type { Briefing } from "@/lib/schemas";
import { useCivica } from "./CivicaProvider";
import { FollowUpChat } from "./FollowUpChat";
import { Dots, ProgressBar, spring, Stagger, StaggerItem } from "./motion";
import { Officials } from "./Officials";
import { BulletList, cardClass, CitationLink, ExternalLink, Section, SourceList } from "./ui";

const card = `${cardClass} space-y-8`;

// Citations in the briefing point at the Sources page.
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

// Shared frame for every briefing page: title plus the section menu. Shows an
// empty or in-progress state when there is no briefing yet.
export function BriefingFrame({ children }: { children: React.ReactNode }) {
  const { t, result, asking } = useCivica();
  const pathname = usePathname();

  if (!result) {
    return (
      <div className={card}>
        <Section title={t.noBriefingTitle}>
          {asking ? (
            <div role="status" className="space-y-3">
              <ProgressBar />
              <p className="flex items-center gap-2 text-muted">
                <Dots /> {t.briefingInProgress}
              </p>
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
        </Section>
      </div>
    );
  }

  const b = result.briefing;
  if (!b.in_scope) {
    return (
      <div className={card}>
        <Section title={t.outOfScope}>
          <p className="leading-relaxed">{b.out_of_scope_message}</p>
        </Section>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        {result.question && <p className="text-sm text-muted">“{result.question}”</p>}
        <motion.h1
          key={b.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight sm:text-4xl"
        >
          {b.title}
        </motion.h1>
        {asking && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted">
            <Dots /> {t.briefingInProgress}
          </p>
        )}
      </header>
      <nav aria-label={t.briefingSections} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <LayoutGroup id="briefing-tabs">
          <ul className="flex min-w-max gap-1 border-b border-line">
            {tabs(t).map((tab) => {
              const active = pathname === tab.href;
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative block px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "text-accent" : "text-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <motion.span
                        layoutId="tab-underline"
                        className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent"
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
      <div className={cardClass}>{children}</div>
    </article>
  );
}

// Each section renders only inside BriefingFrame, which handles the
// no-briefing and out-of-scope cases.
function useBriefing(): { t: Dictionary; b: Briefing } | null {
  const { t, result } = useCivica();
  return result?.briefing.in_scope ? { t, b: result.briefing } : null;
}

export function OverviewSection() {
  const data = useBriefing();
  if (!data) return null;
  const { t, b } = data;
  return (
    <>
      <Section title={t.summary}>
        <p className="text-lg leading-relaxed">{b.summary}</p>
      </Section>
      <div className="grid gap-8 md:grid-cols-2">
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
      </div>
      {b.key_facts.length > 0 && (
        <Section title={t.keyFacts}>
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed marker:text-accent">
            {b.key_facts.map((fact, i) => (
              <li key={i}>
                {fact.fact}
                {fact.source_ids.length > 0 ? (
                  fact.source_ids.map((id) => <CitationLink key={id} scope="b" id={id} page={SOURCES_PATH} />)
                ) : (
                  <span className="ml-1.5 rounded bg-warn-soft px-1.5 py-0.5 text-xs text-warn-ink">
                    {t.noSourceForFact}
                  </span>
                )}
              </li>
            ))}
          </ul>
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

export function PerspectivesSection() {
  const data = useBriefing();
  if (!data) return null;
  const { t, b } = data;
  if (b.perspectives.length === 0) return <Empty text={t.nothingHere} />;
  return (
    <>
      <Section title={t.perspectives} note={t.perspectivesNote}>
        <Stagger className="grid gap-4 md:grid-cols-2">
          {b.perspectives.map((perspective, i) => (
            <StaggerItem
              key={i}
              className="space-y-3 rounded-2xl border border-line bg-canvas/40 p-4 transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg"
            >
              <h3 className="font-semibold">{perspective.viewpoint}</h3>
              <p className="text-sm">
                <span className="font-medium text-muted">{t.coreValues}: </span>
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
      <Stagger as="dl" className="grid gap-4 sm:grid-cols-2">
        {b.key_terms.map((term) => (
          <StaggerItem key={term.term} className="rounded-2xl border border-line/70 p-4">
            <dt className="font-semibold">{term.term}</dt>
            <dd className="text-sm leading-relaxed text-muted">{term.definition}</dd>
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
          <ul className="space-y-2">
            {b.leaders.map((leader, i) => (
              <li key={i}>
                <span className="font-semibold">{leader.name}</span>
                <span className="text-muted"> — {leader.role}</span>
                <p className="text-sm leading-relaxed">{leader.relevance}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {b.helpful_websites.length > 0 && (
        <Section title={t.websites}>
          <ul className="space-y-2">
            {b.helpful_websites.map((site) => (
              <li key={site.url}>
                <ExternalLink href={site.url}>{site.name}</ExternalLink>
                <p className="text-sm text-muted">{site.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {b.phone_numbers.length > 0 && (
        <Section title={t.phoneNumbers} note={t.phoneWarning}>
          <ul className="space-y-2">
            {b.phone_numbers.map((entry, i) => (
              <li key={i}>
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
