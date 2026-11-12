import { z } from "zod";
import { CivicaError, research } from "@/lib/claude";
import { enforceRateLimit, errorResponse, todayIso } from "@/lib/http";
import { LANGUAGES } from "@/lib/i18n";
import { describeRequestContext } from "@/lib/prompts";
import { BillSchema } from "@/lib/schemas";
import { normalizeUrl, verifySources } from "@/lib/sources";
import { isStateCode } from "@/lib/states";

export const maxDuration = 300;

const RequestSchema = z.object({
  query: z.string().trim().min(2).max(300),
  language: z.enum(Object.keys(LANGUAGES) as [keyof typeof LANGUAGES]),
  state: z.string().nullable().optional(),
});

const INSTRUCTIONS = `Find the bill described in <bill_request> and report its CURRENT status.
- Search official sources first: congress.gov for federal bills, the state legislature's own website for state bills. Use news only to fill gaps.
- Report the most recent action you can verify, with its date. Never guess a status or date; if you can't verify it, use stage "unknown" and say so in status_text.
- If several bills match (for example the same number in different sessions or states), pick the current-session bill the reader most likely means and list the others in possible_matches. If none can be verified, set found to false.
- Describe the bill and its progress neutrally. Never say whether it should pass.`;

// Looks up one bill's current status. Followed bills live in the reader's
// browser; this is called to find a bill and again to check it for updates.
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "bill", 12, 10 * 60 * 1000);
    let body: z.infer<typeof RequestSchema>;
    try {
      body = RequestSchema.parse(await request.json());
    } catch {
      throw new CivicaError("Type a bill number or name.", 400);
    }

    const { data, searchedUrls, pageAges } = await research({
      messages: [
        {
          role: "user",
          content: [
            describeRequestContext({
              language: body.language,
              state: isStateCode(body.state) ? body.state : null,
              today: todayIso(),
            }),
            INSTRUCTIONS,
            `<bill_request>\n${body.query}\n</bill_request>`,
          ].join("\n\n"),
        },
      ],
      toolName: "submit_bill_status",
      toolDescription: "Submit the bill's verified current status.",
      schema: BillSchema,
      maxSearches: 5,
    });

    const bill = {
      ...data,
      sources: verifySources(data.sources, searchedUrls, pageAges),
      // Only a page the search actually returned, never an invented link.
      official_url: searchedUrls.has(normalizeUrl(data.official_url) ?? "") ? data.official_url : "",
      timeline: [...data.timeline].sort((a, b) => a.date.localeCompare(b.date)).slice(-8),
      possible_matches: data.possible_matches.slice(0, 4),
    };
    return Response.json({ bill });
  } catch (error) {
    return errorResponse(error);
  }
}
