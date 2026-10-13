"use client";

import { AnimatePresence, motion } from "motion/react";
import { countdownTo } from "@/lib/election";
import type { Dictionary } from "@/lib/i18n";
import { useNowSeconds } from "../site/useNow";

function Digit({ value, label }: { value: number | null; label: string }) {
  const text = value === null ? "––" : String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-[4.5rem] min-w-[4.5rem] items-center justify-center overflow-hidden rounded-2xl bg-white/10 px-3 sm:h-28 sm:min-w-28">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            className="font-serif text-4xl font-semibold tabular-nums sm:text-6xl"
            initial={{ y: "-60%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "60%", opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-xs font-semibold tracking-[0.14em] text-brand-soft uppercase sm:text-sm">{label}</span>
    </div>
  );
}

export function Countdown({ t }: { t: Dictionary["vote"] }) {
  const now = useNowSeconds();
  const countdown = now === null ? null : countdownTo(new Date(now * 1000));

  return (
    <section
      aria-label={t.countdownLabel}
      className="relative overflow-hidden rounded-[2rem] bg-brand px-5 py-10 text-brand-ink sm:px-10 sm:py-14"
    >
      <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full border-[28px] border-white/5" />
      <div aria-hidden className="absolute -bottom-32 -left-16 size-80 rounded-full border-[28px] border-accent/20" />
      <div className="relative space-y-6 text-center">
        <p className="text-sm font-semibold tracking-[0.16em] text-brand-soft uppercase">{t.countdownLabel}</p>
        {countdown?.phase === "today" ? (
          <p className="font-serif text-3xl font-semibold">{t.electionToday}</p>
        ) : countdown?.phase === "after" ? (
          <p className="font-serif text-3xl font-semibold">{t.electionPassed}</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-3 sm:gap-5" role="timer" aria-live="off">
            <Digit value={countdown ? countdown.days : null} label={t.days} />
            <Digit value={countdown ? countdown.hours : null} label={t.hours} />
            <Digit value={countdown ? countdown.minutes : null} label={t.minutes} />
            <Digit value={countdown ? countdown.seconds : null} label={t.seconds} />
          </div>
        )}
        <p className="text-sm text-brand-soft">{t.countdownNote}</p>
      </div>
    </section>
  );
}
