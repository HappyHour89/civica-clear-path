"use client";

import { useCivica } from "./CivicaProvider";
import { PageIntro } from "./ui";

export function AboutPage() {
  const { t } = useCivica();
  return (
    <div className="space-y-6">
      <PageIntro title={t.aboutTitle} />
      <div className="max-w-2xl space-y-4 rounded-2xl border border-line bg-surface p-5 leading-relaxed shadow-sm sm:p-7">
        {t.aboutParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
