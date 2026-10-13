"use client";

import { motion } from "motion/react";
import type { Dictionary } from "@/lib/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;

function Lines({ widths }: { widths: number[] }) {
  return (
    <span className="mt-3 block space-y-2" aria-hidden>
      {widths.map((w, i) => (
        <span key={i} className="block h-2 rounded-full bg-current opacity-20" style={{ width: `${w}%` }} />
      ))}
    </span>
  );
}

// A small, wordless illustration of Civica's idea: two viewpoints side by side, your judgment in the middle.
export function ViewpointsDemo({ t }: { t: Dictionary["home"] }) {
  return (
    <motion.div
      className="relative mx-auto grid max-w-md grid-cols-2 gap-4 rounded-3xl border border-line bg-surface p-6 pb-24"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
    >
      <motion.div
        className="rounded-2xl bg-brand-soft p-4 text-brand-strong"
        variants={{ hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}
      >
        <span className="text-sm font-semibold">{t.viewpointA}</span>
        <Lines widths={[90, 70, 80]} />
      </motion.div>
      <motion.div
        className="rounded-2xl bg-accent-soft p-4 text-accent-ink"
        variants={{
          hidden: { opacity: 0, x: 40 },
          visible: { opacity: 1, x: 0, transition: { duration: 0.7, delay: 0.15, ease: EASE } },
        }}
      >
        <span className="text-sm font-semibold">{t.viewpointB}</span>
        <Lines widths={[80, 90, 60]} />
      </motion.div>
      <motion.div
        className="absolute inset-x-6 bottom-6 flex items-center justify-center gap-3 rounded-2xl border border-line bg-paper py-3"
        variants={{
          hidden: { opacity: 0, y: 16, scale: 0.95 },
          visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, delay: 0.6, ease: EASE } },
        }}
      >
        <motion.svg
          viewBox="0 0 32 32"
          className="size-6 text-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          aria-hidden
          variants={{ hidden: { rotate: -8 }, visible: { rotate: [-8, 6, 0], transition: { delay: 0.9, duration: 1.2 } } }}
        >
          <path d="M16 5v22M9 27h14M5 9h22M5 9l-3 8a3 3 0 0 0 6 0zM27 9l-3 8a3 3 0 0 0 6 0z" />
        </motion.svg>
        <span className="font-serif font-semibold">{t.yourJudgment}</span>
      </motion.div>
    </motion.div>
  );
}
