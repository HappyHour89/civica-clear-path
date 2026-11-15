"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredEdition } from "@/lib/editions";
import { readFollowed, type FollowedBill } from "@/lib/followedBills";
import type { Dictionary, Language } from "@/lib/i18n";
import type { LibraryEntry } from "@/lib/publicPages";
import type { Edition, Story } from "@/lib/schemas";
import type { Situation } from "@/lib/situations";
import { US_STATES } from "@/lib/states";
import { useCivica } from "./CivicaProvider";
import { Button, softSpring, spring, Stagger, StaggerItem } from "./motion";
import { citationClass, inputClass, sourceAnchor, SourceList } from "./ui";

// Polling: quickly while an edition is being written, gently otherwise, so an
// open page picks up a new edition on its own.
const POLL_WRITING_MS = 8_000;
const POLL_IDLE_MS = 3 * 60_000;

function longDate(iso: string, language: Language) {
  return new Intl.DateTimeFormat(language, { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
}

function ago(iso: string, language: Language) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  const format = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  return minutes < 60 ? format.format(-minutes, "minute") : format.format(-Math.round(minutes / 60), "hour");
}

const sectionTone: Record<Story["section"], string> = {
  federal: "text-accent",
  state: "text-cite",
  local: "text-warn-ink",
  courts: "text-ink",
  elections: "text-error-ink",
  economy: "text-muted",
};

function Citations({ ids }: { ids: number[] }) {
  return (
    <>
      {ids.map((id) => (
        <a key={id} href={`#${sourceAnchor("paper", id)}`} className={citationClass}>
          {id}
        </a>
      ))}
    </>
  );
}

function AffectsBadges({ story, mine, t }: { story: Story; mine: Situation[]; t: Dictionary }) {
  if (story.affects.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted">{t.paperAffects}:</span>
      {story.affects.map((a) => {
        const yours = mine.includes(a as Situation);
        return (
          <span key={a} className={`rounded-full px-2 py-0.5 font-medium ${yours ? "bg-accent text-accent-ink" : "bg-canvas text-muted"}`}>
            {t.situationLabels[a as Situation] ?? a}
          </span>
        );
      })}
    </p>
  );
}

function AskLink({ story, t }: { story: Story; t: Dictionary }) {
  return (
    <Link href={`/?q=${encodeURIComponent(story.headline)}`} className="group inline-flex items-center gap-1 text-sm font-medium text-accent print:hidden">
      {t.paperAsk}
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

function LeadStory({ story, mine, t }: { story: Story; mine: Situation[]; t: Dictionary }) {
  return (
    <article className="space-y-4">
      <p className={`text-xs font-bold uppercase tracking-[0.16em] ${sectionTone[story.section]}`}>{t.paperSections[story.section]}</p>
      <h2 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">{story.headline}</h2>
      <p className="font-serif text-xl italic text-muted">{story.dek}</p>
      <p className="font-serif text-lg leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-6xl first-letter:leading-[0.85] first-letter:font-semibold">
        {story.body}
        <Citations ids={story.source_ids} />
      </p>
      {story.what_next && (
        <p className="rounded-r-md border-l-4 border-accent bg-accent-soft/60 px-4 py-2">
          <span className="font-semibold">{t.paperWhatNext}: </span>
          {story.what_next}
        </p>
      )}
      <AffectsBadges story={story} mine={mine} t={t} />
      <AskLink story={story} t={t} />
    </article>
  );
}

function StoryCard({ story, mine, t, forYou }: { story: Story; mine: Situation[]; t: Dictionary; forYou: boolean }) {
  return (
    <motion.article layout transition={softSpring} className="relative space-y-2 break-inside-avoid">
      {forYou && (
        <span className="absolute -top-2 right-0 rounded-b-md bg-accent px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-accent-ink">
          {t.paperForYou}
        </span>
      )}
      <p className={`text-xs font-bold uppercase tracking-[0.16em] ${sectionTone[story.section]}`}>{t.paperSections[story.section]}</p>
      <h3 className="font-serif text-2xl font-semibold leading-snug">{story.headline}</h3>
      <p className="font-serif italic text-muted">{story.dek}</p>
      <p className="leading-relaxed">
        {story.body}
        <Citations ids={story.source_ids} />
      </p>
      {story.what_next && (
        <p className="text-sm">
          <span className="font-semibold">{t.paperWhatNext}: </span>
          {story.what_next}
        </p>
      )}
      <AffectsBadges story={story} mine={mine} t={t} />
      <AskLink story={story} t={t} />
    </motion.article>
  );
}

function Upcoming({ items, language, t }: { items: Edition["upcoming"]; language: Language; t: Dictionary }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="border-b-2 border-ink pb-1 font-serif text-lg font-semibold">{t.paperUpcoming}</h2>
      <Stagger as="ul" className="space-y-3">
        {items.map((item, i) => {
          const d = new Date(`${item.date}T12:00:00`);
          const valid = !Number.isNaN(d.getTime());
          return (
            <StaggerItem as="li" key={i} className="grid grid-cols-[3.25rem_1fr] gap-3">
              <span className="flex flex-col items-center self-start overflow-hidden rounded-md border border-line bg-surface text-center leading-none">
                <span className="w-full bg-accent py-0.5 text-[0.65rem] font-bold uppercase text-accent-ink">
                  {valid ? new Intl.DateTimeFormat(language, { month: "short" }).format(d) : "—"}
                </span>
                <span className="py-1.5 font-serif text-xl font-semibold">{valid ? d.getDate() : "?"}</span>
              </span>
              <span className="space-y-0.5 text-sm">
                <span className="block font-semibold leading-snug">{item.title}</span>
                <span className="block text-muted">{item.body}</span>
                <span className="block">{item.how_to_take_part}</span>
              </span>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}

function PaperSkeleton() {
  const reduce = useReducedMotion();
  const bar = (w: string, h = "h-3") => (
    <motion.div className={`${h} rounded bg-line/70`} style={{ width: w }} animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }} />
  );
  return (
    <div aria-hidden className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-3">
        {bar("30%")}
        {bar("95%", "h-10")}
        {bar("80%", "h-10")}
        {bar("70%", "h-5")}
        {bar("100%")}
        {bar("100%")}
        {bar("85%")}
      </div>
      <div className="space-y-3">
        {bar("60%", "h-5")}
        {bar("100%")}
        {bar("90%")}
        {bar("100%")}
      </div>
    </div>
  );
}

export function NewspaperPage() {
  const { t, language, state, setState, situations } = useCivica();
  const region = state || "US";
  const [data, setData] = useState<{ stored: StoredEdition | null; refreshing: boolean } | null>(null);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState(false);
  const [view, setView] = useState<"forYou" | "all">("forYou");
  const [bills, setBills] = useState<FollowedBill[]>([]);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [, setTick] = useState(0);
  const last = useRef<string | null>(null);
  const key = `${region}-${language}`;

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/edition?region=${region}&lang=${encodeURIComponent(language)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const next = (await response.json()) as { stored: StoredEdition | null; refreshing: boolean };
      const generatedAt = next.stored?.generatedAt ?? null;
      if (last.current && generatedAt && generatedAt !== last.current) {
        setNotice(true);
        setTimeout(() => setNotice(false), 5000);
      }
      last.current = generatedAt;
      setData(next);
      setError(false);
    } catch {
      setError(true);
    }
  }, [region, language]);

  // A new place or language starts over.
  useEffect(() => {
    last.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before loading the new edition
    setData(null);
    void load();
  }, [key, load]);

  // Keep the page live: poll, and check again whenever the tab comes back.
  const writing = !data?.stored || data.refreshing;
  useEffect(() => {
    const timer = setInterval(() => void load(), writing ? POLL_WRITING_MS : POLL_IDLE_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    const clock = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => {
      clearInterval(timer);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [writing, load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of followed bills from this browser
    setBills(readFollowed().slice(0, 4));
    fetch("/api/library")
      .then((r) => r.json())
      .then((d) => setLibrary((d.entries ?? []).slice(0, 4)))
      .catch(() => undefined);
  }, []);

  const stored = data?.stored ?? null;
  const edition = stored?.edition;
  const place = region === "US" ? t.paperNational : t.paperEditionFor.replace("{place}", US_STATES[region]);
  const mine = situations;
  const isMine = (s: Story) => s.affects.some((a) => mine.includes(a as Situation));
  const stories = edition
    ? view === "forYou" && mine.length
      ? [...edition.stories].sort((a, b) => Number(isMine(b)) - Number(isMine(a)))
      : edition.stories
    : [];

  return (
    <div className="space-y-8">
      {/* Masthead */}
      <header className="space-y-3 text-center">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-xs text-muted">
          {/* The edition's own date (never the build's). */}
          <span>{stored ? longDate(stored.generatedAt, language) : "\u00a0"}</span>
          <span className="font-semibold uppercase tracking-[0.14em] text-ink">{place}</span>
          <span className="flex items-center gap-1.5">
            <span className="relative flex size-2" aria-hidden>
              <motion.span className="absolute inset-0 rounded-full bg-accent" animate={{ scale: [1, 2.2], opacity: [0.6, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />
              <span className="relative size-2 rounded-full bg-accent" />
            </span>
            {stored ? `${t.paperUpdated} ${ago(stored.generatedAt, language)}` : t.paperRefreshing}
          </span>
        </div>
        <motion.h1
          initial={{ opacity: 0, letterSpacing: "0.08em" }}
          animate={{ opacity: 1, letterSpacing: "-0.01em" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="border-y-4 border-double border-ink py-3 font-serif text-5xl font-bold sm:text-7xl"
        >
          {t.paperName}
        </motion.h1>
        <p className="font-serif text-sm italic text-muted">{t.tagline}</p>
        <p className="text-xs text-muted">{t.paperLive}</p>
        <div className="flex flex-wrap items-center justify-center gap-2 print:hidden">
          {mine.length > 0 && (
            <LayoutGroup id="paper-view">
              <div role="group" className="flex rounded-full border border-line bg-surface p-1 text-sm">
                {(["forYou", "all"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className="relative rounded-full px-3 py-1 font-medium focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {view === v && <motion.span layoutId="paper-view-pill" className="absolute inset-0 rounded-full bg-ink" transition={spring} />}
                    <span className={`relative ${view === v ? "text-canvas" : "text-muted"}`}>{v === "forYou" ? t.paperForYou : t.paperAll}</span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
          )}
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">{t.locationLabel}</span>
            <select value={state} onChange={(e) => setState(e.target.value)} className={`${inputClass} h-9 w-auto py-1`}>
              <option value="">{t.paperNational}</option>
              {Object.entries(US_STATES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="soft" onClick={() => window.print()}>
            🖨 {t.paperPrint}
          </Button>
        </div>
        {!state && <p className="text-sm text-accent print:hidden">{t.paperSetState} ↑</p>}
      </header>

      <AnimatePresence>
        {notice && (
          <motion.p
            role="status"
            style={{ x: "-50%" }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={spring}
            className="fixed top-24 left-1/2 z-30 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink shadow-lg"
          >
            ✦ {t.paperNewEdition}
          </motion.p>
        )}
      </AnimatePresence>

      {error && !edition && <p className="text-center text-muted">{t.paperUnavailable}</p>}
      {!edition && !error && (
        <div role="status" className="space-y-4">
          <p className="text-center text-muted">{t.paperGenerating}</p>
          <PaperSkeleton />
        </div>
      )}
      {data?.refreshing && edition && <p className="text-center text-xs text-muted print:hidden">{t.paperRefreshing}</p>}

      {edition && stored && (
        <motion.div key={stored.generatedAt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-10">
          <div className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:divide-x lg:divide-line">
            <LeadStory story={edition.lead} mine={mine} t={t} />
            <aside className="space-y-8 lg:pl-8">
              <Upcoming items={edition.upcoming} language={language} t={t} />
              {edition.quick_hits.length > 0 && (
                <section className="space-y-2">
                  <h2 className="border-b-2 border-ink pb-1 font-serif text-lg font-semibold">{t.paperQuickHits}</h2>
                  <ul className="space-y-2 text-sm">
                    {edition.quick_hits.map((hit, i) => (
                      <li key={i} className="border-b border-line pb-2 last:border-0">
                        {hit}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>

          {stories.length === 0 ? (
            <p className="text-center text-muted">{t.paperNoStories}</p>
          ) : (
            <LayoutGroup id="paper-stories">
              <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {stories.map((story) => (
                  <div key={story.headline} className="border-t-2 border-ink pt-3">
                    <StoryCard story={story} mine={mine} t={t} forYou={view === "forYou" && isMine(story)} />
                  </div>
                ))}
              </div>
            </LayoutGroup>
          )}

          <div className="grid gap-8 border-t-4 border-double border-ink pt-6 sm:grid-cols-2 print:hidden">
            <section className="space-y-3">
              <h2 className="font-serif text-lg font-semibold">{t.paperYourBills}</h2>
              {bills.length === 0 ? (
                <p className="text-sm text-muted">
                  {t.paperNoBills}{" "}
                  <Link href="/bills" className="text-accent underline underline-offset-2">
                    {t.navBills}
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {bills.map((b) => (
                    <li key={b.key}>
                      <Link href="/bills" className="flex items-baseline justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 hover:border-ink">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{b.bill.nickname || b.bill.title}</span>
                          <span className="text-xs text-muted">
                            {b.bill.number} · {b.bill.jurisdiction}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${b.update ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"}`}>
                          {b.update ? t.billUpdated : t.billStages[b.bill.stage]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {library.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold">{t.paperFromLibrary}</h2>
                <ul className="space-y-2">
                  {library.map((entry) => (
                    <li key={entry.slug}>
                      <Link href={`/p/${entry.slug}`} lang={entry.language} className="block font-serif leading-snug hover:underline">
                        {entry.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <section className="space-y-3 border-t border-line pt-6">
            <h2 className="font-serif text-lg font-semibold">{t.sources}</h2>
            <SourceList sources={edition.sources} scope="paper" t={t} />
            <p className="text-xs text-muted">{t.paperDisclaimer}</p>
          </section>
        </motion.div>
      )}
    </div>
  );
}
