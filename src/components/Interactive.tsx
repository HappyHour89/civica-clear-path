"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import type { Dictionary, Language } from "@/lib/i18n";
import type { Briefing, Simpler } from "@/lib/schemas";
import { ErrorMessage } from "./AskForm";
import { Button, softSpring, spring, Stagger, StaggerItem } from "./motion";

type Term = { term: string; definition: string };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Answers in other languages write terms as "필리버스터 (filibuster)"; match
// either the whole term or the part before the English in parentheses.
function variants(term: string) {
  const base = term.split(/\s*[(（]/)[0].trim();
  return [...new Set([term.trim(), base])].filter((v) => v.length >= 2);
}

// A defined word inside a sentence: dotted underline, and a small bubble with
// its meaning when tapped. Escape or tapping elsewhere closes it.
function TermButton({ label, definition }: { label: string; definition: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`rounded-sm underline decoration-accent decoration-dotted decoration-2 underline-offset-4 transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent ${
          open ? "bg-accent-soft" : ""
        }`}
      >
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="note"
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.1 } }}
            transition={spring}
            className="absolute top-full left-0 z-20 mt-2 block w-72 max-w-[80vw] rounded-lg border border-line bg-surface p-3 font-sans text-sm leading-snug text-ink shadow-xl"
          >
            <span className="mb-1 block font-semibold">{label}</span>
            {definition}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// Plain text with the briefing's key terms made tappable (first mention of
// each term only, so the text stays calm).
export function TermText({ text, terms }: { text: string; terms: Term[] }) {
  const lookup = new Map<string, Term>();
  for (const term of terms) for (const v of variants(term.term)) lookup.set(v.toLowerCase(), term);
  const keys = [...lookup.keys()].sort((a, b) => b.length - a.length);
  if (keys.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${keys.map(escapeRegex).join("|")})`, "gi");
  const used = new Set<Term>();
  return (
    <>
      {text.split(pattern).map((part, i) => {
        const term = lookup.get(part.toLowerCase());
        if (!term || used.has(term)) return <Fragment key={i}>{part}</Fragment>;
        used.add(term);
        return <TermButton key={i} label={part} definition={term.definition} />;
      })}
    </>
  );
}

export function TermList({ items, terms }: { items: string[]; terms: Term[] }) {
  return (
    <Stagger as="ul" className="list-disc space-y-1.5 pl-5 marker:text-muted">
      {items.map((item, i) => (
        <StaggerItem as="li" key={i}>
          <TermText text={item} terms={terms} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

export type SimplifyRequest =
  | { slug: string }
  | { briefing: Briefing; question: string; language: Language; token: string };

// "Explain it more simply": asks for a plainer retelling and an everyday
// comparison, then unfolds them under the summary.
export function SimplerBox({ request, t }: { request: SimplifyRequest; t: Dictionary }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<Simpler | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setState("loading");
    setError(null);
    try {
      const response = await fetch("/api/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.simpler) throw new Error(body?.error ?? t.genericError);
      setResult(body.simpler);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
      setState("idle");
    }
  }

  return (
    <div className="space-y-3">
      {state !== "done" && (
        <Button type="button" variant="soft" onClick={load} disabled={state === "loading"}>
          <motion.span
            aria-hidden
            animate={state === "loading" ? { rotate: 360 } : { rotate: 0 }}
            transition={state === "loading" ? { duration: 1.2, repeat: Infinity, ease: "linear" } : spring}
          >
            ✦
          </motion.span>
          {state === "loading" ? t.simplerLoading : t.simplerButton}
        </Button>
      )}
      {state === "loading" && (
        <div aria-hidden className="space-y-2">
          {[92, 80, 64].map((w) => (
            <motion.div
              key={w}
              className="h-3 rounded-full bg-accent-soft"
              style={{ width: `${w}%` }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          ))}
        </div>
      )}
      <ErrorMessage message={error} />
      <AnimatePresence>
        {state === "done" && result && (
          <motion.div
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={softSpring}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-xl border border-accent/30 bg-accent-soft/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{t.simplerTitle}</p>
              <p className="text-lg leading-relaxed">{result.simpler}</p>
              {result.analogy && (
                <p className="flex gap-2 border-t border-accent/20 pt-3">
                  <span aria-hidden>💡</span>
                  <span>
                    <span className="font-semibold">{t.simplerAnalogy}: </span>
                    {result.analogy}
                  </span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// "Was this page clear?" — three one-tap answers; the two that mean "not
// quite" open a short optional note for the reviewers.
export function FeedbackWidget({ slug, t }: { slug: string; t: Dictionary }) {
  const [kind, setKind] = useState<"clear" | "confusing" | "error" | null>(null);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(chosen: "clear" | "confusing" | "error", note: string) {
    setState("sending");
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, kind: chosen, message: note }),
      });
      if (!response.ok) throw new Error(t.genericError);
      setState("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
      setState("idle");
    }
  }

  const options = [
    { id: "clear" as const, icon: "👍", label: t.feedbackClear },
    { id: "confusing" as const, icon: "🤔", label: t.feedbackConfusing },
    { id: "error" as const, icon: "⚠️", label: t.feedbackError },
  ];

  return (
    <section aria-labelledby="feedback-title" className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <h2 id="feedback-title" className="font-serif text-xl font-semibold">
        {t.feedbackTitle}
      </h2>
      <AnimatePresence mode="wait">
        {state === "sent" ? (
          <motion.p key="thanks" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-accent">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} aria-hidden>
              ✓
            </motion.span>
            {t.feedbackThanks}
          </motion.p>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} className="space-y-3">
            <div role="group" aria-label={t.feedbackTitle} className="flex flex-wrap gap-2">
              {options.map((o) => (
                <Button
                  key={o.id}
                  type="button"
                  variant="soft"
                  aria-pressed={kind === o.id}
                  disabled={state === "sending"}
                  onClick={() => (o.id === "clear" ? send("clear", "") : setKind(o.id))}
                  className={kind === o.id ? "border-accent! bg-accent-soft! text-accent!" : ""}
                >
                  <span aria-hidden>{o.icon}</span>
                  {o.label}
                </Button>
              ))}
            </div>
            <AnimatePresence>
              {kind && kind !== "clear" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={softSpring} className="space-y-2 overflow-hidden">
                  <label htmlFor="feedback-message" className="sr-only">
                    {t.feedbackPlaceholder}
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t.feedbackPlaceholder}
                    rows={3}
                    maxLength={1000}
                    className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                  <Button type="button" onClick={() => send(kind, message)} disabled={state === "sending"}>
                    {t.feedbackSend}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <ErrorMessage message={error} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
