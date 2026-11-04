import type { Dictionary, Language } from "./i18n";
import type { OfficialsResult } from "./officials";
import type { Briefing, FollowUp } from "./schemas";

export type ChatTurn = { role: "user" | "assistant"; content: string; sources?: FollowUp["sources"] };

async function readJson<T>(response: Response, t: Dictionary, language: Language): Promise<T> {
  const body = await response.json().catch(() => null);
  if (response.ok && body) return body as T;
  // Server messages are English; show translated ones for the common cases.
  if (response.status === 429) throw new Error(t.errorBusy);
  if (response.status === 413) throw new Error(t.errorTooLarge);
  if (response.status === 415) throw new Error(t.errorFileType);
  const serverMessage = body && typeof body.error === "string" ? body.error : null;
  throw new Error(language === "en" && serverMessage ? serverMessage : t.genericError);
}

export async function askQuestion(
  input: { question: string; file: File | null; language: Language; state: string },
  t: Dictionary,
) {
  const form = new FormData();
  form.set("question", input.question);
  form.set("language", input.language);
  form.set("state", input.state);
  if (input.file) form.set("file", input.file);
  const response = await fetch("/api/ask", { method: "POST", body: form });
  return (await readJson<{ briefing: Briefing }>(response, t, input.language)).briefing;
}

export async function fetchOfficials(state: string, address: string, t: Dictionary, language: Language) {
  const response = await fetch("/api/officials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, address }),
  });
  return readJson<OfficialsResult>(response, t, language);
}

export async function askFollowUp(
  input: {
    language: Language;
    state: string;
    originalQuestion: string;
    briefing: Briefing;
    history: ChatTurn[];
    question: string;
  },
  t: Dictionary,
) {
  const response = await fetch("/api/followup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      state: input.state || null,
      history: input.history.map(({ role, content }) => ({ role, content })),
    }),
  });
  return (await readJson<{ answer: FollowUp }>(response, t, input.language)).answer;
}
