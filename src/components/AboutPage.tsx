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
    </div>
  );
}
