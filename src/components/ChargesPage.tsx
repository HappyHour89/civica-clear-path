"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { explainCharges } from "@/lib/client";
import type { Dictionary } from "@/lib/i18n";
import type { ChargeReport } from "@/lib/schemas";
import type { Situation } from "@/lib/situations";
import { ErrorMessage, SituationPicker, useElapsed } from "./AskForm";
import { Claim, ForYou } from "./BriefingView";
import { useCivica } from "./CivicaProvider";
import { Button, Collapse, ProgressBar, Reveal, softSpring, spring, Stagger, StaggerItem } from "./motion";
import { BulletList, cardClass, Eyebrow, ExternalLink, inputClass, PageIntro, Section, SourceList } from "./ui";

import { MAX_UPLOAD_BYTES as MAX_FILE_BYTES } from "@/lib/uploadLimits";

type Item = ChargeReport["line_items"][number];

const PUBLIC_ORIGINS = new Set<Item["origin"]>(["public_decision", "tax", "regulated_rate"]);

const originStyles: Record<Item["origin"], string> = {
  public_decision: "bg-accent text-accent-ink",
  tax: "bg-accent-soft text-accent",
  regulated_rate: "bg-cite-soft text-cite",
  usage: "bg-canvas text-muted",
  contract: "bg-canvas text-muted",
  company_fee: "bg-canvas text-muted",
  unclear: "bg-warn-soft text-warn-ink",
};

// A ring that fills to the share of charges set by public decisions.
function TracedRing({ traced, total, t }: { traced: number; total: number; t: Dictionary }) {
  const reduce = useReducedMotion();
  const share = total ? traced / total : 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 44 44" className="size-20 shrink-0 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r="18" fill="none" strokeWidth="5" className="stroke-line" />
        <motion.circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="stroke-accent"
          initial={{ pathLength: reduce ? share : 0 }}
          animate={{ pathLength: share }}
          transition={{ duration: reduce ? 0 : 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <p className="max-w-56 text-sm">
        <span className="block font-serif text-3xl font-semibold tabular-nums">
          {traced} <span className="text-lg text-muted">{t.chargesOf} {total}</span>
        </span>
        {t.chargesTraced}
      </p>
    </div>
  );
}

// The bill, reprinted as a receipt that prints out line by line. Each line is
// a button that opens its paper trail.
function Receipt(props: { report: ChargeReport; selected: number; onSelect: (i: number) => void; t: Dictionary }) {
  const reduce = useReducedMotion();
  const { report, t } = props;
  return (
    <div className="drop-shadow-md">
      <motion.div
        initial={reduce ? false : { clipPath: "inset(0 0 100% 0)" }}
        animate={{ clipPath: "inset(0 0 0% 0)" }}
        transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
        className="bg-surface px-5 pt-5 pb-3"
      >
        <div className="space-y-0.5 border-b border-dashed border-line pb-3 text-center">
          <p className="font-serif text-lg font-semibold">{report.issuer || report.document_kind}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-muted [:lang(ko)_&]:tracking-normal">{report.document_kind}</p>
          {report.period && <p className="text-xs text-muted">{report.period}</p>}
        </div>
        <LayoutGroup id="receipt">
          <Stagger as="ul" className="py-2">
            {report.line_items.map((item, i) => {
              const active = props.selected === i;
              return (
                <StaggerItem as="li" key={i}>
                  <button
                    type="button"
                    onClick={() => props.onSelect(i)}
                    aria-pressed={active}
                    className="relative grid w-full grid-cols-[1fr_auto] items-baseline gap-x-3 rounded-md px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {active && (
                      <motion.span layoutId="receipt-active" className="absolute inset-0 rounded-md bg-accent-soft" transition={spring} aria-hidden />
                    )}
                    <span className="relative min-w-0">
                      <span className="block font-medium">{item.label}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-1.5 py-px text-[0.7rem] font-semibold ${originStyles[item.origin]}`}>
                          {t.chargeOrigins[item.origin]}
                        </span>
                        {item.changed_recently && (
                          <span className="rounded-full border border-warn-ink/40 px-1.5 py-px text-[0.7rem] font-semibold text-warn-ink">
                            ↑ {t.chargesWentUp}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="relative font-mono text-sm tabular-nums">{item.amount}</span>
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>
        </LayoutGroup>
        {report.total && (
          <div className="flex items-baseline justify-between border-t-4 border-double border-ink px-2 pt-3">
            <span className="text-sm font-semibold uppercase tracking-[0.14em] [:lang(ko)_&]:tracking-normal">{t.chargesTotal}</span>
            <span className="font-mono text-lg font-semibold tabular-nums">{report.total}</span>
          </div>
        )}
      </motion.div>
      {/* The torn-off edge of a receipt. */}
      <div
        aria-hidden
        className="h-3"
        style={{
          backgroundImage:
            "linear-gradient(-45deg, transparent 6px, var(--surface) 0), linear-gradient(45deg, transparent 6px, var(--surface) 0)",
          backgroundSize: "12px 12px",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "left top",
        }}
      />
    </div>
  );
}

function TrailStep(props: { label: string; children: React.ReactNode; last?: boolean; tone?: "accent" | "muted" }) {
  return (
    <motion.li variants={{ hidden: { opacity: 0, x: 16 }, shown: { opacity: 1, x: 0, transition: softSpring } }} className="relative pl-8">
      {!props.last && <span aria-hidden className="absolute top-5 bottom-[-0.75rem] left-[0.6rem] w-0.5 bg-line" />}
      <span
        aria-hidden
        className={`absolute top-1 left-0 size-5 rounded-full border-4 border-surface ${props.tone === "muted" ? "bg-line" : "bg-accent"}`}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted [:lang(ko)_&]:tracking-normal">{props.label}</p>
      <div className="pb-5">{props.children}</div>
    </motion.li>
  );
}

// From the line on the bill to the vote behind it, to the next chance to speak.
function PaperTrail({ report, item, t }: { report: ChargeReport; item: Item; t: Dictionary }) {
  const isPublic = PUBLIC_ORIGINS.has(item.origin);
  const body = item.decided_by
    ? report.who_decides.find(
        (b) => b.body.toLowerCase().includes(item.decided_by.toLowerCase()) || item.decided_by.toLowerCase().includes(b.body.toLowerCase()),
      )
    : undefined;
  return (
    <motion.ol key={item.label} initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.12 } } }}>
      <TrailStep label={t.chargesOnBill}>
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-serif text-lg font-semibold">{item.label}</span>
          <span className="font-mono tabular-nums">{item.amount}</span>
        </p>
      </TrailStep>
      <TrailStep label={t.chargesPaysFor}>
        <p>{item.what_it_is}</p>
      </TrailStep>
      <TrailStep label={t.chargesDecidedBy} tone={isPublic && item.decided_by ? "accent" : "muted"} last={!item.changed_recently && !body}>
        {item.decided_by ? (
          <div className="space-y-1">
            <p className="font-semibold">{item.decided_by}</p>
            {item.decision && (
              <p className="space-y-1">
                <Claim text={item.decision} sourceIds={item.source_ids} b={report} t={t} />
              </p>
            )}
            <p className="flex flex-wrap gap-x-3 text-sm text-muted">
              {item.decision_date && <span className="tabular-nums">{item.decision_date}</span>}
              {item.vote && (
                <span>
                  {t.chargesVote}: <span className="font-semibold text-ink">{item.vote}</span>
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-muted">{isPublic ? t.chargesNotFound : t.chargesNoPublic}</p>
        )}
      </TrailStep>
      {item.changed_recently && (
        <TrailStep label={t.chargesChanged} last={!body}>
          <p className="rounded-r-md border-l-2 border-warn-ink bg-warn-soft px-3 py-2 text-warn-ink">{item.change_note}</p>
        </TrailStep>
      )}
      {body && (
        <TrailStep label={t.chargesWeighIn} last>
          <div className="space-y-1">
            {body.next_meeting && (
              <p>
                <span className="font-semibold">{t.chargesNextMeeting}:</span> <span className="tabular-nums">{body.next_meeting}</span>
              </p>
            )}
            <p>{body.how_to_weigh_in}</p>
            {body.url && <ExternalLink href={body.url}>{t.chargesOfficial} ↗</ExternalLink>}
          </div>
        </TrailStep>
      )}
    </motion.ol>
  );
}

function Results({ report, situations }: { report: ChargeReport; situations: Situation[] }) {
  const { t } = useCivica();
  const trail = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(() => {
    const first = report.line_items.findIndex((item) => PUBLIC_ORIGINS.has(item.origin) && item.decided_by);
    return first >= 0 ? first : 0;
  });

  if (!report.in_scope) {
    return (
      <div className={`${cardClass} space-y-2`}>
        <h2 className="font-serif text-2xl font-semibold">{t.outOfScope}</h2>
        <p>{report.out_of_scope_message}</p>
      </div>
    );
  }

  // On narrow screens the trail sits below the receipt, so bring it into view.
  const select = (i: number) => {
    setSelected(i);
    if (window.innerWidth < 1024) requestAnimationFrame(() => trail.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const traced = report.line_items.filter((item) => PUBLIC_ORIGINS.has(item.origin) && item.decided_by).length;
  const item = report.line_items[selected];

  return (
    <article className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <Eyebrow>{report.document_kind}</Eyebrow>
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{t.chargesReceipt}</h2>
          <p className="font-serif text-xl leading-relaxed">{report.summary}</p>
        </div>
        {report.line_items.length > 0 && <TracedRing traced={traced} total={report.line_items.length} t={t} />}
      </header>

      {report.line_items.length > 0 && (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="space-y-2 lg:sticky lg:top-28">
            <Receipt report={report} selected={selected} onSelect={select} t={t} />
            <p className="text-center text-sm text-muted">{t.chargesTap}</p>
          </div>
          <section ref={trail} aria-live="polite" className={`${cardClass} scroll-mt-24 space-y-4`}>
            <h3 className="font-serif text-2xl font-semibold">{t.chargesTrail}</h3>
            <AnimatePresence mode="wait">
              {item && (
                <motion.div key={selected} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <PaperTrail report={report} item={item} t={t} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      )}

      <ForYou b={report} t={t} situations={situations} fromDocuments />

      {report.who_decides.length > 0 && (
        <Section title={t.chargesWhoDecides} note={t.chargesDisclaimer}>
          <Stagger as="ul" className="grid gap-3 sm:grid-cols-2">
            {report.who_decides.map((body, i) => (
              <StaggerItem as="li" key={i} className="space-y-2 rounded-lg border border-line bg-surface p-4">
                <p className="font-serif text-lg font-semibold leading-snug">{body.body}</p>
                <p className="text-sm text-muted">{body.controls}</p>
                {body.next_meeting && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-2.5 py-1 text-sm text-accent">
                    <span aria-hidden>📅</span>
                    {t.chargesNextMeeting}: <span className="font-semibold tabular-nums">{body.next_meeting}</span>
                  </p>
                )}
                <p className="text-sm">{body.how_to_weigh_in}</p>
                {body.url && <ExternalLink href={body.url}>{t.chargesOfficial} ↗</ExternalLink>}
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      )}

      {report.questions_to_consider.length > 0 && (
        <Section title={t.questionsToConsider}>
          <BulletList items={report.questions_to_consider} />
        </Section>
      )}
      {report.sources.length > 0 && (
        <Section title={t.sources} note={t.sourcesNote}>
          <SourceList sources={report.sources} scope="charge" t={t} />
        </Section>
      )}
    </article>
  );
}

export function ChargesPage() {
  const { t, language, state, situations } = useCivica();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ report: ChargeReport; situations: Situation[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const elapsed = useElapsed(working);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "file" ? !file : !text.trim()) return setError(t.chargesNeedFile);
    if (file && file.size > MAX_FILE_BYTES) return setError(t.errorTooLarge);
    setError(null);
    setWorking(true);
    try {
      const report = await explainCharges(
        { file: mode === "file" ? file : null, text: mode === "text" ? text : "", note, language, state, situations },
        t,
      );
      setResult({ report, situations });
      requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageIntro title={t.chargesTitle} intro={t.chargesIntro} />
      <Reveal delay={0.05}>
        <form onSubmit={submit} className={`${cardClass} space-y-5`}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold">{t.chargesFileLabel}</span>
              <div role="group" aria-label={t.chargesFileLabel} className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1 text-sm">
                {(["file", "text"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={working}
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className="relative rounded-md px-3 py-1.5 font-medium focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {mode === m && <motion.span layoutId="charges-mode" className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={spring} />}
                    <span className={`relative ${mode === m ? "text-ink" : "text-muted"}`}>{m === "file" ? t.compareUpload : t.comparePaste}</span>
                  </button>
                ))}
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {mode === "file" ? (
                <motion.div key="file" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={softSpring}>
                  <input
                    ref={fileInput}
                    id="charge-file"
                    type="file"
                    accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.gif,.heic,application/pdf,text/plain,image/*"
                    disabled={working}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor="charge-file"
                    className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-canvas/60 px-4 py-6 text-center transition-colors hover:border-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-disabled:cursor-default peer-disabled:opacity-60"
                  >
                    <motion.svg
                      viewBox="0 0 24 24"
                      className="size-8 text-accent"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      animate={file ? { y: 0 } : { y: [0, -4, 0] }}
                      transition={file ? spring : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      aria-hidden
                    >
                      <path d="M6 2.5h12v19l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z" />
                      <path d="M9 7.5h6M9 11h6M9 14.5h4" strokeLinecap="round" />
                    </motion.svg>
                    <span className="font-medium">{file ? file.name : t.chooseFile}</span>
                    {!file && <span className="text-sm text-muted">{t.fileHint}</span>}
                  </label>
                </motion.div>
              ) : (
                <motion.div key="text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={softSpring}>
                  <label htmlFor="charge-text" className="sr-only">
                    {t.chargesFileLabel}
                  </label>
                  <textarea
                    id="charge-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t.comparePastePlaceholder}
                    rows={6}
                    maxLength={40_000}
                    disabled={working}
                    className={`${inputClass} resize-y text-sm`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <p className="flex gap-2 text-sm text-muted">
              <span aria-hidden>🔒</span>
              {t.chargesPrivacy}
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="charge-note" className="block font-semibold">
              {t.chargesNoteLabel}
            </label>
            <input
              id="charge-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.chargesNotePlaceholder}
              maxLength={500}
              disabled={working}
              className={inputClass}
            />
          </div>
          <SituationPicker />
          <ErrorMessage message={error} />
          <div className="space-y-3">
            <Button type="submit" disabled={working}>
              {working ? t.chargesSubmitting : t.chargesSubmit}
            </Button>
            <Collapse show={working}>
              <div role="status" className="space-y-2 pt-1">
                <ProgressBar />
                <p className="flex justify-between gap-4 text-sm text-muted">
                  <span>{t.chargesLoading}</span>
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
        {result && !working && <Results key={result.report.summary} report={result.report} situations={result.situations} />}
      </div>
    </div>
  );
}
