"use client";

import { motion } from "motion/react";
import { BRANCHES, CHECKS, pick } from "@/content/learn";
import type { Dictionary, Language } from "@/lib/i18n";
import { Reveal, RevealGroup, RevealItem } from "../site/Reveal";

// Node centers in the SVG's 400x330 coordinate space: Legislative top, Executive left, Judicial right.
const NODES = [
  { x: 200, y: 62 },
  { x: 78, y: 262 },
  { x: 322, y: 262 },
];

// Curved arrows in both directions between each pair of branches.
function arc(from: (typeof NODES)[number], to: (typeof NODES)[number], bend: number) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  const shrink = (px: number, py: number, qx: number, qy: number) => {
    const d = Math.hypot(qx - px, qy - py);
    return { x: px + ((qx - px) / d) * 52, y: py + ((qy - py) / d) * 52 };
  };
  const start = shrink(from.x, from.y, cx, cy);
  const end = shrink(to.x, to.y, cx, cy);
  return `M${start.x.toFixed(1)} ${start.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

const PAIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 2],
  [2, 1],
  [2, 0],
  [0, 2],
];

export function BranchesDiagram({ lang, t }: { lang: Language; t: Dictionary["learn"] }) {
  return (
    <section className="space-y-10">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <motion.svg
          viewBox="0 0 400 330"
          role="img"
          aria-label={t.diagramLabel}
          className="mx-auto w-full max-w-md"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
        >
          <defs>
            <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0 10 5 0 10z" fill="var(--accent)" />
            </marker>
          </defs>
          {PAIRS.map(([a, b], i) => (
            <motion.path
              key={i}
              d={arc(NODES[a], NODES[b], 26)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
              variants={{
                hidden: { pathLength: 0, opacity: 0 },
                visible: { pathLength: 1, opacity: 1, transition: { duration: 0.8, delay: 0.6 + i * 0.15 } },
              }}
            />
          ))}
          {BRANCHES.map((branch, i) => (
            <motion.g
              key={i}
              variants={{
                hidden: { opacity: 0, scale: 0.8 },
                visible: { opacity: 1, scale: 1, transition: { delay: i * 0.15, type: "spring", stiffness: 200, damping: 16 } },
              }}
              style={{ originX: `${NODES[i].x}px`, originY: `${NODES[i].y}px` }}
            >
              <circle cx={NODES[i].x} cy={NODES[i].y} r={48} fill="var(--brand)" />
              <text
                x={NODES[i].x}
                y={NODES[i].y + 6}
                textAnchor="middle"
                fill="var(--brand-ink)"
                className="font-serif text-[15px] font-semibold"
              >
                {pick(branch.name, lang)}
              </text>
            </motion.g>
          ))}
        </motion.svg>

        <RevealGroup className="space-y-4" stagger={0.12}>
          {BRANCHES.map((branch, i) => (
            <RevealItem key={i} className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-serif text-xl font-semibold">{pick(branch.name, lang)}</h3>
              <p className="text-sm text-muted">{pick(branch.who, lang)}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-accent">
                {branch.powers.map((power, j) => (
                  <li key={j}>{pick(power, lang)}</li>
                ))}
              </ul>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>

      <Reveal className="rounded-3xl border border-line bg-brand-soft/50 p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold">{t.checksTitle}</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {CHECKS.map((check, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-surface p-4">
              <span aria-hidden className="mt-0.5 font-serif font-semibold text-accent-ink">
                ⇄
              </span>
              <span>{pick(check, lang)}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
