"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { fmt } from "@/lib/i18n";
import { filterMembers, PARTIES, type Member } from "@/lib/legislators";
import { US_STATES } from "@/lib/states";
import { MemberCard, type MemberLabels } from "./MemberCard";

const PAGE_SIZE = 24;
const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-ink transition-[border-color,box-shadow] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";

export function MemberBrowser({ members, t }: { members: Member[]; t: MemberLabels }) {
  const [chamber, setChamber] = useState<Member["chamber"]>("senate");
  const [state, setState] = useState("");
  const [party, setParty] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const results = filterMembers(members, { chamber, state, party, query });
  // Every filter change starts again from the first page.
  const update = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setVisible(PAGE_SIZE);
  };

  return (
    <section className="space-y-6" aria-labelledby="browse-title">
      <h2 id="browse-title" className="font-serif text-3xl font-semibold tracking-tight">
        {t.browseTitle}
      </h2>

      <div role="tablist" aria-label={t.browseTitle} className="inline-flex rounded-2xl border border-line bg-surface p-1">
        {(["senate", "house"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            id={`tab-${c}`}
            aria-selected={chamber === c}
            aria-controls="member-results"
            onClick={() => update(setChamber)(c)}
            className={`relative rounded-xl px-6 py-2.5 font-semibold transition-colors ${
              chamber === c ? "text-brand-ink" : "text-muted hover:text-ink"
            }`}
          >
            {chamber === c && (
              <motion.span
                layoutId="chamber-tab"
                className="absolute inset-0 rounded-xl bg-brand"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{t[c]}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr]">
        <div className="space-y-1.5">
          <label htmlFor="filter-state" className="text-sm font-semibold">
            {t.filterState}
          </label>
          <select id="filter-state" value={state} onChange={(e) => update(setState)(e.target.value)} className={fieldClass}>
            <option value="">{t.allStates}</option>
            {Object.entries(US_STATES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="filter-party" className="text-sm font-semibold">
            {t.filterParty}
          </label>
          <select id="filter-party" value={party} onChange={(e) => update(setParty)(e.target.value)} className={fieldClass}>
            <option value="">{t.allParties}</option>
            {PARTIES.map((p) => (
              <option key={p} value={p}>
                {t.parties[p] ?? p}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor="filter-name" className="text-sm font-semibold">
            {t.searchLabel}
          </label>
          <input
            id="filter-name"
            type="search"
            value={query}
            onChange={(e) => update(setQuery)(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={fieldClass}
          />
        </div>
      </div>

      <div id="member-results" role="tabpanel" aria-labelledby={`tab-${chamber}`} className="space-y-5">
        <p className="text-sm text-muted" aria-live="polite">
          {fmt(t.resultCount, { count: results.length })}
        </p>
        {results.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-muted">{t.noResults}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {results.slice(0, visible).map((m) => (
                <motion.li
                  key={m.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                >
                  <MemberCard member={m} t={t} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        {visible < results.length && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-xl border border-line bg-surface px-6 py-3 font-semibold transition-colors hover:border-brand hover:text-brand"
            >
              {t.showMore}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
