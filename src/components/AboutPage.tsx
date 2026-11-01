"use client";

import { useCivica } from "./CivicaProvider";
import { Stagger, StaggerItem } from "./motion";
import { cardClass, PageIntro } from "./ui";

export function AboutPage() {
  const { t } = useCivica();
  return (
    <div className="space-y-6">
      <PageIntro title={t.aboutTitle} />
      <Stagger className={`${cardClass} max-w-2xl space-y-4 leading-relaxed`}>
        {t.aboutParagraphs.map((paragraph) => (
          <StaggerItem key={paragraph}>
            <p>{paragraph}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
