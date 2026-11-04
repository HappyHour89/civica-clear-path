"use client";

import { useState } from "react";
import { askFollowUp } from "@/lib/client";
import type { Dictionary, Language } from "@/lib/i18n";
import type { Briefing } from "@/lib/schemas";
import { AnimatePresence, motion } from "motion/react";
import { useCivica } from "./CivicaProvider";
import { Button, Collapse, softSpring } from "./motion";
import { CitedText, inputClass, SourceList } from "./ui";

export function FollowUpChat(props: {
  t: Dictionary;
  language: Language;
  state: string;
  originalQuestion: string;
  briefing: Briefing;
}) {
  const { t } = props;
  // Kept in the provider so the conversation survives switching pages.
  const { turns, setTurns } = useCivica();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setDraft("");
    const history = turns;
    setTurns([...history, { role: "user", content: trimmed }]);
    try {
      const answer = await askFollowUp(
        {
          language: props.language,
          state: props.state,
          originalQuestion: props.originalQuestion,
          briefing: props.briefing,
          history,
          question: trimmed,
        },
        t,
      );
      setTurns([
        ...history,
        { role: "user", content: trimmed },
        { role: "assistant", content: answer.answer, sources: answer.sources },
      ]);
    } catch (e) {
      // Drop the unanswered question so the history sent next time stays consistent.
      setTurns(history);
      setDraft(trimmed);
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {turns.length > 0 && (
        <ol className="space-y-4">
          <AnimatePresence initial={false}>
          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <motion.li
                key={i}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={softSpring}
                className="ml-auto w-fit max-w-[85%] rounded-lg bg-accent-soft px-4 py-2 text-ink"
              >
                <span className="sr-only">{t.you}: </span>
                {turn.content}
              </motion.li>
            ) : (
              <motion.li
                key={i}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={softSpring}
                className="space-y-3 border-l-2 border-line py-1 pl-4"
              >
                <CitedText
                  text={turn.content}
                  scope={`fu${i}`}
                  validIds={new Set((turn.sources ?? []).map((s) => s.id))}
                />
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted">{t.sources}</summary>
                  <div className="pt-2">
                    <SourceList sources={turn.sources ?? []} scope={`fu${i}`} t={t} />
                  </div>
                </details>
              </motion.li>
            ),
          )}
          </AnimatePresence>
        </ol>
      )}

      {turns.length === 0 && props.briefing.follow_up_suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {props.briefing.follow_up_suggestions.map((suggestion) => (
            <Button key={suggestion} variant="chip" type="button" disabled={loading} onClick={() => send(suggestion)}>
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      <Collapse show={loading}>
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          {t.submitting}
        </p>
      </Collapse>
      <Collapse show={Boolean(error)}>
        <p role="alert" className="rounded-r-md border-l-2 border-error-ink bg-error-soft px-3 py-2 text-sm text-error-ink">
          {error}
        </p>
      </Collapse>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex gap-2"
      >
        <label htmlFor="followup" className="sr-only">
          {t.followUpTitle}
        </label>
        <input
          id="followup"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.followUpPlaceholder}
          maxLength={2000}
          disabled={loading}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <Button type="submit" disabled={loading || !draft.trim()} className="px-4 py-2">
          {t.send}
        </Button>
      </form>
    </div>
  );
}
