"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { GLOSSARY } from "@/content/glossary";
import { fmt, type Dictionary, type Language } from "@/lib/i18n";

const OTHER: Record<Language, Language> = { en: "ko", ko: "en" };

export function GlossarySearch({ lang, t }: { lang: Language; t: Dictionary["learn"] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // Matches terms and definitions in either language.
  const results = GLOSSARY.filter(
    (entry) =>
      !q ||
      [entry.term.en, entry.term.ko, entry.definition.en, entry.definition.ko].some((text) =>
        text.toLowerCase().includes(q),
      ),
  ).sort((a, b) => a.term[lang].localeCompare(b.term[lang], lang));
  const other = OTHER[lang];

  return (
    <div className="space-y-6">
      <div className="max-w-xl space-y-2">
        <label htmlFor="glossary-search" className="block font-semibold">
          {t.glossarySearch}
        </label>
        <input
          id="glossary-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.glossaryPlaceholder}
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        />
        <p className="text-sm text-muted" aria-live="polite">
          {fmt(t.glossaryCount, { count: results.length })}
        </p>
      </div>
      {results.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-muted">{t.glossaryEmpty}</p>
      ) : (
        <dl className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {results.map((entry) => (
              <motion.div
                key={entry.term.en}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <dt className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-serif text-xl font-semibold">{entry.term[lang]}</span>
                  <span lang={other} className="text-sm text-muted">
                    {entry.term[other]}
                  </span>
                </dt>
                <dd className="mt-2 space-y-2">
                  <p>{entry.definition[lang]}</p>
                  <p lang={other} className="text-sm text-muted">
                    {entry.definition[other]}
                  </p>
                </dd>
              </motion.div>
            ))}
          </AnimatePresence>
        </dl>
      )}
    </div>
  );
}
