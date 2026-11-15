"use client";

import { motion } from "motion/react";
import { useCivica } from "./CivicaProvider";
import { softSpring, Stagger, StaggerItem } from "./motion";
import { PageIntro } from "./ui";

export function AboutPage() {
  const { t } = useCivica();
  return (
    <div className="space-y-12">
      <PageIntro title={t.aboutTitle} />
      <Stagger className="max-w-2xl space-y-5 font-serif text-lg leading-relaxed">
        {t.aboutParagraphs.map((paragraph) => (
          <StaggerItem key={paragraph}>
            <p>{paragraph}</p>
          </StaggerItem>
        ))}
      </Stagger>

      <section aria-labelledby="founder" className="max-w-2xl space-y-4 border-t border-line pt-8">
        <h2 id="founder" className="font-serif text-2xl font-semibold">
          {t.founderTitle}
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={softSpring}
          className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:p-6"
        >
          <span
            aria-hidden
            className="grid size-20 shrink-0 place-items-center rounded-full bg-accent font-serif text-2xl font-semibold text-accent-ink"
          >
            SC
          </span>
          <div className="space-y-2">
            <p>
              <span className="block font-serif text-xl font-semibold">Samuel Chu</span>
              <span className="text-sm text-muted">{t.founderRole} · UC San Diego</span>
            </p>
            <p className="leading-relaxed">{t.founderBio}</p>
          </div>
        </motion.div>
      </section>

      <section aria-labelledby="review" className="max-w-2xl space-y-4 border-t border-line pt-8">
        <h2 id="review" className="font-serif text-2xl font-semibold">
          {t.reviewProcessTitle}
        </h2>
        <Stagger as="ol" className="relative space-y-4 border-l-2 border-line pl-6">
          {t.reviewProcess.map((step, i) => (
            <StaggerItem as="li" key={step} className="relative">
              <span
                aria-hidden
                className={`absolute top-0.5 -left-[2.1rem] grid size-6 place-items-center rounded-full text-xs font-bold ${
                  i === t.reviewProcess.length - 1 ? "bg-accent text-accent-ink" : "bg-surface text-ink ring-2 ring-line"
                }`}
              >
                {i + 1}
              </span>
              <p>{step}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* The published methodology. Keep it in step with SYSTEM_PROMPT and lib/sources.ts. */}
      <section id="methodology" className="max-w-2xl scroll-mt-24 space-y-4 border-t border-line pt-8">
        <h2 className="font-serif text-2xl font-semibold">{t.methodologyTitle}</h2>
        <Stagger as="ol" className="list-decimal space-y-3 pl-5 marker:text-muted">
          {t.methodology.map((item) => (
            <StaggerItem as="li" key={item}>
              {item}
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </div>
  );
}
