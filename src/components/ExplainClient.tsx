"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { askQuestion, fetchOfficials } from "@/lib/client";
import type { Dictionary, Language } from "@/lib/i18n";
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

export function ExplainClient({ lang, t }: { lang: Language; t: Dictionary }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(input: AskInput) {
    setLoading(true);
    setError(null);
    setResult(null);
    const officialsRequest = input.state
      ? fetchOfficials(input.state, input.address, t, lang).then(
          (officials) => ({ officials, officialsError: false }),
          () => ({ officials: null, officialsError: true }),
        )
      : Promise.resolve({ officials: null, officialsError: false });
    try {
      const [briefing, officials] = await Promise.all([askQuestion({ ...input, language: lang }, t), officialsRequest]);
      setResult({ input, briefing, ...officials });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {result ? (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
        >
          <BriefingView
            t={t}
            language={lang}
            question={result.input.question}
            state={result.input.state}
            briefing={result.briefing}
            officials={result.officials}
            officialsError={result.officialsError}
            onStartOver={() => setResult(null)}
          />
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          <AskForm t={t} lang={lang} loading={loading} error={error} onSubmit={submit} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
