"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { lookUpBill } from "@/lib/client";
import { billKey, billQuery, detectUpdate, MAX_FOLLOWED, readFollowed, TRACK, trackPosition, writeFollowed, type FollowedBill } from "@/lib/followedBills";
import type { Dictionary, Language } from "@/lib/i18n";
import type { Bill } from "@/lib/schemas";
import { ErrorMessage, useElapsed } from "./AskForm";
import { useCivica } from "./CivicaProvider";
import { Button, Collapse, ProgressBar, Reveal, softSpring, spring, Stagger, StaggerItem } from "./motion";
import { cardClass, Eyebrow, ExternalLink, inputClass, PageIntro, SourceList } from "./ui";

function relativeTime(iso: string, language: Language) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  const format = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  if (minutes < 60) return format.format(-minutes, "minute");
  if (minutes < 60 * 24) return format.format(-Math.round(minutes / 60), "hour");
  return format.format(-Math.round(minutes / (60 * 24)), "day");
}

// Introduced → Committee → One chamber → Both chambers → To be signed → Law.
// The line fills to where the bill is; a bill that stopped or was vetoed
// shows where it ended.
function BillTrack({ bill, t, compact = false }: { bill: Bill; t: Dictionary; compact?: boolean }) {
  const reduce = useReducedMotion();
  const position = trackPosition(bill.stage);
  const ended = bill.stage === "failed" || bill.stage === "vetoed";
  const fill = position < 0 ? 0 : position / (TRACK.length - 1);
  return (
    <div role="img" aria-label={`${t.billStages[bill.stage]}`} className="space-y-2">
      <div className="relative mx-2.5 h-5">
        <div className="absolute inset-x-0 top-2 h-1 rounded-full bg-line" />
        <motion.div
          className={`absolute top-2 left-0 h-1 w-full origin-left rounded-full ${ended ? "bg-warn-ink" : "bg-accent"}`}
          initial={{ scaleX: reduce ? fill : 0 }}
          animate={{ scaleX: fill }}
          transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        {TRACK.map((stage, i) => {
          const reached = position >= 0 && i <= position;
          const current = i === position;
          return (
            <motion.span
              key={stage}
              className={`absolute top-0 grid size-5 place-items-center rounded-full border-2 ${
                reached ? (ended && current ? "border-warn-ink bg-warn-ink" : "border-accent bg-accent") : "border-line bg-surface"
              }`}
              style={{ left: `${(i / (TRACK.length - 1)) * 100}%`, x: "-50%" }}
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...spring, delay: reduce ? 0 : 0.15 + i * 0.12 }}
            >
              {current && !ended && !reduce && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-accent"
                  animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              {reached && (
                <svg viewBox="0 0 12 12" className="relative size-2.5 text-accent-ink" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  {ended && current ? <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" /> : <path d="M2.5 6.2l2.2 2.2 4.8-5" strokeLinecap="round" strokeLinejoin="round" />}
                </svg>
              )}
            </motion.span>
          );
        })}
      </div>
      {!compact && (
        <ol className="relative mx-2.5 h-8 text-[0.7rem] leading-tight text-muted sm:text-xs" aria-hidden>
          {TRACK.map((stage, i) => {
            const edge = i === 0 ? "text-left" : i === TRACK.length - 1 ? "-translate-x-full text-right" : "-translate-x-1/2 text-center";
            return (
              <li
                key={stage}
                style={{ left: `${(i / (TRACK.length - 1)) * 100}%` }}
                className={`absolute top-0 w-16 sm:w-24 ${i === 0 ? "-ml-2.5" : i === TRACK.length - 1 ? "ml-2.5" : ""} ${edge} ${
                  i === position ? "font-semibold text-ink" : "max-sm:hidden"
                }`}
              >
                {t.billTrack[stage as keyof typeof t.billTrack]}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function StageBadge({ bill, t }: { bill: Bill; t: Dictionary }) {
  const tone =
    bill.stage === "enacted"
      ? "bg-accent text-accent-ink"
      : bill.stage === "failed" || bill.stage === "vetoed"
        ? "bg-warn-soft text-warn-ink"
        : bill.stage === "unknown"
          ? "bg-canvas text-muted"
          : "bg-accent-soft text-accent";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{t.billStages[bill.stage]}</span>;
}

function FollowButton({ following, onClick, disabled, t }: { following: boolean; onClick: () => void; disabled?: boolean; t: Dictionary }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={following}
      whileTap={{ scale: 0.94 }}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ${
        following ? "border-accent bg-accent-soft text-accent" : "border-accent bg-accent text-accent-ink hover:bg-accent-hover"
      }`}
    >
      <motion.svg
        key={String(following)}
        viewBox="0 0 20 20"
        className="size-4"
        fill={following ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring}
        aria-hidden
      >
        <path d="M5 3.5h10v13l-5-3.5-5 3.5z" />
      </motion.svg>
      {following ? t.billFollowing : t.billFollow}
    </motion.button>
  );
}

// The full view of one bill: track, latest action, next step, timeline.
function BillDetails({ bill, t }: { bill: Bill; t: Dictionary }) {
  return (
    <div className="space-y-5">
      <BillTrack bill={bill} t={t} />
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 rounded-lg bg-canvas p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted [:lang(ko)_&]:tracking-normal">{t.billLastAction}</dt>
          <dd>
            {bill.last_action}
            {bill.last_action_date && <span className="block text-sm text-muted">{bill.last_action_date}</span>}
          </dd>
        </div>
        <div className="space-y-1 rounded-lg bg-canvas p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted [:lang(ko)_&]:tracking-normal">{t.billNextStep}</dt>
          <dd>{bill.next_step}</dd>
        </div>
      </dl>
      {bill.timeline.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-serif text-lg font-semibold">{t.billTimeline}</h3>
          <Stagger as="ol" className="relative space-y-3 border-l-2 border-line pl-5">
            {bill.timeline.map((entry, i) => (
              <StaggerItem as="li" key={i} className="relative">
                <span
                  aria-hidden
                  className={`absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-surface ${
                    i === bill.timeline.length - 1 ? "bg-accent" : "bg-line"
                  }`}
                />
                <span className="block text-xs font-medium text-muted tabular-nums">{entry.date}</span>
                <span className="block">{entry.event}</span>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}
      {bill.sponsors.length > 0 && (
        <p className="text-sm">
          <span className="font-semibold">{t.billSponsors}: </span>
          {bill.sponsors.map((s) => `${s.name}${s.detail ? ` (${s.detail})` : ""}`).join(", ")}
        </p>
      )}
      {bill.official_url && (
        <p>
          <ExternalLink href={bill.official_url}>{t.billOfficial} ↗</ExternalLink>
        </p>
      )}
      {bill.sources.length > 0 && (
        <details className="group text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">
            {t.sources} ({bill.sources.length})
          </summary>
          <div className="pt-2">
            <SourceList sources={bill.sources} scope="bill" t={t} />
          </div>
        </details>
      )}
    </div>
  );
}

function BillHeading({ bill, t }: { bill: Bill; t: Dictionary }) {
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="font-semibold text-ink">{bill.number}</span>
        <span>· {bill.jurisdiction}</span>
        {bill.session && <span>· {bill.session}</span>}
        <StageBadge bill={bill} t={t} />
      </p>
      <h3 className="font-serif text-2xl font-semibold leading-snug">{bill.nickname || bill.title}</h3>
      {bill.nickname && bill.title !== bill.nickname && <p className="text-sm text-muted">{bill.title}</p>}
    </div>
  );
}

function FollowedCard(props: {
  entry: FollowedBill;
  t: Dictionary;
  language: Language;
  checking: boolean;
  failed: boolean;
  onCheck: () => void;
  onUnfollow: () => void;
  onSeen: () => void;
}) {
  const { entry, t } = props;
  const [open, setOpen] = useState(false);
  const { bill, update } = entry;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={softSpring}
      className={`overflow-hidden rounded-lg border bg-surface ${update ? "border-accent shadow-md" : "border-line"}`}
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <BillHeading bill={bill} t={t} />
          <AnimatePresence>
            {update && (
              <motion.span
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={spring}
                className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-accent-ink"
              >
                {t.billUpdated}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <BillTrack bill={bill} t={t} compact />
        <Collapse show={Boolean(update)}>
          {update && (
            <div className="space-y-1 rounded-r-md border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm">
              {update.from !== update.to ? (
                <p className="font-semibold">
                  {t.billMoved} {t.billStages[update.from]} {t.billMovedTo} {t.billStages[update.to]}
                </p>
              ) : (
                <p className="font-semibold">{t.billNewAction}</p>
              )}
              <p>
                {bill.last_action}
                {bill.last_action_date && <span className="text-muted"> · {bill.last_action_date}</span>}
              </p>
            </div>
          )}
        </Collapse>
        <p className="text-sm text-muted">{bill.status_text}</p>
        {props.failed && <p className="text-sm text-error-ink">{t.billCheckFailed}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="soft" onClick={props.onCheck} disabled={props.checking}>
            <motion.svg
              viewBox="0 0 20 20"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              animate={props.checking ? { rotate: 360 } : { rotate: 0 }}
              transition={props.checking ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0 }}
              aria-hidden
            >
              <path d="M16 10a6 6 0 11-1.8-4.3M16 3.5v3h-3" />
            </motion.svg>
            {props.checking ? t.billChecking : t.billCheckOne}
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
              if (update) props.onSeen();
            }}
          >
            {open ? t.billHideDetails : t.billDetails}
          </Button>
          <Button type="button" variant="ghost" onClick={props.onUnfollow}>
            {t.billUnfollow}
          </Button>
          <span className="ml-auto text-xs text-muted">
            {t.billCheckedAt} {relativeTime(entry.checkedAt, props.language)}
          </span>
        </div>
      </div>
      <Collapse show={open}>
        <div className="border-t border-line p-4 sm:p-5">
          <BillDetails bill={bill} t={t} />
        </div>
      </Collapse>
    </motion.li>
  );
}

export function BillsPage() {
  const { t, language, state } = useCivica();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Bill | null>(null);
  const [followed, setFollowed] = useState<FollowedBill[]>([]);
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const elapsed = useElapsed(searching);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage
    setFollowed(readFollowed());
  }, []);

  function save(next: FollowedBill[]) {
    setFollowed(next);
    writeFollowed(next);
  }

  async function search(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2) return setError(t.billSearchPlaceholder);
    setQuery(trimmed);
    setError(null);
    setSearching(true);
    setFound(null);
    try {
      setFound(await lookUpBill(trimmed, language, state, t));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setSearching(false);
    }
  }

  function toggleFollow(bill: Bill) {
    const key = billKey(bill);
    if (followed.some((entry) => entry.key === key)) return save(followed.filter((entry) => entry.key !== key));
    if (followed.length >= MAX_FOLLOWED) return setNotice(t.billLimit);
    const now = new Date().toISOString();
    save([{ key, bill, followedAt: now, checkedAt: now, update: null }, ...followed]);
  }

  async function check(keys: string[]) {
    setChecking((current) => new Set([...current, ...keys]));
    setFailed((current) => new Set([...current].filter((k) => !keys.includes(k))));
    let latest = followed;
    let changed = 0;
    // One at a time keeps within the rate limit and shows progress card by card.
    for (const key of keys) {
      const entry = latest.find((e) => e.key === key);
      if (!entry) continue;
      try {
        const next = await lookUpBill(billQuery(entry.bill), language, state, t);
        if (!next.found) throw new Error("not found");
        const update = detectUpdate(entry.bill, next) ?? entry.update;
        if (update && update !== entry.update) changed += 1;
        latest = latest.map((e) => (e.key === key ? { ...e, bill: next, checkedAt: new Date().toISOString(), update } : e));
        save(latest);
      } catch {
        setFailed((current) => new Set([...current, key]));
      } finally {
        setChecking((current) => new Set([...current].filter((k) => k !== key)));
      }
    }
    if (keys.length > 0 && changed === 0) setNotice(t.billNoChange);
  }

  const foundKey = found?.found ? billKey(found) : null;
  const isFollowing = foundKey !== null && followed.some((entry) => entry.key === foundKey);
  const updates = followed.filter((entry) => entry.update).length;

  return (
    <div className="space-y-10">
      <PageIntro title={t.navBills} intro={t.billsIntro} />

      <Reveal delay={0.05}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void search(query);
          }}
          className={`${cardClass} space-y-4`}
        >
          <label htmlFor="bill-query" className="block font-semibold">
            {t.billSearchLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="bill-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.billSearchPlaceholder}
              maxLength={300}
              disabled={searching}
              className={inputClass}
            />
            <Button type="submit" disabled={searching} className="shrink-0">
              {searching ? t.billSearching : t.billSearch}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">{t.examplesLabel}:</span>
            {t.billExamples.map((example) => (
              <Button key={example} variant="chip" type="button" disabled={searching} onClick={() => void search(example)}>
                {example}
              </Button>
            ))}
          </div>
          <ErrorMessage message={error} />
          <Collapse show={searching}>
            <div role="status" className="space-y-2 pt-1">
              <ProgressBar />
              <p className="flex justify-between gap-4 text-sm text-muted">
                <span>{t.billSearchLoading}</span>
                <span className="tabular-nums" aria-hidden>
                  {elapsed}
                </span>
              </p>
            </div>
          </Collapse>
        </form>
      </Reveal>

      <AnimatePresence mode="wait">
        {found && (
          <motion.section
            key={foundKey ?? "not-found"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={softSpring}
            className={`${cardClass} space-y-5`}
            aria-live="polite"
          >
            {found.found ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <BillHeading bill={found} t={t} />
                  <FollowButton following={isFollowing} onClick={() => toggleFollow(found)} t={t} />
                </div>
                <p className="font-serif text-lg leading-relaxed">{found.summary}</p>
                <p className="text-muted">{found.status_text}</p>
                <BillDetails bill={found} t={t} />
              </>
            ) : (
              <div className="space-y-3">
                <h2 className="font-serif text-2xl font-semibold">{t.billNotFound}</h2>
                <p>{found.not_found_message}</p>
              </div>
            )}
            {found.possible_matches.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm">
                <span className="text-muted">{t.billDidYouMean}:</span>
                {found.possible_matches.map((match) => (
                  <Button key={match} variant="chip" type="button" disabled={searching} onClick={() => void search(match)}>
                    {match}
                  </Button>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <div className="space-y-1">
            <Eyebrow>
              {followed.length} / {MAX_FOLLOWED}
            </Eyebrow>
            <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold">
              {t.billFollowedTitle}
              <AnimatePresence>
                {updates > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={spring}
                    className="grid min-w-6 place-items-center rounded-full bg-accent px-1.5 text-sm text-accent-ink"
                    aria-label={`${updates} ${t.billUpdated}`}
                  >
                    {updates}
                  </motion.span>
                )}
              </AnimatePresence>
            </h2>
          </div>
          {followed.length > 0 && (
            <Button type="button" variant="soft" onClick={() => void check(followed.map((e) => e.key))} disabled={checking.size > 0}>
              {checking.size > 0 ? t.billChecking : t.billCheckAll}
            </Button>
          )}
        </div>
        <AnimatePresence>
          {notice && (
            <motion.p
              role="status"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={softSpring}
              onAnimationComplete={() => setTimeout(() => setNotice(null), 3500)}
              className="overflow-hidden text-sm text-muted"
            >
              {notice}
            </motion.p>
          )}
        </AnimatePresence>
        {followed.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-muted">{t.billFollowedEmpty}</p>
        ) : (
          <LayoutGroup>
            <motion.ul layout className="space-y-3">
              <AnimatePresence initial={false}>
                {followed.map((entry) => (
                  <FollowedCard
                    key={entry.key}
                    entry={entry}
                    t={t}
                    language={language}
                    checking={checking.has(entry.key)}
                    failed={failed.has(entry.key)}
                    onCheck={() => void check([entry.key])}
                    onUnfollow={() => save(followed.filter((e) => e.key !== entry.key))}
                    onSeen={() => save(followed.map((e) => (e.key === entry.key ? { ...e, update: null } : e)))}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          </LayoutGroup>
        )}
        <p className="text-sm text-muted">{t.billPrivacy}</p>
      </section>
    </div>
  );
}
