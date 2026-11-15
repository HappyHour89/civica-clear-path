import type Anthropic from "@anthropic-ai/sdk";
import { CivicaError, research } from "@/lib/claude";
import { enforceRateLimit, errorResponse, todayIso } from "@/lib/http";
import { isLanguage } from "@/lib/i18n";
import { describeRequestContext } from "@/lib/prompts";
import { ChargeSchema } from "@/lib/schemas";
import { parseSituations } from "@/lib/situations";
import { normalizeUrl, verifySources } from "@/lib/sources";
import { isStateCode } from "@/lib/states";
import { fileToContentBlock } from "@/lib/upload";

export const maxDuration = 300;

const MAX_PASTED_CHARS = 40_000;
const MAX_NOTE_CHARS = 500;

const INSTRUCTIONS = `The user uploaded a bill, notice, or statement they received (for example a water bill, rent increase notice, property tax bill, utility bill, parking ticket, or school fee statement). Explain why it costs what it does.
- List each meaningful charge in line_items, in the order printed, and say plainly what it pays for.
- For every charge, find out who sets it. Search for the public decision behind charges set or approved by government: city council or water district rate resolutions, county tax rates, voter-approved measures, state utility commission rate cases, school board fees, rent board rules. Give the body, what it decided, the date, and the vote count only when your sources show them. Never guess a vote or a date.
- If a charge is set by a private company or a contract, say so, and name any public regulator that oversees it.
- In who_decides, list those public bodies, their next meeting if you can find it, and how a member of the public can comment.
- Describe; never say whether a charge is fair or too high.
- PRIVACY: never repeat the person's name, street address, account number, meter number, parcel number, or any other identifying detail from the document.`;

// Explains a bill or statement charge by charge and traces each charge to the
// public decision behind it. The upload is read once and not stored.
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "charges", 6, 10 * 60 * 1000);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new CivicaError("Invalid form submission.", 400);
    }
    const language = form.get("language");
    if (!isLanguage(language)) throw new CivicaError("Unsupported language.", 400);
    const state = form.get("state");
    const note = String(form.get("note") ?? "").trim().slice(0, MAX_NOTE_CHARS);

    const file = form.get("file");
    const text = String(form.get("text") ?? "").trim();
    let document: Anthropic.Beta.BetaContentBlockParam;
    if (file instanceof File && file.size > 0) {
      document = await fileToContentBlock(file);
    } else if (text) {
      if (text.length > MAX_PASTED_CHARS) throw new CivicaError("That text is too long. Paste just the bill.", 413);
      document = { type: "document", title: "Pasted bill", source: { type: "text", media_type: "text/plain", data: text } };
    } else {
      throw new CivicaError("Upload a bill or paste its text.", 400);
    }

    const { data, searchedUrls, pageAges } = await research({
      messages: [
        {
          role: "user",
          content: [
            document,
            {
              type: "text",
              text: [
                describeRequestContext({
                  language,
                  state: isStateCode(state) ? state : null,
                  today: todayIso(),
                  situations: parseSituations(form.get("situations")),
                }),
                INSTRUCTIONS,
                note ? `<reader_note>\n${note}\n</reader_note>` : "",
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
        },
      ],
      toolName: "submit_charge_report",
      toolDescription: "Submit the finished, neutral explanation of the bill's charges.",
      schema: ChargeSchema,
      maxSearches: 6,
    }).catch((error) => {
      if (error instanceof CivicaError && error.status === 400) {
        throw new CivicaError("The file couldn't be processed. Try a clearer photo, a PDF, or paste the text.", 400);
      }
      throw error;
    });

    const sources = verifySources(data.sources, searchedUrls, pageAges);
    const ids = new Set(sources.map((s) => s.id));
    const searched = (url: string) => searchedUrls.has(normalizeUrl(url) ?? "");
    const report = {
      ...data,
      sources,
      line_items: data.line_items.slice(0, 30).map((item) => ({ ...item, source_ids: item.source_ids.filter((id) => ids.has(id)) })),
      who_decides: data.who_decides.slice(0, 8).map((body) => ({ ...body, url: searched(body.url) ? body.url : "" })),
      for_you: data.for_you.map((item) => ({ ...item, source_ids: item.source_ids.filter((id) => ids.has(id)) })),
    };
    return Response.json({ report });
  } catch (error) {
    return errorResponse(error);
  }
}
