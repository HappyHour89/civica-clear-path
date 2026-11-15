import { connection } from "next/server";
import { generateEdition, type Region } from "@/lib/editions";
import type { Language } from "@/lib/i18n";
import { cleanUpSecurityFiles } from "@/lib/security";

export const maxDuration = 300;

// Called by Vercel Cron (vercel.json) so the most-read editions are fresh
// even before anyone visits. Vercel sends CRON_SECRET as a bearer token.
const EDITIONS: [Region, Language][] = [
  ["CA", "en"],
  ["US", "en"],
];

export async function GET(request: Request) {
  // Always answer per request (never pre-built at build time).
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [cleanUp, ...results] = await Promise.allSettled([
    cleanUpSecurityFiles(),
    ...EDITIONS.map(([region, language]) => generateEdition(region, language)),
  ]);
  return Response.json({
    refreshed: results.map((r, i) => ({ edition: EDITIONS[i].join("-"), ok: r.status === "fulfilled" })),
    cleanedUp: cleanUp.status === "fulfilled" ? cleanUp.value.deleted : null,
  });
}
