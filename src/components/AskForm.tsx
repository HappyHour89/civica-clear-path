"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { US_STATES } from "@/lib/states";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type AskInput = { question: string; file: File | null; state: string; address: string };

export function AskForm(props: {
  t: Dictionary;
  loading: boolean;
  error: string | null;
  onSubmit: (input: AskInput) => void;
}) {
  const { t, loading } = props;
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function chooseFile(next: File | null) {
    setLocalError(null);
    if (next && next.size > MAX_FILE_BYTES) {
      setLocalError(t.errorTooLarge);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(next);
  }

  function clearFile() {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() && !file) {
      setLocalError(t.needQuestionOrFile);
      return;
    }
    setLocalError(null);
    props.onSubmit({ question: question.trim(), file, state, address: state ? address.trim() : "" });
  }

  const error = localError ?? props.error;
  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted/70 disabled:opacity-60";

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-lg leading-relaxed text-muted">{t.intro}</p>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="space-y-2">
          <label htmlFor="question" className="block font-semibold">
            {t.questionLabel}
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t.questionPlaceholder}
            rows={3}
            maxLength={2000}
            disabled={loading}
            className={`${inputClass} resize-y text-base`}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">{t.examplesLabel}:</span>
            {t.examples.map((example) => (
              <button
                key={example}
                type="button"
                disabled={loading}
                onClick={() => setQuestion(example)}
                className="rounded-full border border-line px-3 py-1 text-left hover:border-accent hover:text-accent disabled:opacity-60"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span id="file-label" className="block font-semibold">
            {t.fileLabel}
          </span>
          {/* The native picker's button text can't be translated, so it is
              visually hidden and replaced by a styled label in the UI language. */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <input
              ref={fileInput}
              id="file"
              type="file"
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,image/*"
              disabled={loading}
              aria-labelledby="file-label"
              onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              className="peer sr-only"
            />
            <label
              htmlFor="file"
              className="cursor-pointer rounded-lg bg-accent-soft px-3 py-2 font-medium text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-disabled:cursor-default peer-disabled:opacity-60"
            >
              {t.chooseFile}
            </label>
            <span className="min-w-0 break-all text-muted">{file ? file.name : t.noFileChosen}</span>
            {file && (
              <button type="button" onClick={clearFile} disabled={loading} className="text-accent underline">
                {t.removeFile}
              </button>
            )}
          </div>
          <p className="text-sm text-muted">{t.fileHint}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="state" className="block font-semibold">
              {t.locationLabel}
            </label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={loading}
              className={inputClass}
            >
              <option value="">{t.noState}</option>
              {Object.entries(US_STATES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted">{t.locationHint}</p>
          </div>
          {state && (
            <div className="space-y-2">
              <label htmlFor="address" className="block font-semibold">
                {t.addressLabel}
              </label>
              <input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.addressPlaceholder}
                autoComplete="street-address"
                maxLength={200}
                disabled={loading}
                className={inputClass}
              />
              <p className="text-sm text-muted">{t.addressHint}</p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error-ink">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t.submitting : t.submit}
          </button>
          {loading && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted">
              <span className="inline-block size-3 animate-pulse rounded-full bg-accent" aria-hidden />
              {t.loadingNote}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
