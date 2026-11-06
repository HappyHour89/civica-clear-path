"use client";

import { useCivica } from "./CivicaProvider";
import { Stagger, StaggerItem } from "./motion";
import { PageIntro } from "./ui";

export function AboutPage() {
  const { t } = useCivica();
  return (
    <div className="space-y-10">
      <PageIntro title={t.aboutTitle} />
      <Stagger className="max-w-2xl space-y-5 font-serif text-lg leading-relaxed">
        {t.aboutParagraphs.map((paragraph) => (
          <StaggerItem key={paragraph}>
            <p>{paragraph}</p>
          </StaggerItem>
        ))}
      </Stagger>
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
