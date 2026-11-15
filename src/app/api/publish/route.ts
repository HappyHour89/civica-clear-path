import { revalidateTag } from "next/cache";
import { z } from "zod";
import { CivicaError } from "@/lib/claude";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { savePage, slugFor, verifyBriefing, type PublishedPage } from "@/lib/publicPages";
import { BriefingSchema } from "@/lib/schemas";

const MAX_BODY_BYTES = 400_000;

const RequestSchema = z.object({
  briefing: BriefingSchema,
  question: z.string().max(2000),
  language: z.enum(Object.keys(LANGUAGES) as [Language, ...Language[]]),
  token: z.string().min(10).max(200),
  includeQuestion: z.boolean(),
  consent: z.literal(true),
});

// Turns a briefing Civica produced into a permanent public page, when the
// reader asks. Only signed, unedited briefings are accepted.
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "publish", 5, 60 * 60 * 1000);
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new CivicaError("Publishing isn't available right now.", 503);
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new CivicaError("This briefing is too large to publish.", 413);
    let body: z.infer<typeof RequestSchema>;
    try {
      body = RequestSchema.parse(JSON.parse(raw));
    } catch {
      throw new CivicaError("Invalid publish request.", 400);
    }
    if (!body.briefing.in_scope) throw new CivicaError("This briefing can't be published.", 400);
    if (!verifyBriefing({ briefing: body.briefing, question: body.question, language: body.language }, body.token)) {
      throw new CivicaError("Only briefings Civica produced, unchanged, can be published.", 403);
    }

    const now = new Date().toISOString();
    const page: PublishedPage = {
      slug: slugFor(body.briefing.title),
      language: body.language,
      question: body.includeQuestion ? body.question : "",
      briefing: body.briefing,
      publishedAt: now,
      status: "ai_draft",
      history: [{ at: now, note: "published" }],
      corrections: [],
      review: null,
      reviewerNote: "",
      simplerSummary: "",
    };
    try {
      await savePage(page);
    } catch (error) {
      console.error("Publish failed", error instanceof Error ? error.message : error);
      throw new CivicaError("Couldn't publish right now. Please try again.", 503);
    }
    revalidateTag("library", "max");
    return Response.json({ slug: page.slug });
  } catch (error) {
    return errorResponse(error);
  }
}
