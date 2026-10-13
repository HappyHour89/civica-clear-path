"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { fmt, type Dictionary } from "@/lib/i18n";
import { US_STATES } from "@/lib/states";
import { VOTE_LINKS, voteGovStateUrl } from "@/lib/vote";

function OfficialLink({ href, children, source }: { href: string; children: React.ReactNode; source: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand"
      >
        <span>
          <span className="block font-semibold text-brand group-hover:underline group-hover:underline-offset-4">
            {children}
          </span>
          <span className="text-xs text-muted">{source}</span>
        </span>
        <span aria-hidden className="text-brand transition-transform group-hover:translate-x-1">
          ↗
        </span>
      </a>
    </li>
  );
}

export function StateVotingInfo({ t }: { t: Dictionary["vote"] }) {
  const [state, setState] = useState("");
  const name = US_STATES[state];

  return (
    <div className="space-y-5 rounded-3xl border border-line bg-surface p-5 sm:p-8">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-semibold">{t.stateTitle}</h2>
        <p className="text-muted">{t.stateBody}</p>
      </div>
      <div className="max-w-sm space-y-2">
        <label htmlFor="vote-state" className="block font-semibold">
          {t.stateLabel}
        </label>
        <select
          id="vote-state"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        >
          <option value="">—</option>
          {Object.entries(US_STATES).map(([code, stateName]) => (
            <option key={code} value={code}>
              {stateName}
            </option>
          ))}
        </select>
      </div>
      <AnimatePresence mode="wait">
        {state && (
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn-ink">
              {fmt(t.unverifiedNote, { state: name })}
            </p>
            <ul className="grid gap-3 md:grid-cols-2">
              <OfficialLink href={voteGovStateUrl(state)} source="Vote.gov">
                {voteGovStateUrl(state) === VOTE_LINKS.registerIndex
                  ? t.linkRegisterIndex
                  : fmt(t.linkRegisterState, { state: name })}
              </OfficialLink>
              <OfficialLink href={VOTE_LINKS.electionOffices} source="USA.gov">
                {fmt(t.linkElectionOffice, { state: name })}
              </OfficialLink>
              <OfficialLink href={VOTE_LINKS.deadlines} source="USA.gov">
                {t.linkDeadlines}
              </OfficialLink>
              <OfficialLink href={VOTE_LINKS.earlyVoting} source="USA.gov">
                {t.linkEarly}
              </OfficialLink>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
