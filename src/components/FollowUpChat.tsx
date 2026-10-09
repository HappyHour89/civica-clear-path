"use client";

import { useState } from "react";
import { askFollowUp, type ChatTurn } from "@/lib/client";
import type { Dictionary, Language } from "@/lib/i18n";
import type { Briefing } from "@/lib/schemas";
import { CitedText, SourceList } from "./ui";

export function FollowUpChat(props: {
  t: Dictionary;
  language: Language;
  state: string;
  originalQuestion: string;
  briefing: Briefing;
}) {
  const { t } = props;
  const [turns, setTurns] = useState<ChatTurn[]>([]);
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
          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <li key={i} className="ml-auto max-w-[85%] rounded-2xl bg-accent-soft px-4 py-2">
                <span className="sr-only">{t.you}: </span>
                {turn.content}
              </li>
            ) : (
              <li key={i} className="space-y-3 rounded-2xl border border-line px-4 py-3">
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
              </li>
            ),
          )}
        </ol>
      )}

      {turns.length === 0 && props.briefing.follow_up_suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {props.briefing.follow_up_suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={loading}
              onClick={() => send(suggestion)}
              className="rounded-full border border-line px-3 py-1 text-left text-sm hover:border-accent hover:text-accent disabled:opacity-60"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <span className="inline-block size-3 animate-pulse rounded-full bg-accent" aria-hidden />
          {t.submitting}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error-ink">
          {error}
        </p>
      )}

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
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 placeholder:text-muted/70 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {t.send}
        </button>
      </form>
    </div>
  );
}
