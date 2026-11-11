import type Anthropic from "@anthropic-ai/sdk";
import { CivicaError, research } from "@/lib/claude";
import { enforceRateLimit, errorResponse, todayIso } from "@/lib/http";
import { isLanguage } from "@/lib/i18n";
import { describeRequestContext } from "@/lib/prompts";
import { CompareSchema } from "@/lib/schemas";
import { parseSituations } from "@/lib/situations";
import { verifySources } from "@/lib/sources";
import { isStateCode } from "@/lib/states";
import { fileToContentBlock, MAX_UPLOAD_BYTES } from "@/lib/upload";

export const maxDuration = 300;

const MAX_PASTED_CHARS = 60_000;

const INSTRUCTIONS = `The user gave two versions of the same document: VERSION A is the OLDER one and VERSION B is the NEWER one. Compare them.
- In changes, list every meaningful difference, most significant first (at most 25). Quote the wording word for word from each version in before and after. Ignore formatting, renumbering, and typo fixes unless they change the meaning.
- Explain what each change means in practice and who it affects. Describe changes; never call them good or bad, and never say whether to sign or accept.
- In for_you, say what the changes mean for the reader's situations if any are listed, otherwise for the groups most affected.
- If the two are not versions of the same document, set same_document to false, explain in mismatch_note, and leave changes empty.
- Search the web only if you need outside context (for example, what a referenced law says).`;

type Side = { block: Anthropic.Beta.BetaContentBlockParam; bytes: number };

async function readSide(form: FormData, name: "before" | "after"): Promise<Side | null> {
  const file = form.get(name);
  if (file instanceof File && file.size > 0) return { block: await fileToContentBlock(file), bytes: file.size };
  const text = String(form.get(`${name}Text`) ?? "").trim();
  if (!text) return null;
  if (text.length > MAX_PASTED_CHARS) {
    throw new CivicaError("Pasted text is too long. Paste a shorter section (about 20 pages or less).", 413);
  }
  return {
    block: { type: "document", title: name === "before" ? "Older version" : "Newer version", source: { type: "text", media_type: "text/plain", data: text } },
    bytes: text.length,
  };
}

// Compares an older and a newer version of a document: each side is an
// uploaded file or pasted text.
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "compare", 6, 10 * 60 * 1000);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new CivicaError("Invalid form submission.", 400);
    }
    const language = form.get("language");
    if (!isLanguage(language)) throw new CivicaError("Unsupported language.", 400);
    const state = form.get("state");

    const [before, after] = await Promise.all([readSide(form, "before"), readSide(form, "after")]);
    if (!before || !after) throw new CivicaError("Add both versions: the older one and the newer one.", 400);
    if (before.bytes + after.bytes > MAX_UPLOAD_BYTES) {
      throw new CivicaError("Together the two versions must be 4 MB or smaller.", 413);
    }

    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      { type: "text", text: "VERSION A (older):" },
      before.block,
      { type: "text", text: "VERSION B (newer):" },
      after.block,
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
        ].join("\n\n"),
      },
    ];

    const { data, searchedUrls, pageAges } = await research({
      messages: [{ role: "user", content }],
      toolName: "submit_comparison",
      toolDescription: "Submit the finished, neutral comparison of the two document versions.",
      schema: CompareSchema,
      maxSearches: 3,
    }).catch((error) => {
      if (error instanceof CivicaError && error.status === 400) {
        throw new CivicaError("The files couldn't be processed. Try smaller or different ones, or paste the text.", 400);
      }
      throw error;
    });

    const sources = verifySources(data.sources, searchedUrls, pageAges);
    const sourceIds = new Set(sources.map((s) => s.id));
    const comparison = {
      ...data,
      sources,
      changes: data.same_document ? data.changes.slice(0, 25) : [],
      for_you: data.for_you.map((item) => ({ ...item, source_ids: item.source_ids.filter((id) => sourceIds.has(id)) })),
    };
    return Response.json({ comparison });
  } catch (error) {
    return errorResponse(error);
  }
}
