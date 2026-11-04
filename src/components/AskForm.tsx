"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { US_STATES } from "@/lib/states";
import { useCivica, type AskInput } from "./CivicaProvider";
import { Button, Collapse, ProgressBar, Reveal, Stagger, StaggerItem } from "./motion";
import { cardClass, inputClass, PageIntro } from "./ui";

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

// Seconds since `active` became true, so a long wait shows honest progress
// (time passing) rather than invented stages.
function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => {
      clearInterval(timer);
      setSeconds(0);
    };
  }, [active]);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function SubmitRow() {
  const { t, asking } = useCivica();
  const elapsed = useElapsed(asking);
  return (
    <div className="space-y-3">
      <Button type="submit" disabled={asking}>
        {asking ? t.submitting : t.submit}
      </Button>
      <Collapse show={asking}>
        <div role="status" className="space-y-2 pt-1">
          <ProgressBar />
          <p className="flex justify-between gap-4 text-sm text-muted">
            <span>{t.loadingNote}</span>
            <span className="tabular-nums" aria-hidden>
              {elapsed}
            </span>
          </p>
        </div>
      </Collapse>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  return (
    <Collapse show={Boolean(message)}>
      <p role="alert" className="rounded-r-md border-l-2 border-error-ink bg-error-soft px-3 py-2 text-sm text-error-ink">
        {message}
      </p>
    </Collapse>
  );
}

// Three numbered promises, set like a newspaper's column row.
function Features() {
  const { t } = useCivica();
  return (
    <Stagger as="ol" className="grid gap-6 border-t border-line pt-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
      {t.features.map((feature, i) => (
        <StaggerItem as="li" key={feature.title} className="space-y-1 sm:px-6 sm:first:pl-0 sm:last:pr-0">
          <span className="font-serif text-sm font-semibold text-accent">0{i + 1}</span>
          <span className="block font-serif text-xl font-semibold">{feature.title}</span>
          <span className="block text-sm text-muted">{feature.body}</span>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

const formClass = `${cardClass} space-y-5`;

export function QuestionForm() {
  const { t, asking, askError } = useCivica();
  const submit = useSubmit();
  const [question, setQuestion] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <PageIntro title={t.navAsk} intro={t.intro} />
      <Reveal delay={0.05}>
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
              <Button key={example} variant="chip" type="button" disabled={asking} onClick={() => setQuestion(example)}>
                {example}
              </Button>
            ))}
          </div>
        </div>
        <LocalContextNote />
        <ErrorMessage message={localError ?? (askError?.fromDocument === false ? askError.message : null)} />
        <SubmitRow />
      </form>
      </Reveal>
      <Features />
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
    <div className="space-y-10">
      <PageIntro title={t.navDocument} intro={t.documentIntro} />
      <Reveal delay={0.05}>
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
              className="cursor-pointer rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-ink transition-colors hover:border-ink active:scale-[0.98] peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-disabled:cursor-default peer-disabled:opacity-60"
            >
              {t.chooseFile}
            </label>
            <span className="min-w-0 break-all text-muted">{file ? file.name : t.noFileChosen}</span>
            {file && (
              <Button variant="ghost" type="button" onClick={clearFile} disabled={asking} className="text-accent underline">
                {t.removeFile}
              </Button>
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
      </Reveal>
    </div>
  );
}
