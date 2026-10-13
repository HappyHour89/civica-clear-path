"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { BILL_STEPS, pick } from "@/content/learn";
import { fmt, type Dictionary, type Language } from "@/lib/i18n";

// A timeline whose line fills in as you scroll through the steps.
export function BillSteps({ lang, t }: { lang: Language; t: Dictionary["learn"] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section className="space-y-6" aria-labelledby="steps-title">
      <h2 id="steps-title" className="font-serif text-3xl font-semibold tracking-tight">
        {t.stepsTitle}
      </h2>
      <ol ref={ref} className="relative space-y-6 pl-14 sm:pl-20">
        <span aria-hidden className="absolute top-2 bottom-2 left-5 w-0.5 rounded-full bg-line sm:left-7" />
        <motion.span
          aria-hidden
          className="absolute top-2 bottom-2 left-5 w-0.5 origin-top rounded-full bg-brand sm:left-7"
          style={{ scaleY: progress }}
        />
        {BILL_STEPS.map((step, i) => (
          <motion.li
            key={i}
            className="relative"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "0px 0px -80px 0px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              aria-hidden
              className="absolute top-3 -left-14 flex size-10 items-center justify-center rounded-full border-2 border-brand bg-paper font-serif font-semibold text-brand sm:-left-20 sm:size-14 sm:text-lg"
              initial={{ scale: 0.6 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "0px 0px -80px 0px" }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              {i + 1}
            </motion.span>
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <p className="text-xs font-semibold tracking-[0.14em] text-accent-ink uppercase">
                {fmt(t.step, { n: i + 1 })}
              </p>
              <h3 className="mt-1 font-serif text-xl font-semibold">{pick(step.title, lang)}</h3>
              <p className="mt-2 text-muted">{pick(step.body, lang)}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
