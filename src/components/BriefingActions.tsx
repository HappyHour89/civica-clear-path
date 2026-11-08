"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Language } from "@/lib/i18n";
import type { Briefing } from "@/lib/schemas";
import { useCivica } from "./CivicaProvider";
import { Button, softSpring } from "./motion";

const noSubscribe = () => () => {};
const canSpeak = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

const VOICE_LANG: Record<Language, string> = { en: "en-US", ko: "ko-KR" };

// The parts worth hearing, in reading order. Sources and lists of links are
// left to the screen.
function readableText(b: Briefing) {
  return [
    b.title,
    b.summary,
    ...b.for_you.map((item) => `${item.who}. ${item.what_changes}`),
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
    const lang = VOICE_LANG[language];
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith(lang.slice(0, 2)));
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

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M10 3v10M6.5 6.5L10 3l3.5 3.5M4 11v5h12v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Listen and Share, under a briefing's headline.
export function BriefingActions() {
  const { t, language, result } = useCivica();
  const speechSupported = useSyncExternalStore(noSubscribe, canSpeak, () => false);
  const { speaking, speak, stop } = useSpeech(language);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
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
  );
}
