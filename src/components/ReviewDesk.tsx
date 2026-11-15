"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DICTIONARIES, LANGUAGES } from "@/lib/i18n";
import type { PublishedPage } from "@/lib/publicPages";
import type { Feedback } from "@/lib/review";
import { ErrorMessage } from "./AskForm";
import { Fact } from "./BriefingView";
import { Button, softSpring, spring, Stagger, StaggerItem } from "./motion";
import { cardClass, inputClass } from "./ui";

// The review panel's desk. English only: it's a tool for the panel, not for
// readers. Everything here goes through /api/review/*, which checks the
// reviewer's signed-in cookie.

type QueueItem = {
  slug: string;
  title: string;
  language: keyof typeof LANGUAGES;
  publishedAt: string;
  status: "ai_draft" | "reviewed";
  review: PublishedPage["review"];
  corrections: number;
  feedback: Record<Feedback["kind"], number>;
};

type Tab = "needs" | "flagged" | "reviewed";

const CHECKS = [
  { id: "facts", title: "Facts are accurate", hint: "Open each key fact's source. Does the source really say it?" },
  { id: "sources", title: "Sources are real and relevant", hint: "Official or reputable pages, and on topic. Advocacy cited from more than one side." },
  { id: "balance", title: "Every side is treated fairly", hint: "Each viewpoint as its own supporters would put it. No loaded words, no winner picked." },
  { id: "plain", title: "Easy to understand", hint: "A 9th grader could follow it. Jargon is defined in Key terms." },
] as const;

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error ?? "Something went wrong.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return body as T;
}

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/api/review/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
          onSignedIn();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't sign in.");
        } finally {
          setBusy(false);
        }
      }}
      className={`${cardClass} mx-auto max-w-md space-y-4`}
    >
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold">Review desk</h2>
        <p className="text-sm text-muted">
          For Civica&apos;s review panel. Sign in with the passcode you were given. Reviewers check published pages for accuracy,
          fairness, and plain language, and their name appears on the pages they approve.
        </p>
      </div>
      <label htmlFor="review-code" className="block font-semibold">
        Passcode
      </label>
      <input id="review-code" type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
      <ErrorMessage message={error} />
      <Button type="submit" disabled={busy || !code}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </motion.form>
  );
}

function Workspace({ slug, onChanged }: { slug: string; onChanged: () => void }) {
  const [page, setPage] = useState<PublishedPage | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [checks, setChecks] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [simpler, setSimpler] = useState("");
  const [correction, setCorrection] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ page: PublishedPage; feedback: Feedback[] }>(`/api/review/page?slug=${encodeURIComponent(slug)}`)
      .then(({ page, feedback }) => {
        if (cancelled) return;
        setPage(page);
        setFeedback(feedback);
        setChecks(page.review?.checklist ?? []);
        setNote(page.reviewerNote);
        setSimpler(page.simplerSummary || "");
        setCorrection("");
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function act(action: string, extra: Record<string, unknown>, done: string) {
    setBusy(action);
    setError(null);
    try {
      const { page: next } = await api<{ page: PublishedPage }>("/api/review/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action, ...extra }),
      });
      setPage(next);
      setToast(done);
      setTimeout(() => setToast(null), 2500);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (!page) return <div className="h-96 animate-pulse rounded-xl bg-surface" aria-busy="true" />;
  const t = DICTIONARIES[page.language];
  const b = page.briefing;
  const allChecked = CHECKS.every((c) => checks.includes(c.id));

  return (
    <motion.div key={slug} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={softSpring} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <article lang={page.language} className={`${cardClass} min-w-0 space-y-5`}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-canvas px-2 py-0.5 font-medium">{LANGUAGES[page.language].label}</span>
          <span>Published {date(page.publishedAt)}</span>
          <Link href={`/p/${page.slug}`} target="_blank" className="ml-auto text-accent underline underline-offset-2">
            Open public page ↗
          </Link>
        </div>
        <h2 className="font-serif text-2xl font-semibold leading-snug">{b.title}</h2>
        {page.question && <p className="text-sm text-muted">Reader&apos;s question: “{page.question}”</p>}
        <p className="font-serif text-lg leading-relaxed">{b.summary}</p>
        <section className="space-y-2">
          <h3 className="font-semibold">Key facts · tap a number to check its source</h3>
          <ol className="list-decimal space-y-3 pl-5 text-sm marker:text-muted">
            {b.key_facts.map((fact, i) => (
              <Fact key={i} fact={fact} b={b} t={t} />
            ))}
          </ol>
          {b.key_facts.length === 0 && <p className="text-sm text-muted">No key facts.</p>}
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold">Viewpoints</h3>
          <ul className="space-y-2 text-sm">
            {b.perspectives.map((p, i) => (
              <li key={i} className="rounded-lg bg-canvas px-3 py-2">
                <span className="font-semibold">{p.viewpoint}</span>
                <span className="text-muted"> · {p.main_arguments.length} arguments · {p.core_values}</span>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-sm text-muted">
          {b.sources.length} verified sources · {b.key_terms.length} defined terms · {b.uncertainties.length} uncertainties noted
        </p>
      </article>

      <aside className="space-y-4 xl:sticky xl:top-36">
        <section className={`${cardClass} space-y-3`}>
          <h3 className="font-serif text-lg font-semibold">Checklist</h3>
          <ul className="space-y-2">
            {CHECKS.map((c) => {
              const on = checks.includes(c.id);
              return (
                <li key={c.id}>
                  <label className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2 transition-colors ${on ? "border-accent bg-accent-soft" : "border-line hover:border-ink"}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setChecks(on ? checks.filter((x) => x !== c.id) : [...checks, c.id])}
                      className="mt-1 size-4 accent-[var(--accent)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold">{c.title}</span>
                      <span className="block text-xs text-muted">{c.hint}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <AnimatePresence mode="wait">
            {page.status === "reviewed" && page.review ? (
              <motion.div key="reviewed" initial={{ scale: 1.4, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: -2, opacity: 1 }} transition={spring} className="space-y-2">
                <p className="rounded-md border-2 border-accent px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-accent">
                  ✓ Reviewed by {page.review.by} · {date(page.review.at)}
                </p>
                <Button type="button" variant="ghost" onClick={() => act("unapprove", {}, "Review withdrawn")} disabled={busy !== null}>
                  Withdraw review
                </Button>
              </motion.div>
            ) : (
              <motion.div key="approve" exit={{ opacity: 0 }}>
                <Button type="button" onClick={() => act("approve", { checklist: checks }, "Approved. The page now shows your name.")} disabled={!allChecked || busy !== null}>
                  {busy === "approve" ? "Approving…" : allChecked ? "Approve page" : `Check all ${CHECKS.length} to approve`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className={`${cardClass} space-y-2`}>
          <h3 className="font-serif text-lg font-semibold">Reader feedback ({feedback.length})</h3>
          {feedback.length === 0 ? (
            <p className="text-sm text-muted">No feedback yet.</p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
              {feedback.map((f, i) => (
                <li key={i} className="rounded-lg bg-canvas px-3 py-2">
                  <span aria-hidden>{f.kind === "clear" ? "👍" : f.kind === "confusing" ? "🤔" : "⚠️"}</span>{" "}
                  <span className="font-medium">{f.kind === "clear" ? "Clear" : f.kind === "confusing" ? "Confusing" : "Something's wrong"}</span>
                  <span className="text-muted"> · {date(f.at)}</span>
                  {f.message && <p className="mt-1">{f.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${cardClass} space-y-2`}>
          <h3 className="font-serif text-lg font-semibold">Reviewer&apos;s note</h3>
          <p className="text-xs text-muted">Shown at the top of the page. Context a reader should know, in the page&apos;s language.</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1500} className={`${inputClass} text-sm`} />
          <Button type="button" variant="soft" onClick={() => act("note", { text: note }, "Note saved")} disabled={busy !== null}>
            Save note
          </Button>
        </section>

        <section className={`${cardClass} space-y-2`}>
          <h3 className="font-serif text-lg font-semibold">Simpler wording</h3>
          <p className="text-xs text-muted">Rewrite the summary so anyone can follow it. Shown as &quot;In simpler words, from a reviewer&quot;.</p>
          <textarea value={simpler} onChange={(e) => setSimpler(e.target.value)} placeholder={b.summary} rows={4} maxLength={2000} className={`${inputClass} text-sm`} />
          <Button type="button" variant="soft" onClick={() => act("simplify", { text: simpler }, "Simpler wording saved")} disabled={busy !== null}>
            Save simpler wording
          </Button>
        </section>

        <section className={`${cardClass} space-y-2`}>
          <h3 className="font-serif text-lg font-semibold">Corrections ({page.corrections.length})</h3>
          <p className="text-xs text-muted">Published in the page&apos;s public Corrections box with your name and today&apos;s date. Corrections can&apos;t be removed.</p>
          {page.corrections.map((c, i) => (
            <p key={i} className="rounded-lg bg-canvas px-3 py-2 text-sm">
              {date(c.at)}: {c.text} {c.by && <span className="text-muted">({c.by})</span>}
            </p>
          ))}
          <textarea value={correction} onChange={(e) => setCorrection(e.target.value)} rows={3} maxLength={1500} placeholder="What was wrong, and what is right." className={`${inputClass} text-sm`} />
          <Button
            type="button"
            variant="soft"
            onClick={async () => {
              await act("correction", { text: correction }, "Correction published");
              setCorrection("");
            }}
            disabled={busy !== null || correction.trim().length < 3}
          >
            Publish correction
          </Button>
        </section>
        <ErrorMessage message={error} />
      </aside>

      <AnimatePresence>
        {toast && (
          <motion.p
            role="status"
            style={{ x: "-50%" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={spring}
            className="fixed bottom-6 left-1/2 z-40 rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas shadow-lg"
          >
            ✓ {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ReviewDesk() {
  const [state, setState] = useState<"loading" | "signed-out" | "ready">("loading");
  const [reviewer, setReviewer] = useState("");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [tab, setTab] = useState<Tab>("needs");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ reviewer: string; items: QueueItem[] }>("/api/review/queue");
      setReviewer(data.reviewer);
      setItems(data.items);
      setState("ready");
    } catch (e) {
      if ((e as { status?: number }).status === 401) setState("signed-out");
      else {
        setError(e instanceof Error ? e.message : "Couldn't load the queue.");
        setState("ready");
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the server
    void load();
  }, [load]);

  if (state === "loading") return <div className="h-64 animate-pulse rounded-xl bg-surface" aria-busy="true" />;
  if (state === "signed-out") return <SignIn onSignedIn={() => void load()} />;

  const flagged = (i: QueueItem) => i.feedback.confusing + i.feedback.error > 0;
  const lists: Record<Tab, QueueItem[]> = {
    needs: items.filter((i) => i.status !== "reviewed"),
    flagged: items.filter(flagged),
    reviewed: items.filter((i) => i.status === "reviewed"),
  };
  const tabs: { id: Tab; label: string }[] = [
    { id: "needs", label: "Needs review" },
    { id: "flagged", label: "Flagged by readers" },
    { id: "reviewed", label: "Reviewed" },
  ];
  const shown = lists[tab];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Review desk</p>
          <h1 className="font-serif text-3xl font-semibold">Hi, {reviewer}</h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            await fetch("/api/review/logout", { method: "POST" });
            setState("signed-out");
          }}
        >
          Sign out
        </Button>
      </div>
      <ErrorMessage message={error} />

      <LayoutGroup id="review-tabs">
        <div role="tablist" aria-label="Review queue" className="flex flex-wrap gap-1.5">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              className="relative rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent"
            >
              {tab === tb.id && <motion.span layoutId="review-tab" className="absolute inset-0 rounded-full bg-ink" transition={spring} />}
              <span className={`relative ${tab === tb.id ? "text-canvas" : "text-muted hover:text-ink"}`}>
                {tb.label} <span className="tabular-nums opacity-70">{lists[tb.id].length}</span>
              </span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Stagger as="ul" className="space-y-2">
          {shown.map((item) => (
            <StaggerItem as="li" key={item.slug}>
              <button
                type="button"
                onClick={() => setSelected(item.slug)}
                aria-pressed={selected === item.slug}
                className={`w-full rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  selected === item.slug ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-ink"
                }`}
              >
                <span className="block font-medium leading-snug">{item.title}</span>
                <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
                  <span>{LANGUAGES[item.language].label}</span>
                  <span>{date(item.publishedAt)}</span>
                  {item.status === "reviewed" && <span className="text-accent">✓ {item.review?.by}</span>}
                  {item.feedback.error > 0 && <span className="text-error-ink">⚠️ {item.feedback.error}</span>}
                  {item.feedback.confusing > 0 && <span className="text-warn-ink">🤔 {item.feedback.confusing}</span>}
                  {item.feedback.clear > 0 && <span>👍 {item.feedback.clear}</span>}
                </span>
              </button>
            </StaggerItem>
          ))}
          {shown.length === 0 && <li className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-sm text-muted">Nothing here right now.</li>}
        </Stagger>
        {selected ? (
          <Workspace slug={selected} onChanged={() => void load()} />
        ) : (
          <div className="grid h-64 place-items-center rounded-xl border border-dashed border-line text-muted">Choose a page to review.</div>
        )}
      </div>
    </div>
  );
}
