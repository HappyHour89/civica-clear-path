import { revalidateTag } from "next/cache";
import { z } from "zod";
import { CivicaError } from "@/lib/claude";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { isSlug, readPageFresh, writePage, type PublishedPage } from "@/lib/publicPages";
import { CHECKLIST, requireReviewer } from "@/lib/review";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ slug: z.string(), action: z.literal("approve"), checklist: z.array(z.enum(CHECKLIST)) }),
  z.object({ slug: z.string(), action: z.literal("unapprove") }),
  z.object({ slug: z.string(), action: z.literal("correction"), text: z.string().trim().min(3).max(1500) }),
  z.object({ slug: z.string(), action: z.literal("note"), text: z.string().trim().max(1500) }),
  z.object({ slug: z.string(), action: z.literal("simplify"), text: z.string().trim().max(2000) }),
]);

// Everything a reviewer can do to a page. Each change is stamped with the
// reviewer's name and time in the page's public history.
export async function POST(request: Request) {
  try {
    const reviewer = await requireReviewer();
    enforceRateLimit(request, `review-action:${reviewer}`, 60, 10 * 60 * 1000);
    const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !isSlug(parsed.data.slug)) throw new CivicaError("Invalid review action.", 400);
    const input = parsed.data;
    const page = await readPageFresh(input.slug);
    if (!page) throw new CivicaError("Page not found.", 404);

    const at = new Date().toISOString();
    const stamp = (note: string) => ({ at, note, by: reviewer });
    let next: PublishedPage;
    switch (input.action) {
      case "approve":
        if (CHECKLIST.some((item) => !input.checklist.includes(item))) {
          throw new CivicaError("Check every item before approving.", 400);
        }
        next = { ...page, status: "reviewed", review: { by: reviewer, at, checklist: [...CHECKLIST] }, history: [...page.history, stamp("reviewed")] };
        break;
      case "unapprove":
        next = { ...page, status: "ai_draft", review: null, history: [...page.history, stamp("unreviewed")] };
        break;
      case "correction":
        next = { ...page, corrections: [...page.corrections, { at, text: input.text, by: reviewer }], history: [...page.history, stamp("corrected")] };
        break;
      case "note":
        next = { ...page, reviewerNote: input.text, history: [...page.history, stamp("noted")] };
        break;
      case "simplify":
        next = { ...page, simplerSummary: input.text, history: [...page.history, stamp("simplified")] };
        break;
    }
    await writePage(next);
    revalidateTag(`page-${page.slug}`, { expire: 0 });
    return Response.json({ page: next });
  } catch (error) {
    return errorResponse(error);
  }
}
