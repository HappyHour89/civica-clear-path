import type { Dictionary, Language } from "@/lib/i18n";
import type { OfficialsResult } from "@/lib/officials";
import type { Briefing } from "@/lib/schemas";
import { FollowUpChat } from "./FollowUpChat";
import { Officials } from "./Officials";
import { Reveal } from "./site/Reveal";
import { motion } from "motion/react";
import { BulletList, CitationLink, ExternalLink, Section, SourceList } from "./ui";

const cardClass =
  "space-y-8 rounded-3xl border border-line bg-surface p-5 shadow-[0_20px_50px_-40px_rgba(28,33,31,0.5)] sm:p-8";

function Card({ children }: { children: React.ReactNode }) {
  return <Reveal className={cardClass}>{children}</Reveal>;
}

export function BriefingView(props: {
  t: Dictionary;
  language: Language;
  question: string;
  state: string;
  briefing: Briefing;
  officials: OfficialsResult | null;
  officialsError: boolean;
  onStartOver: () => void;
}) {
  const { t, briefing: b } = props;

  const startOver = (
    <button type="button" onClick={props.onStartOver} className="text-sm font-medium text-brand underline underline-offset-4">
      ← {t.startOver}
    </button>
  );

  if (!b.in_scope) {
    return (
      <div className="space-y-4">
        {startOver}
        <Card>
          <Section title={t.outOfScope}>
            <p className="leading-relaxed">{b.out_of_scope_message}</p>
          </Section>
        </Card>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      {startOver}

      <Card>
        <header className="space-y-3">
          {props.question && <p className="text-sm text-muted">“{props.question}”</p>}
          <h2 className="font-serif text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{b.title}</h2>
        </header>
        <Section title={t.summary}>
          <p className="border-l-4 border-accent pl-4 text-lg leading-relaxed">{b.summary}</p>
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
                    fact.source_ids.map((id) => <CitationLink key={id} scope="b" id={id} />)
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
      </Card>

      {b.perspectives.length > 0 && (
        <Card>
          <Section title={t.perspectives} note={t.perspectivesNote}>
            <div className="grid gap-4 md:grid-cols-2">
              {b.perspectives.map((perspective, i) => (
                <motion.div
                  key={i}
                  className="space-y-3 rounded-2xl border border-line bg-paper p-5"
                  initial={{ opacity: 0, x: i % 2 === 0 ? -28 : 28 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "0px 0px -60px 0px" }}
                  transition={{ duration: 0.6, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h4 className="font-serif text-lg font-semibold">{perspective.viewpoint}</h4>
                  <p className="text-sm">
                    <span className="font-medium text-muted">{t.coreValues}: </span>
                    {perspective.core_values}
                  </p>
                  <BulletList items={perspective.main_arguments} />
                </motion.div>
              ))}
            </div>
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
        </Card>
      )}

      {b.key_terms.length > 0 && (
        <Card>
          <Section title={t.keyTerms}>
            <dl className="grid gap-4 sm:grid-cols-2">
              {b.key_terms.map((term) => (
                <div key={term.term}>
                  <dt className="font-semibold">{term.term}</dt>
                  <dd className="text-sm leading-relaxed text-muted">{term.definition}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </Card>
      )}

      {(props.state || b.leaders.length > 0) && (
        <Card>
          {props.state && (
            <Section title={t.yourOfficials}>
              <Officials officials={props.officials} error={props.officialsError} t={t} />
            </Section>
          )}
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
        </Card>
      )}

      {(b.helpful_websites.length > 0 || b.phone_numbers.length > 0) && (
        <Card>
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
                      className="text-brand underline underline-offset-2"
                    >
                      {entry.number}
                    </a>
                    <p className="text-sm text-muted">{entry.when_to_call}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </Card>
      )}

      <Card>
        {b.uncertainties.length > 0 && (
          <Section title={t.uncertainties}>
            <BulletList items={b.uncertainties} />
          </Section>
        )}
        <Section title={t.sources} note={b.sources.length > 0 ? t.sourcesNote : undefined}>
          <SourceList sources={b.sources} scope="b" t={t} />
        </Section>
      </Card>

      <Card>
        <Section title={t.followUpTitle}>
          <FollowUpChat
            t={t}
            language={props.language}
            state={props.state}
            originalQuestion={props.question}
            briefing={b}
          />
        </Section>
      </Card>
    </article>
  );
}
