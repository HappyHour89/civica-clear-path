import type Anthropic from "@anthropic-ai/sdk";
import { CivicaError, research, type ResearchProgress } from "@/lib/claude";
import { enforceRateLimit, errorResponse, todayIso } from "@/lib/http";
import { isLanguage, type Language } from "@/lib/i18n";
import { describeRequestContext } from "@/lib/prompts";
import { BriefingSchema } from "@/lib/schemas";
import { signBriefing } from "@/lib/publicPages";
import { parseSituations } from "@/lib/situations";
import { isSafeHttpUrl, verifySources } from "@/lib/sources";
import { isStateCode } from "@/lib/states";
import { fileToContentBlock } from "@/lib/upload";

export const maxDuration = 300;

const MAX_QUESTION_CHARS = 2000;

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "ask", 8, 10 * 60 * 1000);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new CivicaError("Invalid form submission.", 400);
    }
    const question = String(form.get("question") ?? "").trim();
    const language = form.get("language");
    const state = form.get("state");
    const file = form.get("file");
    const situations = parseSituations(form.get("situations"));

    if (!isLanguage(language)) throw new CivicaError("Unsupported language.", 400);
    if (question.length > MAX_QUESTION_CHARS) {
      throw new CivicaError(`Questions must be under ${MAX_QUESTION_CHARS} characters.`, 400);
    }
    const hasFile = file instanceof File && file.size > 0;
    if (!question && !hasFile) throw new CivicaError("Type a question or upload a file.", 400);

    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (hasFile) content.push(await fileToContentBlock(file));
    content.push({
      type: "text",
      text: [
        describeRequestContext({ language, state: isStateCode(state) ? state : null, today: todayIso(), situations }),
        hasFile ? "The user uploaded the document above. Explain what it is and what it means for them." : "",
        `<user_question>\n${question || "Please explain this document."}\n</user_question>`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });

    const answer = (onProgress?: (event: ResearchProgress) => void) =>
      buildBriefing({ content, question, language, hasFile, onProgress });

    // stream=1: send each search and source as a line of JSON while the
    // research runs, then the finished briefing as the last line.
    if (form.get("stream") === "1") return streamAnswer(answer);
    return Response.json(await answer());
  } catch (error) {
    return errorResponse(error);
  }
}

type BriefingAnswer = Awaited<ReturnType<typeof buildBriefing>>;

type StreamLine =
  | ResearchProgress
  | ({ type: "done" } & BriefingAnswer)
  | { type: "error"; message: string; status: number };

function streamAnswer(answer: (onProgress: (event: ResearchProgress) => void) => Promise<BriefingAnswer>) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: StreamLine | null) => {
        try {
          controller.enqueue(encoder.encode(line ? JSON.stringify(line) + "\n" : "\n"));
        } catch {
          // The reader left the page; the research still finishes quietly.
        }
      };
      // A blank line now and then keeps proxies from closing a quiet connection.
      const heartbeat = setInterval(() => send(null), 15_000);
      try {
        send({ type: "done", ...(await answer(send)) });
      } catch (error) {
        const response = errorResponse(error);
        const { error: message } = (await response.json()) as { error: string };
        send({ type: "error", message, status: response.status });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function buildBriefing(input: {
  content: Anthropic.Beta.BetaContentBlockParam[];
  question: string;
  language: Language;
  hasFile: boolean;
  onProgress?: (event: ResearchProgress) => void;
}) {
  const { content, question, language, hasFile, onProgress } = input;
  const { data, searchedUrls, pageAges } = await research({
    messages: [{ role: "user", content }],
    toolName: "submit_briefing",
    toolDescription: "Submit the finished, neutral civic briefing for the user's question.",
    schema: BriefingSchema,
    maxSearches: 6,
    onProgress,
  }).catch((error) => {
    // A rejected request with a file attached is most often the file itself.
    if (hasFile && error instanceof CivicaError && error.status === 400) {
      throw new CivicaError("The file couldn't be processed. Try a smaller or different one.", 400);
    }
    throw error;
  });

  const sources = verifySources(data.sources, searchedUrls, pageAges);
  const sourceIds = new Set(sources.map((s) => s.id));
  const briefing = {
    ...data,
    sources,
    key_facts: data.key_facts.map((fact) => ({
      ...fact,
      source_ids: fact.source_ids.filter((id) => sourceIds.has(id)),
    })),
    // Only an uploaded document has clauses to quote.
    watch_outs: hasFile ? data.watch_outs.slice(0, 6) : [],
    for_you: data.for_you.map((item) => ({
      ...item,
      source_ids: item.source_ids.filter((id) => sourceIds.has(id)),
    })),
    helpful_websites: data.helpful_websites.filter((site) => isSafeHttpUrl(site.url)),
  };
  // Typed questions can be published as public pages; uploads never can.
  const publishToken = !hasFile && briefing.in_scope ? signBriefing({ briefing, question, language }) : null;
  return { briefing, publishToken };
}
