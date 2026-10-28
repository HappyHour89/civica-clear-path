"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { US_STATES } from "@/lib/states";
import { useCivica, type AskInput } from "./CivicaProvider";
import { inputClass, PageIntro } from "./ui";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

// Sends the question and opens the briefing, unless the user has since moved
// to another page while it was being researched.
function useSubmit() {
  const { ask } = useCivica();
  const router = useRouter();
  return async (input: AskInput) => {
    const startedAt = window.location.pathname;
    if ((await ask(input)) && window.location.pathname === startedAt) router.push("/briefing");
  };
}

function LocalContextNote() {
  const { t, state } = useCivica();
  return (
    <p className="text-sm text-muted">
      {state ? (
        <>
          {t.localContextFor} <span className="font-medium text-ink">{US_STATES[state]}</span> ·{" "}
          <Link href="/representatives" className="text-accent underline underline-offset-2">
            {t.changeState}
          </Link>
        </>
      ) : (
        <>
          {t.addStateHint}{" "}
          <Link href="/representatives" className="text-accent underline underline-offset-2">
            {t.setYourState}
          </Link>
        </>
      )}
    </p>
  );
}

function SubmitRow() {
  const { t, asking } = useCivica();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="submit"
        disabled={asking}
        className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
      >
        {asking ? t.submitting : t.submit}
      </button>
      {asking && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <span className="inline-block size-3 animate-pulse rounded-full bg-accent" aria-hidden />
          {t.loadingNote}
        </p>
      )}
    </div>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error-ink">
      {message}
    </p>
  );
}

const formClass = "space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6";

export function QuestionForm() {
  const { t, asking, askError } = useCivica();
  const submit = useSubmit();
  const [question, setQuestion] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageIntro title={t.navAsk} intro={t.intro} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!question.trim()) return setLocalError(t.needQuestionOrFile);
          setLocalError(null);
          void submit({ question: question.trim(), file: null });
        }}
        className={formClass}
      >
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
            disabled={asking}
            className={`${inputClass} resize-y text-base`}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">{t.examplesLabel}:</span>
            {t.examples.map((example) => (
              <button
                key={example}
                type="button"
                disabled={asking}
                onClick={() => setQuestion(example)}
                className="rounded-full border border-line px-3 py-1 text-left hover:border-accent hover:text-accent disabled:opacity-60"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
        <LocalContextNote />
        <ErrorMessage message={localError ?? (askError?.fromDocument === false ? askError.message : null)} />
        <SubmitRow />
      </form>
    </div>
  );
}

export function DocumentForm() {
  const { t, asking, askError } = useCivica();
  const submit = useSubmit();
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
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

  return (
    <div className="space-y-6">
      <PageIntro title={t.navDocument} intro={t.documentIntro} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!file) return setLocalError(t.needFile);
          setLocalError(null);
          void submit({ question: question.trim(), file });
        }}
        className={formClass}
      >
        <div className="space-y-2">
          <span id="file-label" className="block font-semibold">
            {t.documentFileLabel}
          </span>
          {/* The native picker's button text can't be translated, so it is
              visually hidden and replaced by a styled label in the UI language. */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <input
              ref={fileInput}
              id="file"
              type="file"
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,image/*"
              disabled={asking}
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
              <button type="button" onClick={clearFile} disabled={asking} className="text-accent underline">
                {t.removeFile}
              </button>
            )}
          </div>
          <p className="text-sm text-muted">{t.fileHint}</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="doc-question" className="block font-semibold">
            {t.documentQuestionLabel}
          </label>
          <input
            id="doc-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t.documentQuestionPlaceholder}
            maxLength={2000}
            disabled={asking}
            className={inputClass}
          />
        </div>
        <LocalContextNote />
        <ErrorMessage message={localError ?? (askError?.fromDocument ? askError.message : null)} />
        <SubmitRow />
      </form>
    </div>
  );
}
