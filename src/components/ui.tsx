import type { Dictionary } from "@/lib/i18n";
import type { Source } from "@/lib/schemas";
import { effectiveSourceType, type EvidenceLevel } from "@/lib/sources";
import { Stagger, StaggerItem } from "./motion";

// Editorial building blocks: serif headings, hairline rules and whitespace
// instead of boxing every section in a card.

export function Section(props: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="space-y-3 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">{props.title}</h2>
        {props.note && <p className="text-sm text-muted">{props.note}</p>}
      </div>
      {props.children}
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  // Wide letter-spacing suits Latin capitals but pulls Hangul apart.
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent [:lang(ko)_&]:tracking-normal">{children}</p>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <Stagger as="ul" className="list-disc space-y-1.5 pl-5 marker:text-muted">
      {items.map((item, i) => (
        <StaggerItem as="li" key={i}>
          {item}
        </StaggerItem>
      ))}
    </Stagger>
  );
}

export function ExternalLink(props: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className={props.className ?? "text-accent underline decoration-1 underline-offset-2 hover:decoration-2"}
    >
      {props.children}
    </a>
  );
}

export function sourceAnchor(scope: string, id: number) {
  return `${scope}-src-${id}`;
}

export const citationClass =
  "ml-0.5 inline-block rounded-sm px-0.5 align-super text-[0.7em] font-semibold leading-none text-cite no-underline hover:bg-cite-soft";

// A numbered footnote that jumps to a source on the same page.
export function CitationLink(props: { scope: string; id: number }) {
  return (
    <a href={`#${sourceAnchor(props.scope, props.id)}`} className={citationClass}>
      {props.id}
    </a>
  );
}

// Turns "[1]" markers in plain text into footnotes, without rendering any
// HTML from the model.
export function CitedText(props: { text: string; scope: string; validIds: Set<number> }) {
  return props.text.split(/\n{2,}/).map((paragraph, p) => (
    <p key={p}>
      {paragraph.split(/(\[\d+\])/).map((part, i) => {
        const match = /^\[(\d+)\]$/.exec(part);
        const id = match ? Number(match[1]) : null;
        return id !== null && props.validIds.has(id) ? (
          <CitationLink key={i} scope={props.scope} id={id} />
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </p>
  ));
}

// Type and date of a source. A type proven by the web address says so;
// otherwise it is marked as the AI's label.
export function SourceMeta({ source, t }: { source: Source; t: Dictionary }) {
  const { type, fromDomain } = effectiveSourceType(source);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span className="rounded-sm border border-line px-1.5 py-0.5 font-medium text-ink">{t.sourceTypes[type]}</span>
      <span>{fromDomain ? t.typeFromDomain : t.typeFromAi}</span>
      {source.published && (
        <span>
          · {t.publishedLabel} {source.published}
        </span>
      )}
    </span>
  );
}

export function SourceExcerpt({ source, t }: { source: Source; t: Dictionary }) {
  if (!source.excerpt) return null;
  return (
    <figure className="space-y-1">
      <blockquote className="border-l-2 border-cite pl-3 font-serif text-[0.95em] italic">“{source.excerpt}”</blockquote>
      <figcaption className="text-xs text-muted">{t.excerptLabel}</figcaption>
    </figure>
  );
}

const evidenceStyles: Record<EvidenceLevel, string> = {
  primary: "border-accent/40 text-accent",
  secondary: "border-line text-ink",
  advocacy: "border-warn-ink/40 text-warn-ink",
  unsourced: "border-line text-muted",
};

export function EvidenceLabel({ level, t }: { level: EvidenceLevel; t: Dictionary }) {
  return (
    <span className={`inline-block rounded-sm border px-1.5 text-xs font-medium ${evidenceStyles[level]}`}>
      {t.evidence[level]}
    </span>
  );
}

export function SourceList(props: { sources: Source[]; scope: string; t: Dictionary }) {
  if (props.sources.length === 0) {
    return <p className="border-l-2 border-warn-ink/40 pl-3 text-sm text-warn-ink">{props.t.noSources}</p>;
  }
  return (
    <ol className="divide-y divide-line text-sm">
      {props.sources.map((source) => (
        <li key={source.id} id={sourceAnchor(props.scope, source.id)} className="flex scroll-mt-24 gap-3 py-3">
          <span className="w-6 shrink-0 text-right font-semibold text-cite">{source.id}</span>
          <span className="min-w-0 space-y-1.5">
            <span className="block">
              <ExternalLink href={source.url}>{source.title}</ExternalLink>
              {source.publisher && <span className="text-muted"> · {source.publisher}</span>}
            </span>
            <SourceMeta source={source} t={props.t} />
            <SourceExcerpt source={source} t={props.t} />
          </span>
        </li>
      ))}
    </ol>
  );
}

export const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-ink transition-colors placeholder:text-muted/70 hover:border-muted focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60";

// The only boxed surface: forms and other things you interact with.
export const cardClass = "rounded-lg border border-line bg-surface p-5 sm:p-6";

export function PageIntro(props: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <header className="space-y-3 border-b border-line pb-6">
      {props.eyebrow && <Eyebrow>{props.eyebrow}</Eyebrow>}
      <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{props.title}</h1>
      {props.intro && <p className="max-w-2xl text-lg text-muted">{props.intro}</p>}
    </header>
  );
}
