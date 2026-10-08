import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CivicaError, research } from "@/lib/claude";
import { enforceRateLimit, errorResponse, todayIso } from "@/lib/http";
import { LANGUAGES } from "@/lib/i18n";
import { describeRequestContext } from "@/lib/prompts";
import { BriefingSchema, FollowUpSchema } from "@/lib/schemas";
import { keepVerifiedSources } from "@/lib/sources";
import { isStateCode } from "@/lib/states";

export const maxDuration = 300;

const MAX_BODY_BYTES = 300_000;

const RequestSchema = z.object({
  language: z.enum(Object.keys(LANGUAGES) as [keyof typeof LANGUAGES]),
  state: z.string().nullable(),
  originalQuestion: z.string().max(2000),
  briefing: BriefingSchema,
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20_000) }))
    .max(20),
  question: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "followup", 30, 10 * 60 * 1000);

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new CivicaError("This conversation is too long. Start a new question.", 413);
    let body: z.infer<typeof RequestSchema>;
    try {
      body = RequestSchema.parse(JSON.parse(raw));
    } catch {
      throw new CivicaError("Invalid follow-up request.", 400);
    }

    const context = describeRequestContext({
      language: body.language,
      state: isStateCode(body.state) ? body.state : null,
      today: todayIso(),
    });
    // The server keeps no conversation state; the browser sends the
    // conversation so far with each follow-up.
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      {
        role: "user",
        content: [
          context,
          "Earlier in this conversation the user asked the question below and received the briefing that follows it.",
          `<original_question>\n${body.originalQuestion || "(the user uploaded a document)"}\n</original_question>`,
          `<previous_briefing>\n${JSON.stringify(body.briefing)}\n</previous_briefing>`,
        ].join("\n\n"),
      },
      ...body.history.map((turn) => ({ role: turn.role, content: turn.content })),
      {
        role: "user",
        content: `Answer this follow-up question with the same neutrality rules. Search to verify any new facts.\n\n<user_question>\n${body.question}\n</user_question>`,
      },
    ];

    const { data, searchedUrls } = await research({
      messages,
      toolName: "submit_answer",
      toolDescription: "Submit the finished, neutral answer to the user's follow-up question.",
      schema: FollowUpSchema,
      maxSearches: 4,
    });
    return Response.json({ answer: { ...data, sources: keepVerifiedSources(data.sources, searchedUrls) } });
  } catch (error) {
    return errorResponse(error);
  }
}
