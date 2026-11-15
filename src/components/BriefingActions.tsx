"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LANGUAGES, type Language } from "@/lib/i18n";
import type { Briefing } from "@/lib/schemas";
import { drawShareCard } from "@/lib/shareCard";
import { publishBriefing } from "@/lib/client";
import { ErrorMessage } from "./AskForm";
import { useCivica } from "./CivicaProvider";
import { Button, Collapse, softSpring, spring } from "./motion";

const noSubscribe = () => () => {};
const canSpeak = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;


// The parts worth hearing, in reading order. Sources and lists of links are
// left to the screen.
function readableText(b: Briefing) {
  return [
    b.title,
    b.summary,
    ...b.for_you.map((item) => `${item.who}. ${item.what_changes}`),
    ...b.watch_outs.map((item) => `${item.title}. ${item.explanation}`),
    ...b.what_it_does,
    ...b.why_it_matters,
  ];
}

// Short utterances: some browsers stop reading long ones partway through.
function chunks(parts: string[]) {
  return parts.flatMap((part) => part.split(/(?<=[.!?。])\s+/)).map((s) => s.trim()).filter(Boolean);
}

function useSpeech(language: Language) {
  const [speaking, setSpeaking] = useState(false);
  const run = useRef(0);

  useEffect(
    () => () => {
      if (canSpeak()) window.speechSynthesis.cancel();
    },
    [],
  );

  const stop = () => {
    run.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speak = (parts: string[]) => {
    stop();
    const id = run.current;
    const lang = LANGUAGES[language].voice;
    // Prefer the exact regional voice (zh-TW for Traditional Chinese), then
    // any voice for the language. Tagalog voices may be labeled "fil" or "tl".
    const voices = window.speechSynthesis.getVoices().map((v) => ({ v, code: v.lang.replace("_", "-").toLowerCase() }));
    const base = lang.split("-")[0];
    const voice = (
      voices.find(({ code }) => code === lang.toLowerCase()) ??
      voices.find(({ code }) => code.startsWith(`${base}-`) || code === base) ??
      (language === "tl" ? voices.find(({ code }) => code.startsWith("tl")) : undefined)
    )?.v;
    const sentences = chunks(parts);
    sentences.forEach((sentence, i) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      if (i === sentences.length - 1) utterance.onend = () => id === run.current && setSpeaking(false);
      utterance.onerror = () => id === run.current && setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    });
    setSpeaking(sentences.length > 0);
  };

  return { speaking, speak, stop };
}

function SpeakerIcon({ speaking }: { speaking: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M3 8h3l4-3v10l-4-3H3z" strokeLinejoin="round" />
      {speaking ? (
        <path d="M13 8l4 4m0-4l-4 4" strokeLinecap="round" />
      ) : (
        <>
          <motion.path d="M13 7.5a3.5 3.5 0 010 5" strokeLinecap="round" />
          <motion.path d="M15 5.5a6.5 6.5 0 010 9" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="3.5" width="14" height="13" rx="2" />
      <path d="M3.5 13.5l4-4 3 3 2-2 4 4" strokeLinejoin="round" />
      <circle cx="13" cy="7.5" r="1.3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M10 3v10M6.5 6.5L10 3l3.5 3.5M4 11v5h12v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PublishIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4.5h9l3 3v8H4z" />
      <path d="M7 9.5h6M7 12.5h4" />
    </svg>
  );
}

// Publishing turns this briefing into a permanent public page. It asks first,
// warns that the question becomes public, and lets the reader hide it.
function PublishPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, result } = useCivica();
  const [includeQuestion, setIncludeQuestion] = useState(true);
  const [state, setState] = useState<"idle" | "publishing" | "done">("idle");
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (!result?.publishToken) return null;
  const url = slug && typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : "";

  async function publish() {
    if (!result?.publishToken) return;
    setState("publishing");
    setError(null);
    try {
      setSlug(
        await publishBriefing(
          {
            briefing: result.briefing,
            question: result.question,
            language: result.language,
            token: result.publishToken,
            includeQuestion: includeQuestion && Boolean(result.question),
          },
          t,
        ),
      );
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
      setState("idle");
    }
  }

  return (
    <Collapse show={open}>
      <div className="mt-3 max-w-2xl space-y-4 rounded-lg border border-accent/40 bg-surface p-4 sm:p-5">
        {state === "done" && slug ? (
          <div role="status" className="space-y-3">
            <p className="flex items-center gap-2 font-semibold text-accent">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} aria-hidden>
                ✓
              </motion.span>
              {t.publishDone}
            </p>
            <p className="break-all rounded-md bg-canvas px-3 py-2 font-mono text-sm">{url}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/p/${slug}`}
                className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
              >
                {t.publishView}
              </a>
              <Button
                type="button"
                variant="soft"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    // Clipboard blocked; the link is shown above.
                  }
                }}
              >
                {copied ? t.publishCopied : t.publishCopy}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <p className="font-serif text-lg font-semibold">{t.publishTitle}</p>
              <p className="text-sm text-muted">{t.publishBody}</p>
            </div>
            {result.question && (
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeQuestion}
                    onChange={(e) => setIncludeQuestion(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                  />
                  <span>
                    {t.publishIncludeQuestion}
                    <span className="mt-1 block text-muted">“{result.question}”</span>
                  </span>
                </label>
                {includeQuestion && <p className="border-l-2 border-warn-ink/40 pl-3 text-sm text-warn-ink">{t.publishPrivacyWarning}</p>}
              </div>
            )}
            <ErrorMessage message={error} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={publish} disabled={state === "publishing"}>
                {state === "publishing" ? t.publishing : t.publishConfirm}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose} disabled={state === "publishing"}>
                {t.publishCancel}
              </Button>
            </div>
          </>
        )}
      </div>
    </Collapse>
  );
}

// Listen, Share, Image card and Publish, under a briefing's headline.
export function BriefingActions() {
  const { t, language, result } = useCivica();
  const speechSupported = useSyncExternalStore(noSubscribe, canSpeak, () => false);
  const { speaking, speak, stop } = useSpeech(language);
  const [copied, setCopied] = useState(false);
  const [making, setMaking] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  // A new briefing or language stops whatever is being read.
  const briefing = result?.briefing;
  useEffect(() => {
    if (canSpeak()) window.speechSynthesis.cancel();
  }, [briefing, language]);

  if (!result || !briefing) return null;

  async function share() {
    if (!result || !briefing) return;
    // Briefings aren't stored, so the link re-opens the question, ready to ask.
    const origin = window.location.origin;
    const url = result.question && !result.fromDocument ? `${origin}/?q=${encodeURIComponent(result.question)}` : origin;
    const text = `${t.shareIntro}: ${briefing.title}\n\n${briefing.summary}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${briefing.title} · Civica`, text, url });
      } catch {
        // Closing the share sheet rejects; nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard can be blocked; the button simply does nothing then.
    }
  }

  // An image of the briefing for social posts and group chats. Shared as a
  // file where the device allows it, otherwise downloaded.
  async function shareCard() {
    if (!result || !briefing) return;
    setMaking(true);
    try {
      const blob = await drawShareCard(briefing, {
        eyebrow: result.fromDocument ? t.documentEyebrow : t.briefingEyebrow,
        forYou: result.situations.length ? t.forYouTitle : t.forYouGeneralTitle,
        tagline: t.tagline,
        site: window.location.host,
      });
      const name = `civica-${briefing.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "briefing"}.png`;
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${briefing.title} · Civica` });
        } catch {
          // Closed the share sheet.
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setMaking(false);
    }
  }

  return (
    <div className="pt-1">
    <div className="flex flex-wrap items-center gap-2">
      {speechSupported && (
        <Button
          type="button"
          variant="soft"
          aria-pressed={speaking}
          onClick={() => (speaking ? stop() : speak(readableText(briefing)))}
          className={speaking ? "border-accent! text-accent!" : ""}
        >
          <SpeakerIcon speaking={speaking} />
          {speaking ? t.stopListening : t.listen}
          {speaking && (
            <span aria-hidden className="flex h-3 items-end gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-0.5 rounded-full bg-accent"
                  animate={{ height: ["30%", "100%", "30%"] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </span>
          )}
        </Button>
      )}
      <Button type="button" variant="soft" onClick={share}>
        <ShareIcon />
        {t.share}
      </Button>
      <Button type="button" variant="soft" onClick={shareCard} disabled={making}>
        <ImageIcon />
        {making ? t.cardMaking : t.shareCard}
      </Button>
      {result.publishToken && (
        <Button
          type="button"
          variant="soft"
          aria-expanded={publishOpen}
          onClick={() => setPublishOpen((open) => !open)}
          className={publishOpen ? "border-accent! text-accent!" : ""}
        >
          <PublishIcon />
          {t.publish}
        </Button>
      )}
      <AnimatePresence>
        {copied && (
          <motion.span
            role="status"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={softSpring}
            className="text-sm text-accent"
          >
            {t.shareCopied}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
    <PublishPanel key={briefing.title} open={publishOpen} onClose={() => setPublishOpen(false)} />
    </div>
  );
}
