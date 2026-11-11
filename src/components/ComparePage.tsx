"use client";

import { animate, AnimatePresence, LayoutGroup, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { VersionInput } from "@/lib/client";
import type { Dictionary } from "@/lib/i18n";
import type { Comparison } from "@/lib/schemas";
import { ErrorMessage, SituationPicker, useElapsed } from "./AskForm";
import { ForYou } from "./BriefingView";
import { useCivica } from "./CivicaProvider";
import { Button, Collapse, ProgressBar, Reveal, softSpring, spring } from "./motion";
import { BulletList, cardClass, Eyebrow, inputClass, PageIntro, Section, SourceList } from "./ui";

const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_PASTED = 60_000;

type Change = Comparison["changes"][number];
type Filter = "all" | "major" | Change["kind"];

const emptySide: VersionInput = { file: null, text: "" };

// One version: a file, or pasted text, chosen with a sliding switch.
function VersionPicker(props: {
  id: string;
  label: string;
  tone: "before" | "after";
  value: VersionInput;
  onChange: (value: VersionInput) => void;
  disabled: boolean;
}) {
  const { t } = useCivica();
  const [mode, setMode] = useState<"file" | "text">(props.value.text && !props.value.file ? "text" : "file");
  const fileInput = useRef<HTMLInputElement>(null);
  const filled = Boolean(props.value.file || props.value.text.trim());

  return (
    <fieldset
      className={`min-w-0 space-y-3 rounded-lg border border-line bg-canvas/60 p-4 ${props.tone === "before" ? "order-1" : "order-3"}`}
    >
      <legend className="sr-only">{props.label}</legend>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
              props.tone === "before" ? "bg-line text-ink" : "bg-accent text-accent-ink"
            }`}
          >
            {props.tone === "before" ? "A" : "B"}
          </span>
          {props.label}
        </span>
        <AnimatePresence>
          {filled && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={spring}
              className="grid size-6 place-items-center rounded-full bg-accent-soft text-accent"
              aria-hidden
            >
              ✓
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div role="group" aria-label={props.label} className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-1 text-sm">
        {(["file", "text"] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={props.disabled}
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              props.onChange(emptySide);
              if (fileInput.current) fileInput.current.value = "";
            }}
            className="relative rounded-md py-1.5 font-medium focus-visible:outline-2 focus-visible:outline-accent"
          >
            {mode === m && (
              <motion.span layoutId={`${props.id}-mode`} className="absolute inset-0 rounded-md bg-canvas shadow-sm" transition={spring} />
            )}
            <span className={`relative ${mode === m ? "text-ink" : "text-muted"}`}>
              {m === "file" ? t.compareUpload : t.comparePaste}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "file" ? (
          <motion.div key="file" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={softSpring}>
            <input
              ref={fileInput}
              id={`${props.id}-file`}
              type="file"
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,image/*"
              disabled={props.disabled}
              onChange={(e) => props.onChange({ file: e.target.files?.[0] ?? null, text: "" })}
              className="peer sr-only"
            />
            <label
              htmlFor={`${props.id}-file`}
              className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-line bg-surface px-3 py-4 text-center text-sm transition-colors hover:border-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-disabled:cursor-default peer-disabled:opacity-60"
            >
              <svg viewBox="0 0 20 20" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 13V3.5M6.5 7L10 3.5 13.5 7M4 12.5v4h12v-4" />
              </svg>
              <span className="font-medium text-ink">{props.value.file ? props.value.file.name : t.chooseFile}</span>
              {!props.value.file && <span className="text-muted">{t.noFileChosen}</span>}
            </label>
          </motion.div>
        ) : (
          <motion.div key="text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={softSpring}>
            <label htmlFor={`${props.id}-text`} className="sr-only">
              {props.label}
            </label>
            <textarea
              id={`${props.id}-text`}
              value={props.value.text}
              onChange={(e) => props.onChange({ file: null, text: e.target.value })}
              placeholder={t.comparePastePlaceholder}
              rows={5}
              maxLength={MAX_PASTED}
              disabled={props.disabled}
              className={`${inputClass} min-h-28 resize-y text-sm`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  );
}

// A number that counts up when it first comes into view.
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  useEffect(() => {
    if (!inView) return;
    if (reduce) return count.set(value);
    const controls = animate(count, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, value, reduce, count]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

const kindStyles: Record<Change["kind"], string> = {
  added: "bg-accent-soft text-accent",
  removed: "bg-error-soft text-error-ink",
  changed: "bg-cite-soft text-cite",
};

function ChangeCard({ change, t }: { change: Change; t: Dictionary }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={softSpring}
      className={`overflow-hidden rounded-lg border bg-surface ${change.significance === "major" ? "border-ink/30" : "border-line"}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${kindStyles[change.kind]}`}>{t.changeKinds[change.kind]}</span>
        {change.significance !== "minor" && (
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
              change.significance === "major" ? "border-ink text-ink" : "border-line text-muted"
            }`}
          >
            {t.significance[change.significance]}
          </span>
        )}
        <h3 className="w-full font-serif text-lg font-semibold leading-snug sm:w-auto">{change.topic}</h3>
      </div>
      <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-line">
        {(["before", "after"] as const).map((side) => {
          const text = change[side];
          return (
            <div key={side} className={`space-y-1 px-4 py-3 ${side === "before" ? "bg-canvas/70" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted [:lang(ko)_&]:tracking-normal">
                {side === "before" ? `A · ${t.compareBefore}` : `B · ${t.compareAfter}`}
              </p>
              {text ? (
                <blockquote className={`font-serif text-[0.95em] italic ${side === "before" ? "text-muted" : "text-ink"}`}>“{text}”</blockquote>
              ) : (
                <p className="text-sm text-muted">{side === "before" ? t.compareNotInOld : t.compareNotInNew}</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="border-t border-line px-4 py-3">{change.what_it_means}</p>
    </motion.li>
  );
}

function Results() {
  const { t, comparison } = useCivica();
  const [filter, setFilter] = useState<Filter>("all");
  if (!comparison) return null;
  const c = comparison.comparison;

  if (!c.in_scope) {
    return (
      <div className={`${cardClass} space-y-2`}>
        <h2 className="font-serif text-2xl font-semibold">{t.outOfScope}</h2>
        <p>{c.out_of_scope_message}</p>
      </div>
    );
  }

  const count = (kind: Change["kind"]) => c.changes.filter((ch) => ch.kind === kind).length;
  const major = c.changes.filter((ch) => ch.significance === "major").length;
  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: t.compareFilterAll, n: c.changes.length },
    { id: "major", label: t.compareFilterMajor, n: major },
    { id: "added", label: t.changeKinds.added, n: count("added") },
    { id: "removed", label: t.changeKinds.removed, n: count("removed") },
    { id: "changed", label: t.changeKinds.changed, n: count("changed") },
  ];
  const shown = c.changes.filter((ch) => filter === "all" || (filter === "major" ? ch.significance === "major" : ch.kind === filter));

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <Eyebrow>{t.compareEyebrow}</Eyebrow>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={softSpring}
          className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {c.title}
        </motion.h2>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="rounded-sm bg-canvas px-1.5 py-0.5">A · {comparison.names.before}</span>
          <span aria-hidden>→</span>
          <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-accent">B · {comparison.names.after}</span>
        </p>
        <p className="max-w-3xl font-serif text-xl leading-relaxed">{c.summary}</p>
      </header>

      {!c.same_document && (
        <div role="alert" className="rounded-r-md border-l-2 border-warn-ink bg-warn-soft px-4 py-3 text-warn-ink">
          <p className="font-semibold">{t.compareMismatch}</p>
          {c.mismatch_note && <p className="text-sm">{c.mismatch_note}</p>}
        </div>
      )}

      {c.changes.length > 0 && (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-5">
          {[
            [c.changes.length, t.compareStats.changes],
            [major, t.compareStats.major],
            [count("added"), t.compareStats.added],
            [count("removed"), t.compareStats.removed],
            [count("changed"), t.compareStats.changed],
          ].map(([n, label], i) => (
            <div key={i} className={`bg-surface px-4 py-3 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
              <dd className="font-serif text-3xl font-semibold tabular-nums">
                <CountUp value={n as number} />
              </dd>
              <dt className="text-sm text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      )}

      <ForYou b={c} t={t} situations={comparison.situations} fromDocuments />

      <Section title={t.compareChangesTitle} note={t.compareDisclaimer}>
        {c.changes.length === 0 ? (
          <p className="text-muted">{t.compareNoChanges}</p>
        ) : (
          <div className="space-y-4">
            <LayoutGroup id="compare-filter">
              <div role="group" aria-label={t.compareFilters} className="flex flex-wrap gap-1.5">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filter === f.id}
                    disabled={f.n === 0}
                    onClick={() => setFilter(f.id)}
                    className="relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {filter === f.id && (
                      <motion.span layoutId="compare-filter-pill" className="absolute inset-0 rounded-full bg-ink" transition={spring} />
                    )}
                    <span className={`relative ${filter === f.id ? "text-canvas" : "text-muted hover:text-ink"}`}>
                      {f.label} <span className="tabular-nums opacity-70">{f.n}</span>
                    </span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
            <motion.ol layout className="space-y-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {shown.map((change) => (
                  <ChangeCard key={`${change.kind}-${change.topic}-${c.changes.indexOf(change)}`} change={change} t={t} />
                ))}
              </AnimatePresence>
            </motion.ol>
            {shown.length === 0 && <p className="text-muted">{t.compareNoneInFilter}</p>}
          </div>
        )}
      </Section>

      {c.questions_to_consider.length > 0 && (
        <Section title={t.questionsToConsider}>
          <BulletList items={c.questions_to_consider} />
        </Section>
      )}
      {c.key_terms.length > 0 && (
        <Section title={t.keyTerms}>
          <dl className="divide-y divide-line">
            {c.key_terms.map((term) => (
              <div key={term.term} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-6">
                <dt className="font-serif font-semibold">{term.term}</dt>
                <dd className="text-muted">{term.definition}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      {c.sources.length > 0 && (
        <Section title={t.sources}>
          <SourceList sources={c.sources} scope="c" t={t} />
        </Section>
      )}
    </article>
  );
}

export function ComparePage() {
  const { t, comparing, compareError, compare, comparison } = useCivica();
  const [before, setBefore] = useState<VersionInput>(emptySide);
  const [after, setAfter] = useState<VersionInput>(emptySide);
  const [swapKey, setSwapKey] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const elapsed = useElapsed(comparing);
  const results = useRef<HTMLDivElement>(null);

  const has = (side: VersionInput) => Boolean(side.file || side.text.trim());
  const size = (side: VersionInput) => side.file?.size ?? side.text.length;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!has(before) || !has(after)) return setLocalError(t.compareNeedBoth);
    if (size(before) + size(after) > MAX_TOTAL_BYTES) return setLocalError(t.compareTooBig);
    setLocalError(null);
    if (await compare(before, after)) {
      requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  return (
    <div className="space-y-10">
      <PageIntro title={t.navCompare} intro={t.compareIntro} />
      <Reveal delay={0.05}>
        <form onSubmit={submit} className={`${cardClass} space-y-5`}>
          <div className="relative grid gap-4 md:grid-cols-2">
            <VersionPicker key={`a-${swapKey}`} id="before" label={t.compareBefore} tone="before" value={before} onChange={setBefore} disabled={comparing} />
            <VersionPicker key={`b-${swapKey}`} id="after" label={t.compareAfter} tone="after" value={after} onChange={setAfter} disabled={comparing} />
            <div className="order-2 flex justify-center md:absolute md:top-1/2 md:left-1/2 md:z-10 md:-translate-x-1/2 md:-translate-y-1/2">
            <motion.button
              type="button"
              onClick={() => {
                setBefore(after);
                setAfter(before);
                setSwapKey((k) => k + 1);
              }}
              disabled={comparing}
              aria-label={t.compareSwap}
              title={t.compareSwap}
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={spring}
              className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink shadow-md hover:border-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <svg viewBox="0 0 20 20" className="size-4 max-md:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 7h11l-3-3M16 13H5l3 3" />
              </svg>
            </motion.button>
            </div>
          </div>
          <p className="text-sm text-muted">{t.compareHint}</p>
          <SituationPicker />
          <ErrorMessage message={localError ?? compareError} />
          <div className="space-y-3">
            <Button type="submit" disabled={comparing}>
              {comparing ? t.compareSubmitting : t.compareSubmit}
            </Button>
            <Collapse show={comparing}>
              <div role="status" className="space-y-2 pt-1">
                <ProgressBar />
                <p className="flex justify-between gap-4 text-sm text-muted">
                  <span>{t.compareLoading}</span>
                  <span className="tabular-nums" aria-hidden>
                    {elapsed}
                  </span>
                </p>
              </div>
            </Collapse>
          </div>
        </form>
      </Reveal>
      <div ref={results} className="scroll-mt-28">
        <AnimatePresence mode="wait">
          {comparison && !comparing && (
            <motion.div key={comparison.comparison.title} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={softSpring}>
              <Results />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
