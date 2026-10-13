"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";

// 100 seats arranged in a half-circle, like the Senate chamber.
const SEATS = (() => {
  const rows = [16, 18, 20, 22, 24];
  const seats: { x: number; y: number; angle: number }[] = [];
  rows.forEach((count, row) => {
    const radius = 70 + row * 26;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI - (Math.PI * (i + 0.5)) / count;
      seats.push({ x: 200 + radius * Math.cos(angle), y: 200 - radius * Math.sin(angle), angle });
    }
  });
  // Fill from left to right across all rows.
  return seats.sort((a, b) => b.angle - a.angle);
})();

function Status({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
        ok ? "bg-brand-soft text-brand-strong" : "bg-paper text-muted"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "–"}</span>
      {ok ? yes : no}
    </span>
  );
}

export function SenateVotes({ t }: { t: Dictionary["learn"] }) {
  const [votes, setVotes] = useState(55);

  return (
    <section className="space-y-5 rounded-3xl border border-line bg-surface p-5 sm:p-8" aria-labelledby="senate-title">
      <h2 id="senate-title" className="font-serif text-2xl font-semibold">
        {t.senateTitle}
      </h2>
      <svg viewBox="0 0 400 212" className="mx-auto w-full max-w-xl" aria-hidden>
        {SEATS.map((seat, i) => (
          <motion.circle
            key={i}
            cx={seat.x}
            cy={seat.y}
            r={7}
            initial={false}
            animate={{ fill: i < votes ? "var(--brand)" : "var(--line)", scale: i < votes ? 1 : 0.85 }}
            transition={{ duration: 0.25, delay: Math.abs(i - votes) * 0.004 }}
          />
        ))}
        <text x={200} y={192} textAnchor="middle" className="fill-ink font-serif text-[40px] font-semibold">
          {votes}
        </text>
      </svg>
      <div className="mx-auto max-w-xl space-y-4">
        <label htmlFor="senate-votes" className="flex items-center justify-between font-semibold">
          {t.votesInFavor}
          <span className="font-serif text-xl text-brand tabular-nums">{votes}</span>
        </label>
        <input
          id="senate-votes"
          type="range"
          min={0}
          max={100}
          value={votes}
          onChange={(e) => setVotes(Number(e.target.value))}
          className="w-full accent-[var(--brand)]"
        />
        <div className="flex flex-wrap gap-2" aria-live="polite">
          <Status ok={votes >= 51} yes={`${t.majorityLine} · ${t.meetsMajority}`} no={`${t.majorityLine} · ${t.missesMajority}`} />
          <Status ok={votes >= 60} yes={`${t.clotureLine} · ${t.meetsCloture}`} no={`${t.clotureLine} · ${t.missesCloture}`} />
        </div>
        <p className="text-sm text-muted">{t.senateNote}</p>
      </div>
    </section>
  );
}
