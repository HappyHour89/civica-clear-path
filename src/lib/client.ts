import type { Dictionary, Language } from "./i18n";
import { attachFile } from "./uploadClient";
import { DIRECT_UPLOAD_BYTES } from "./uploadLimits";
import type { OfficialsResult } from "./officials";
import type { Bill, Briefing, ChargeReport, Comparison, FollowUp } from "./schemas";

export type ChatTurn = { role: "user" | "assistant"; content: string; sources?: FollowUp["sources"] };

async function readJson<T>(response: Response, t: Dictionary, language: Language): Promise<T> {
  const body = await response.json().catch(() => null);
  if (response.ok && body) return body as T;
  throw errorFor(response.status, body && typeof body.error === "string" ? body.error : null, t, language);
}

// Server messages are English; show translated ones for the common cases.
function errorFor(status: number, serverMessage: string | null, t: Dictionary, language: Language) {
  if (status === 429) return new Error(t.errorBusy);
  if (status === 413) return new Error(t.errorTooLarge);
  if (status === 415) return new Error(t.errorFileType);
  return new Error(language === "en" && serverMessage ? serverMessage : t.genericError);
}

export type ResearchStep =
  | { type: "search"; query: string }
  | { type: "source"; url: string; title: string }
  | { type: "writing" };

type AskAnswer = { briefing: Briefing; publishToken: string | null };

export async function askQuestion(
  input: { question: string; file: File | null; language: Language; state: string; situations: string[] },
  t: Dictionary,
  onStep?: (step: ResearchStep) => void,
): Promise<AskAnswer> {
  const form = new FormData();
  form.set("question", input.question);
  form.set("language", input.language);
  form.set("state", input.state);
  if (input.situations.length) form.set("situations", input.situations.join(","));
  if (input.file) await attachFile(form, "file", input.file, t);
  form.set("stream", "1");
  const response = await fetch("/api/ask", { method: "POST", body: form });
  const streamed = response.headers.get("Content-Type")?.includes("ndjson");
  if (!response.ok || !streamed || !response.body) return readJson<AskAnswer>(response, t, input.language);

  // One JSON object per line: progress steps, then "done" or "error".
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += value ?? "";
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      let event: { type?: unknown; [key: string]: unknown };
      try {
        event = JSON.parse(line);
      } catch {
        continue; // blank keep-alive lines
      }
      if (event.type === "done") return { briefing: event.briefing as Briefing, publishToken: (event.publishToken as string) ?? null };
      if (event.type === "error") {
        const message = typeof event.message === "string" ? event.message : null;
        throw errorFor(Number(event.status) || 500, message, t, input.language);
      }
      if (event.type === "search" || event.type === "source" || event.type === "writing") onStep?.(event as ResearchStep);
    }
    if (done) throw new Error(t.genericError);
  }
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

export async function joinWaitlist(email: string, language: Language, t: Dictionary) {
  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, language }),
  });
  await readJson<{ ok: true }>(response, t, language);
}

export async function startCheckout(
  input: { plan: "once" } | { plan: "monthly"; amount: number },
  t: Dictionary,
  language: Language,
) {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const { url } = await readJson<{ url: string }>(response, t, language);
  // Only ever send donors to Stripe's own checkout page.
  if (!url.startsWith("https://checkout.stripe.com/")) throw new Error(t.genericError);
  return url;
}

export type VersionInput = { file: File | null; text: string };

export async function compareVersions(
  input: { before: VersionInput; after: VersionInput; language: Language; state: string; situations: string[] },
  t: Dictionary,
) {
  const form = new FormData();
  for (const [name, side] of [["before", input.before], ["after", input.after]] as const) {
    if (side.file) await attachFile(form, name, side.file, t, DIRECT_UPLOAD_BYTES / 2);
    else form.set(`${name}Text`, side.text);
  }
  form.set("language", input.language);
  form.set("state", input.state);
  if (input.situations.length) form.set("situations", input.situations.join(","));
  const response = await fetch("/api/compare", { method: "POST", body: form });
  return (await readJson<{ comparison: Comparison }>(response, t, input.language)).comparison;
}

export async function lookUpBill(query: string, language: Language, state: string, t: Dictionary) {
  const response = await fetch("/api/bill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, language, state: state || null }),
  });
  return (await readJson<{ bill: Bill }>(response, t, language)).bill;
}

export async function explainCharges(
  input: { file: File | null; text: string; note: string; language: Language; state: string; situations: string[] },
  t: Dictionary,
) {
  const form = new FormData();
  if (input.file) await attachFile(form, "file", input.file, t);
  else form.set("text", input.text);
  form.set("note", input.note);
  form.set("language", input.language);
  form.set("state", input.state);
  if (input.situations.length) form.set("situations", input.situations.join(","));
  const response = await fetch("/api/charges", { method: "POST", body: form });
  return (await readJson<{ report: ChargeReport }>(response, t, input.language)).report;
}

export async function publishBriefing(
  input: { briefing: Briefing; question: string; language: Language; token: string; includeQuestion: boolean },
  t: Dictionary,
) {
  const response = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, consent: true }),
  });
  return (await readJson<{ slug: string }>(response, t, input.language)).slug;
}
