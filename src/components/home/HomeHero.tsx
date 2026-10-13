"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { Dictionary, Language } from "@/lib/i18n";
import { CivicIcon, type CivicIconName } from "../site/CivicIcons";
import InfiniteSpiral, { type InfiniteSpiralItem } from "../vendor/InfiniteSpiral";

const EASE = [0.22, 1, 0.36, 1] as const;

const TOPICS: { key: keyof Dictionary["topics"]; icon: CivicIconName; path: string }[] = [
  { key: "bill", icon: "bill", path: "learn/how-a-bill-becomes-law" },
  { key: "reps", icon: "reps", path: "representatives" },
  { key: "branches", icon: "branches", path: "learn/three-branches" },
  { key: "vote", icon: "vote", path: "vote" },
  { key: "filibuster", icon: "filibuster", path: "learn/filibuster" },
  { key: "explain", icon: "explain", path: "explain" },
  { key: "redistricting", icon: "redistricting", path: "learn/redistricting" },
  { key: "glossary", icon: "glossary", path: "learn/glossary" },
];

const VARIANTS = [
  "bg-brand text-brand-ink",
  "bg-surface text-brand",
  "bg-accent-soft text-accent-ink",
  "bg-brand-soft text-brand-strong",
];

export function HomeHero({ lang, t }: { lang: Language; t: Pick<Dictionary, "home" | "topics" | "tagline"> }) {
  // Two copies of the topics make the spiral feel full without repeating too soon.
  const items: InfiniteSpiralItem[] = [...TOPICS, ...TOPICS].map((topic, index) => ({
    id: `${topic.key}-${index}`,
    href: `/${lang}/${topic.path}`,
    label: t.topics[topic.key],
    content: (
      <span className={`flex h-full w-full flex-col justify-between p-4 ${VARIANTS[index % VARIANTS.length]}`}>
        <CivicIcon name={topic.icon} className="size-8" />
        <span className="font-serif text-[0.98rem] leading-snug font-semibold">{t.topics[topic.key]}</span>
      </span>
    ),
  }));
  const lines = t.tagline.split(/(?<=[.,])\s+/);

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
      <div className="space-y-7">
        <motion.p
          className="text-xs font-semibold tracking-[0.18em] text-accent-ink uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {t.home.eyebrow}
        </motion.p>
        <h1 className="font-serif text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
          {lines.map((line, lineIndex) => (
            <span key={lineIndex} className={`block ${lineIndex === 1 ? "text-brand italic" : ""}`}>
              {line.split(" ").map((word, wordIndex) => (
                <span key={wordIndex} className="inline-block overflow-hidden pb-1 align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={{ y: "105%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.8, delay: 0.15 + lineIndex * 0.25 + wordIndex * 0.07, ease: EASE }}
                  >
                    {word}
                    {" "}
                  </motion.span>
                </span>
              ))}
            </span>
          ))}
        </h1>
        <motion.p
          className="max-w-xl text-lg text-muted"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
        >
          {t.home.heroLead}
        </motion.p>
        <motion.div
          className="flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
        >
          <Link
            href={`/${lang}/explain`}
            className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-lg font-semibold text-brand-ink shadow-[0_12px_28px_-14px_rgba(15,92,82,0.9)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-brand-strong"
          >
            {t.home.ctaAsk}
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
          <Link
            href={`/${lang}/learn`}
            className="inline-flex items-center rounded-xl border border-line bg-surface px-6 py-3.5 text-lg font-semibold text-ink transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand"
          >
            {t.home.ctaLearn}
          </Link>
        </motion.div>
      </div>

      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: EASE }}
      >
        <div
          aria-hidden
          className="absolute inset-x-[12%] inset-y-[8%] rounded-full border border-dashed border-brand/25"
        />
        <InfiniteSpiral
          items={items}
          decorative
          ariaLabel={t.home.spiralLabel}
          className="h-[400px] [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)] sm:h-[480px] lg:h-[540px]"
          cardWidth={164}
          cardHeight={118}
          radius={165}
          verticalSpacing={62}
          cardsPerTurn={7}
          cardRadius={16}
          centerScale={1.12}
          edgeFade={0.4}
          edgeBlur={3}
          speed={0.4}
        />
        <p aria-hidden className="mt-2 text-center text-xs text-muted">
          {t.home.spiralHint}
        </p>
      </motion.div>
    </section>
  );
}
