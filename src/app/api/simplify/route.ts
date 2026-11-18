import { put } from "@vercel/blob";
import { z } from "zod";
import { CivicaError, research } from "@/lib/claude";
import { enforceRateLimit, errorResponse, todayIso } from "@/lib/http";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { describeRequestContext } from "@/lib/prompts";
import { getPage, isSlug, readJson, verifyBriefing } from "@/lib/publicPages";
import { BriefingSchema, SimplerSchema, type Briefing, type Simpler } from "@/lib/schemas";
import { guardAiRequest } from "@/lib/budget";

export const maxDuration = 120;

const RequestSchema = z.union([
  z.object({ slug: z.string().refine(isSlug) }),
  z.object({
    briefing: BriefingSchema,
    question: z.string().max(2000),
    language: z.enum(Object.keys(LANGUAGES) as [Language, ...Language[]]),
    token: z.string().min(10).max(200),
  }),
]);

const INSTRUCTIONS = `Retell the explanation in <explanation> so a 10-year-old could follow it.
- Keep every fact the same. Do not add facts, numbers, or claims that are not in it, and do not search unless a word is impossible to explain otherwise.
- Stay neutral: do not suggest what to think about it.
- Then give one everyday comparison that makes the main idea click, without favoring any side.`;

async function simplify(b: Briefing, language: Language): Promise<Simpler> {
  const explanation = [b.title, b.summary, ...b.what_it_does, ...b.why_it_matters].join("\n");
  const { data } = await research({
    messages: [
      {
        role: "user",
        content: [
          describeRequestContext({ language, state: null, today: todayIso() }),
          INSTRUCTIONS,
          `<explanation>\n${explanation}\n</explanation>`,
        ].join("\n\n"),
      },
    ],
    toolName: "submit_simpler",
    toolDescription: "Submit the simpler retelling and the everyday comparison.",
    schema: SimplerSchema,
    maxSearches: 1,
  });
  return data;
}

// Only text Civica wrote can be simplified: a published page (by slug) or a
// briefing carrying the server's signature. Results for pages are kept, so
// each page is simplified once.
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "simplify", 10, 10 * 60 * 1000);
    const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new CivicaError("Invalid request.", 400);
    const input = parsed.data;

    if ("slug" in input) {
      const page = await getPage(input.slug);
      if (!page) throw new CivicaError("Page not found.", 404);
      const path = `simpler/${page.slug}.json`;
      const cached = SimplerSchema.safeParse(await readJson(path).catch(() => null));
      if (cached.success) return Response.json({ simpler: cached.data });
      await guardAiRequest(request);
      const simpler = await simplify(page.briefing, page.language);
      await put(path, JSON.stringify(simpler), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      }).catch(() => undefined);
      return Response.json({ simpler });
    }

    if (!verifyBriefing({ briefing: input.briefing, question: input.question, language: input.language }, input.token)) {
      throw new CivicaError("Only explanations Civica wrote can be simplified.", 403);
    }
    await guardAiRequest(request);
    return Response.json({ simpler: await simplify(input.briefing, input.language) });
  } catch (error) {
    return errorResponse(error);
  }
}
