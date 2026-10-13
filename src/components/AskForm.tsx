"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Dictionary, Language } from "@/lib/i18n";
import { US_STATES } from "@/lib/states";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type AskInput = { question: string; file: File | null; state: string; address: string };

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-muted/80 transition-[border-color,box-shadow] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:opacity-60";

export function AskForm(props: {
  t: Dictionary;
  lang: Language;
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

  return (
    <form
      onSubmit={submit}
      className="space-y-7 rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_60px_-40px_rgba(15,92,82,0.45)] sm:p-8"
    >
      <div className="space-y-3">
        <label htmlFor="question" className="block font-serif text-xl font-semibold">
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
          className={`${inputClass} resize-y text-lg`}
        />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">{t.examplesLabel}:</span>
          {t.examples.map((example) => (
            <motion.button
              key={example}
              type="button"
              disabled={loading}
              onClick={() => setQuestion(example)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-left transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand disabled:opacity-60"
            >
              {example}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
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
            className="cursor-pointer rounded-xl border border-brand/30 bg-brand-soft px-4 py-2 font-medium text-brand transition-colors hover:bg-brand hover:text-brand-ink peer-focus-visible:outline-3 peer-focus-visible:outline-brand peer-disabled:cursor-default peer-disabled:opacity-60"
          >
            {t.chooseFile}
          </label>
          <span className="min-w-0 break-all text-muted">{file ? file.name : t.noFileChosen}</span>
          {file && (
            <button type="button" onClick={clearFile} disabled={loading} className="text-brand underline underline-offset-4">
              {t.removeFile}
            </button>
          )}
        </div>
        <p className="text-sm text-muted">{t.fileHint}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
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
          {state && (
            <Link
              href={`/${props.lang}/representatives?state=${state}`}
              className="inline-block text-sm font-medium text-brand underline underline-offset-4"
            >
              {t.explainPage.browseDirectory} →
            </Link>
          )}
        </div>
        <AnimatePresence initial={false}>
          {state && (
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl bg-error-soft px-4 py-3 text-sm text-error-ink"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-4">
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={loading ? undefined : { y: -2 }}
          whileTap={loading ? undefined : { scale: 0.98 }}
          className="rounded-xl bg-brand px-7 py-3 text-lg font-semibold text-brand-ink shadow-[0_10px_24px_-12px_rgba(15,92,82,0.8)] transition-colors hover:bg-brand-strong disabled:opacity-70"
        >
          {loading ? t.submitting : t.submit}
        </motion.button>
      </div>

      <AnimatePresence>{loading && <ResearchingIndicator note={t.loadingNote} />}</AnimatePresence>
    </form>
  );
}

function ResearchingIndicator({ note }: { note: string }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="space-y-4 rounded-2xl border border-line bg-paper p-5">
        <p className="text-sm text-muted">{note}</p>
        <div className="space-y-2.5" aria-hidden>
          {[92, 78, 85, 60].map((width, i) => (
            <motion.div
              key={i}
              className="h-3 rounded-full bg-brand-soft"
              style={{ width: `${width}%` }}
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
