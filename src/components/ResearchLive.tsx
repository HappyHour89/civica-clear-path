"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCivica } from "./CivicaProvider";
import { softSpring } from "./motion";

const SHOWN_SOURCES = 8;

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// What the research is doing right now: each search as it runs, each source
// as it is found, then the writing step. Updates arrive live from the server.
export function ResearchLive() {
  const { t, progress } = useCivica();
  const { queries, sources, writing } = progress;
  const latestQuery = queries.at(-1);
  const phase = writing ? t.progressWriting : latestQuery ? `${t.progressSearching}: “${latestQuery}”` : t.progressStarting;
  const hidden = sources.length - SHOWN_SOURCES;
  // Searches already run; the current one is in the line above until writing starts.
  const finished = writing ? queries.slice(-3) : queries.slice(-4, -1);

  return (
    <div className="space-y-3">
      {/* Polite, so screen readers hear the step without every source. */}
      <p aria-live="polite" className="flex items-start gap-2 text-sm font-medium text-ink">
        <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-accent" />
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="min-w-0 break-words"
          >
            {phase}
          </motion.span>
        </AnimatePresence>
      </p>

      {finished.length > 0 && (
        <ul className="space-y-0.5 pl-4 text-xs text-muted">
          {finished.map((query) => (
            <li key={query} className="truncate">
              ✓ {query}
            </li>
          ))}
        </ul>
      )}

      {sources.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t.progressSources} · <span className="tabular-nums">{sources.length}</span>
          </p>
          <ul className="flex flex-wrap gap-1.5">
            <AnimatePresence initial={false}>
              {sources.slice(0, SHOWN_SOURCES).map((source) => (
                <motion.li
                  key={source.url}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={softSpring}
                  title={source.title || source.url}
                  className="max-w-full truncate rounded-md border border-line bg-surface px-2 py-0.5 text-xs sm:max-w-64"
                >
                  <span className="font-medium text-ink">{domainOf(source.url)}</span>
                  {source.title && <span className="text-muted"> · {source.title}</span>}
                </motion.li>
              ))}
            </AnimatePresence>
            {hidden > 0 && <li className="px-1 py-0.5 text-xs text-muted tabular-nums">+{hidden}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
