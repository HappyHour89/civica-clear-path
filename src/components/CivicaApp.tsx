"use client";

import { useEffect, useState } from "react";
import { askQuestion, fetchOfficials } from "@/lib/client";
import { DICTIONARIES, LANGUAGES, type Language } from "@/lib/i18n";
import type { OfficialsResult } from "@/lib/officials";
import type { Briefing } from "@/lib/schemas";
import { AskForm, type AskInput } from "./AskForm";
import { BriefingView } from "./BriefingView";

type Result = {
  input: AskInput;
  briefing: Briefing;
  officials: OfficialsResult | null;
  officialsError: boolean;
};

export function CivicaApp() {
  const [language, setLanguage] = useState<Language>("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const t = DICTIONARIES[language];

  // Lets screen readers and browsers pick the right pronunciation and fonts.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  async function submit(input: AskInput) {
    setLoading(true);
    setError(null);
    setResult(null);
    const officialsRequest = input.state
      ? fetchOfficials(input.state, input.address, t, language).then(
          (officials) => ({ officials, officialsError: false }),
          () => ({ officials: null, officialsError: true }),
        )
      : Promise.resolve({ officials: null, officialsError: false });
    try {
      const [briefing, officials] = await Promise.all([
        askQuestion({ ...input, language }, t),
        officialsRequest,
      ]);
      setResult({ input, briefing, ...officials });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="text-left"
          >
            <span className="block text-2xl font-bold tracking-tight">Civica</span>
            <span className="block text-sm text-muted">{t.tagline}</span>
          </button>
          <div role="group" aria-label="Language" className="flex rounded-full border border-line p-1">
            {(Object.keys(LANGUAGES) as Language[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                aria-pressed={language === code}
                className={`rounded-full px-3 py-1 text-sm ${
                  language === code ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
                }`}
              >
                {LANGUAGES[code].label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {result ? (
          <BriefingView
            t={t}
            language={language}
            question={result.input.question}
            state={result.input.state}
            briefing={result.briefing}
            officials={result.officials}
            officialsError={result.officialsError}
            onStartOver={() => setResult(null)}
          />
        ) : (
          <AskForm t={t} loading={loading} error={error} onSubmit={submit} />
        )}
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted sm:px-6">
        {t.disclaimer}
      </footer>
    </div>
  );
}
