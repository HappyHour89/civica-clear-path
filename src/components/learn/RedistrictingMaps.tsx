"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { DISTRICT_MAPS, districtWinners, MAP_DESCRIPTIONS, pick, VOTER_GROUPS } from "@/content/learn";
import type { Dictionary, Language } from "@/lib/i18n";

// Light tints that tell districts apart without suggesting any party.
const DISTRICT_TINTS = ["#e7f0ec", "#f6ead9", "#ece8f4", "#e6eef5", "#f3ecd8"];

function borders(map: number[], cell: number) {
  const row = Math.floor(cell / 5);
  const col = cell % 5;
  const differs = (other: number | null) => other === null || map[other] !== map[cell];
  return {
    top: differs(row > 0 ? cell - 5 : null),
    bottom: differs(row < 4 ? cell + 5 : null),
    left: differs(col > 0 ? cell - 1 : null),
    right: differs(col < 4 ? cell + 1 : null),
  };
}

function Marker({ group }: { group: "A" | "B" }) {
  return group === "A" ? (
    <circle cx={12} cy={12} r={7} fill="var(--brand)" />
  ) : (
    <path d="M12 4 20 19H4z" fill="var(--accent)" />
  );
}

export function RedistrictingMaps({ lang, t }: { lang: Language; t: Dictionary["learn"] }) {
  const [mapIndex, setMapIndex] = useState(0);
  const map = DISTRICT_MAPS[mapIndex];
  const winners = districtWinners(map);
  const seatsA = winners.filter((w) => w === "A").length;

  return (
    <section className="space-y-6 rounded-3xl border border-line bg-surface p-5 sm:p-8" aria-labelledby="maps-title">
      <div className="space-y-2">
        <h2 id="maps-title" className="font-serif text-2xl font-semibold">
          {t.mapLabel}
        </h2>
        <p className="flex flex-wrap gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <Marker group="A" />
            </svg>
            {t.groupA} · 60%
          </span>
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <Marker group="B" />
            </svg>
            {t.groupB} · 40%
          </span>
        </p>
      </div>

      <div role="group" aria-label={t.mapLabel} className="flex flex-wrap gap-2">
        {t.mapNames.map((name, i) => (
          <button
            key={name}
            type="button"
            aria-pressed={mapIndex === i}
            onClick={() => setMapIndex(i)}
            className={`relative rounded-xl border px-4 py-2 font-semibold transition-colors ${
              mapIndex === i ? "border-brand text-brand-ink" : "border-line text-muted hover:text-ink"
            }`}
          >
            {mapIndex === i && (
              <motion.span layoutId="map-choice" className="absolute inset-0 rounded-[10px] bg-brand" />
            )}
            <span className="relative">{name}</span>
          </button>
        ))}
      </div>

      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="grid aspect-square w-full max-w-[22rem] grid-cols-5 overflow-hidden rounded-2xl border-2 border-ink">
          {VOTER_GROUPS.map((group, cell) => {
            const b = borders(map, cell);
            return (
              <motion.div
                key={cell}
                className="flex items-center justify-center"
                animate={{
                  backgroundColor: DISTRICT_TINTS[map[cell]],
                  borderTopWidth: b.top ? 2 : 0,
                  borderBottomWidth: b.bottom ? 2 : 0,
                  borderLeftWidth: b.left ? 2 : 0,
                  borderRightWidth: b.right ? 2 : 0,
                }}
                transition={{ duration: 0.45, delay: cell * 0.012 }}
                style={{ borderColor: "var(--ink)", borderStyle: "solid" }}
              >
                <svg viewBox="0 0 24 24" className="size-6 sm:size-7" aria-hidden>
                  <Marker group={group} />
                </svg>
              </motion.div>
            );
          })}
        </div>
        <motion.div key={mapIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4" aria-live="polite">
          <p className="text-lg">{pick(MAP_DESCRIPTIONS[mapIndex], lang)}</p>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-brand-soft p-4">
              <dt className="text-sm text-brand-strong">
                {t.groupA} · {t.seatsWon}
              </dt>
              <dd className="font-serif text-4xl font-semibold text-brand-strong">{seatsA}</dd>
            </div>
            <div className="rounded-2xl bg-accent-soft p-4">
              <dt className="text-sm text-accent-ink">
                {t.groupB} · {t.seatsWon}
              </dt>
              <dd className="font-serif text-4xl font-semibold text-accent-ink">{5 - seatsA}</dd>
            </div>
          </dl>
        </motion.div>
      </div>
    </section>
  );
}
