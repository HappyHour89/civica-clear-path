import { connection } from "next/server";
import { CivicaError } from "@/lib/claude";
import { errorResponse } from "@/lib/http";
import { readPageFresh } from "@/lib/publicPages";
import { feedbackFor, requireReviewer } from "@/lib/review";

export async function GET(request: Request) {
  // Always answer per request (never pre-built at build time).
  await connection();
  try {
    await requireReviewer();
    const slug = new URL(request.url).searchParams.get("slug") ?? "";
    const page = await readPageFresh(slug);
    if (!page) throw new CivicaError("Page not found.", 404);
    return Response.json({ page, feedback: await feedbackFor(slug) });
  } catch (error) {
    return errorResponse(error);
  }
}
