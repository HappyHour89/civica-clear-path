import { CivicaError } from "@/lib/claude";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { FeedbackSchema, saveFeedback } from "@/lib/review";

// "Was this page clear?" from readers of public pages. Reviewers see it in
// the review desk; it is never shown publicly.
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "feedback", 10, 60 * 60 * 1000);
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new CivicaError("Feedback isn't available right now.", 503);
    const parsed = FeedbackSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new CivicaError("Invalid feedback.", 400);
    await saveFeedback(parsed.data);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
