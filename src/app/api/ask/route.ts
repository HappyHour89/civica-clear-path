import type Anthropic from "@anthropic-ai/sdk";
import { CivicaError, research } from "@/lib/claude";
import { enforceRateLimit, errorResponse, todayIso } from "@/lib/http";
import { isLanguage } from "@/lib/i18n";
import { describeRequestContext } from "@/lib/prompts";
import { BriefingSchema } from "@/lib/schemas";
import { isSafeHttpUrl, keepVerifiedSources } from "@/lib/sources";
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
        describeRequestContext({ language, state: isStateCode(state) ? state : null, today: todayIso() }),
        hasFile ? "The user uploaded the document above. Explain what it is and what it means for them." : "",
        `<user_question>\n${question || "Please explain this document."}\n</user_question>`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });

    const { data, searchedUrls } = await research({
      messages: [{ role: "user", content }],
      toolName: "submit_briefing",
      toolDescription: "Submit the finished, neutral civic briefing for the user's question.",
      schema: BriefingSchema,
      maxSearches: 6,
    });

    const sources = keepVerifiedSources(data.sources, searchedUrls);
    const sourceIds = new Set(sources.map((s) => s.id));
    const briefing = {
      ...data,
      sources,
      key_facts: data.key_facts.map((fact) => ({
        ...fact,
        source_ids: fact.source_ids.filter((id) => sourceIds.has(id)),
      })),
      helpful_websites: data.helpful_websites.filter((site) => isSafeHttpUrl(site.url)),
    };
    return Response.json({ briefing });
  } catch (error) {
    return errorResponse(error);
  }
}
