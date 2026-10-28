"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { askQuestion, fetchOfficials, type ChatTurn } from "@/lib/client";
import { DICTIONARIES, isLanguage, type Dictionary, type Language } from "@/lib/i18n";
import type { OfficialsResult } from "@/lib/officials";
import type { Briefing } from "@/lib/schemas";
import { isStateCode } from "@/lib/states";

export type AskInput = { question: string; file: File | null };

export type BriefingResult = { question: string; state: string; briefing: Briefing };

export type OfficialsState = { state: string; officials: OfficialsResult | null; error: boolean };

type CivicaContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Dictionary;
  // The user's state is remembered in this browser; the street address is not.
  state: string;
  setState: (state: string) => void;
  officials: OfficialsState | null;
  lookUpOfficials: (state: string, address: string) => Promise<void>;
  officialsLoading: boolean;
  result: BriefingResult | null;
  asking: boolean;
  // Which form the last failed request came from, so only that form shows it.
  askError: { fromDocument: boolean; message: string } | null;
  ask: (input: AskInput) => Promise<boolean>;
  turns: ChatTurn[];
  setTurns: (turns: ChatTurn[]) => void;
};

const CivicaContext = createContext<CivicaContextValue | null>(null);

const LANGUAGE_KEY = "civica.language";
const STATE_KEY = "civica.state";

function readStored(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (private mode); the app works without it.
  }
}

export function CivicaProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [state, setStateValue] = useState("");
  const [officials, setOfficials] = useState<OfficialsState | null>(null);
  const [officialsLoading, setOfficialsLoading] = useState(false);
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<CivicaContextValue["askError"]>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const t = DICTIONARIES[language];

  // Restored after hydration so server and client render the same first frame.
  useEffect(() => {
    const storedLanguage = readStored(LANGUAGE_KEY);
    const storedState = readStored(STATE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage
    if (isLanguage(storedLanguage)) setLanguageState(storedLanguage);
    if (isStateCode(storedState)) setStateValue(storedState);
  }, []);

  // Lets screen readers and browsers pick the right pronunciation and fonts.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    writeStored(LANGUAGE_KEY, next);
  }, []);

  const setState = useCallback((next: string) => {
    setStateValue(next);
    writeStored(STATE_KEY, next);
  }, []);

  const lookUpOfficials = useCallback(
    async (lookupState: string, address: string) => {
      setOfficialsLoading(true);
      try {
        const found = await fetchOfficials(lookupState, address, t, language);
        setOfficials({ state: lookupState, officials: found, error: false });
      } catch {
        setOfficials({ state: lookupState, officials: null, error: true });
      } finally {
        setOfficialsLoading(false);
      }
    },
    [t, language],
  );

  const ask = useCallback(
    async (input: AskInput) => {
      setAsking(true);
      setAskError(null);
      // Officials for a newly set state are looked up alongside the question.
      const officialsRequest =
        state && officials?.state !== state ? lookUpOfficials(state, "") : Promise.resolve();
      try {
        const [briefing] = await Promise.all([
          askQuestion({ question: input.question, file: input.file, language, state }, t),
          officialsRequest,
        ]);
        setResult({ question: input.question, state, briefing });
        setTurns([]);
        return true;
      } catch (e) {
        setAskError({ fromDocument: input.file !== null, message: e instanceof Error ? e.message : t.genericError });
        return false;
      } finally {
        setAsking(false);
      }
    },
    [state, officials, lookUpOfficials, language, t],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      state,
      setState,
      officials,
      lookUpOfficials,
      officialsLoading,
      result,
      asking,
      askError,
      ask,
      turns,
      setTurns,
    }),
    [language, setLanguage, t, state, setState, officials, lookUpOfficials, officialsLoading, result, asking, askError, ask, turns],
  );

  return <CivicaContext value={value}>{children}</CivicaContext>;
}

export function useCivica() {
  const value = useContext(CivicaContext);
  if (!value) throw new Error("useCivica must be used inside CivicaProvider");
  return value;
}
