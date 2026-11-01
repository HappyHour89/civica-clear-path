"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { US_STATES } from "@/lib/states";
import { useCivica, type AskInput } from "./CivicaProvider";
import { Button, Collapse, Dots, ProgressBar, Reveal, Stagger, StaggerItem } from "./motion";
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

function SubmitRow() {
  const { t, asking } = useCivica();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={asking}>
          {asking ? (
            <>
              {t.submitting} <Dots />
            </>
          ) : (
            <>
              {t.submit}
              <span aria-hidden>→</span>
            </>
          )}
        </Button>
      </div>
      <Collapse show={asking}>
        <div role="status" className="space-y-2 pt-1">
          <ProgressBar />
          <p className="text-sm text-muted">{t.loadingNote}</p>
        </div>
      </Collapse>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  return (
    <Collapse show={Boolean(message)}>
      <p role="alert" className="rounded-xl border border-error-ink/15 bg-error-soft px-3 py-2 text-sm text-error-ink">
        {message}
      </p>
    </Collapse>
  );
}

function Features() {
  const { t } = useCivica();
  const icons = [
    <path key="a" d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />,
    <path key="b" d="M12 4v16M5 8l-2 6h4l-2-6zm14 0l-2 6h4l-2-6zM5 8h14" strokeLinecap="round" strokeLinejoin="round" />,
    <path key="c" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" strokeLinecap="round" />,
  ];
  return (
    <Stagger as="ul" className="grid gap-3 sm:grid-cols-3">
      {t.features.map((feature, i) => (
        <StaggerItem as="li" key={feature.title} className="flex gap-3 rounded-2xl border border-line/70 bg-surface/60 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              {icons[i]}
            </svg>
          </span>
          <span>
            <span className="block font-semibold">{feature.title}</span>
            <span className="block text-sm text-muted">{feature.body}</span>
          </span>
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
    <div className="space-y-6">
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
    <div className="space-y-6">
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
              className="cursor-pointer rounded-xl bg-accent-soft px-3 py-2 font-medium text-accent transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-disabled:cursor-default peer-disabled:opacity-60"
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
