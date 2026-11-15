import { connection } from "next/server";
import { list } from "@vercel/blob";
import { errorResponse } from "@/lib/http";
import { readPageFresh } from "@/lib/publicPages";
import { feedbackCounts, requireReviewer } from "@/lib/review";

// Every published page with its review status and reader feedback counts,
// newest first.
export async function GET() {
  // Always answer per request (never pre-built at build time).
  await connection();
  try {
    const reviewer = await requireReviewer();
    if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ reviewer, items: [] });
    const [{ blobs }, counts] = await Promise.all([list({ prefix: "library/", limit: 100 }), feedbackCounts()]);
    const slugs = blobs.map((b) => b.pathname.replace(/^library\/\d{13}-/, "").replace(/\.json$/, ""));
    const pages = await Promise.all(slugs.map((slug) => readPageFresh(slug)));
    const items = pages
      .filter((p) => p !== null)
      .map((p) => ({
        slug: p.slug,
        title: p.briefing.title,
        language: p.language,
        publishedAt: p.publishedAt,
        status: p.status,
        review: p.review,
        corrections: p.corrections.length,
        feedback: counts[p.slug] ?? { clear: 0, confusing: 0, error: 0 },
      }));
    return Response.json({ reviewer, items });
  } catch (error) {
    return errorResponse(error);
  }
}
