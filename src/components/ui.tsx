import type { Dictionary } from "@/lib/i18n";
import type { Source } from "@/lib/schemas";

export function Section(props: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{props.title}</h2>
        {props.note && <p className="text-sm text-muted">{props.note}</p>}
      </div>
      {props.children}
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 leading-relaxed marker:text-accent">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function ExternalLink(props: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className={props.className ?? "text-accent underline underline-offset-2 hover:opacity-80"}
    >
      {props.children}
    </a>
  );
}

export function sourceAnchor(scope: string, id: number) {
  return `${scope}-src-${id}`;
}

export function CitationLink(props: { scope: string; id: number }) {
  return (
    <a
      href={`#${sourceAnchor(props.scope, props.id)}`}
      className="ml-0.5 align-super text-xs font-semibold text-accent no-underline hover:underline"
    >
      [{props.id}]
    </a>
  );
}

// Turns "[1]" markers in plain text into links, without rendering any HTML
// from the model.
export function CitedText(props: { text: string; scope: string; validIds: Set<number> }) {
  return props.text.split(/\n{2,}/).map((paragraph, p) => (
    <p key={p} className="leading-relaxed">
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

export function SourceList(props: { sources: Source[]; scope: string; t: Dictionary }) {
  if (props.sources.length === 0) {
    return <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-ink">{props.t.noSources}</p>;
  }
  return (
    <ol className="space-y-2 text-sm">
      {props.sources.map((source) => (
        <li key={source.id} id={sourceAnchor(props.scope, source.id)} className="flex gap-2 scroll-mt-4">
          <span className="font-semibold text-muted">[{source.id}]</span>
          <span>
            <ExternalLink href={source.url}>{source.title}</ExternalLink>
            {source.publisher && <span className="text-muted"> — {source.publisher}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
