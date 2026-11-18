import { after, connection } from "next/server";
import { CivicaError } from "@/lib/claude";
import { claimRefresh, generateEdition, isFresh, parseEditionKey, readEdition } from "@/lib/editions";
import { errorResponse } from "@/lib/http";
import { withinBudget } from "@/lib/budget";

export const maxDuration = 300;

// Returns the current edition for a place and language straight away. If it
// is missing or more than a few hours old, a fresh one is written in the
// background (after the response is sent); the page polls and swaps it in.
export async function GET(request: Request) {
  // Always answer per request (never pre-built at build time).
  await connection();
  try {
    const params = new URL(request.url).searchParams;
    const key = parseEditionKey(params.get("region"), params.get("lang"));
    if (!key) throw new CivicaError("Unknown edition.", 400);
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new CivicaError("The newspaper isn't available right now.", 503);

    const stored = await readEdition(key.region, key.language);
    const fresh = isFresh(stored);
    let refreshing = false;
    // The newspaper may use at most half the monthly AI budget.
    const affordable = !fresh && (await withinBudget(0.5));
    if (affordable && (await claimRefresh(key.region, key.language))) {
      refreshing = true;
      after(async () => {
        try {
          await generateEdition(key.region, key.language);
        } catch (error) {
          console.error("Edition refresh failed", key, error instanceof Error ? error.message : error);
        }
      });
    } else if (!fresh && affordable) {
      refreshing = true; // another request is already writing it
    }
    return Response.json(
      { stored, refreshing },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
