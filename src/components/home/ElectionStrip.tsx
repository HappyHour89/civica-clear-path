"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { countdownTo } from "@/lib/election";
import type { Dictionary, Language } from "@/lib/i18n";
import { CivicIcon } from "../site/CivicIcons";
import { useNowSeconds } from "../site/useNow";

export function ElectionStrip({ lang, t }: { lang: Language; t: Dictionary["home"] }) {
  const now = useNowSeconds();
  const countdown = now === null ? null : countdownTo(new Date(now * 1000));
  const days = countdown?.phase === "before" ? countdown.days : null;

  return (
    <Link
      href={`/${lang}/vote`}
      className="group mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-line bg-surface px-6 py-5 transition-[border-color,box-shadow] hover:border-brand hover:shadow-[0_18px_40px_-30px_rgba(15,92,82,0.7)]"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <CivicIcon name="vote" className="size-7" />
      </span>
      <span className="min-w-0 grow basis-56">
        <span className="block text-xs font-semibold tracking-[0.14em] text-accent-ink uppercase">
          {t.electionLabel}
        </span>
        <span className="block font-serif text-xl font-semibold">{t.electionDate}</span>
      </span>
      {days !== null && (
        <span className="flex shrink-0 items-baseline gap-2" aria-live="off">
          <span className="relative inline-flex h-12 overflow-hidden font-serif text-5xl leading-none font-semibold text-brand tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={days} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}>
                {days}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="text-muted">{t.daysToGo}</span>
        </span>
      )}
      <span className="flex shrink-0 items-center gap-1 font-semibold text-brand">
        {t.getReady}
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}
