import { randomBytes } from "node:crypto";
import { list, put } from "@vercel/blob";
import { CivicaError } from "./claude";
import { addressHash } from "./security";

// Two limits on AI spending that hold across all of Vercel's servers (the
// in-memory limiter only sees one server). Both are counted with tiny private
// files in Blob storage, because there is no database.
//
// 1. A monthly budget. Every answered AI request records its estimated cost
//    (from its real token counts); once the month's total reaches the budget,
//    new AI requests are refused until the next month (UTC). Set the budget in
//    US dollars with MONTHLY_AI_BUDGET_USD (default 10). The newspaper only
//    refreshes while less than half of the budget is spent, so questions keep
//    the rest. Keep a spend limit in the Anthropic Console as well: this one
//    uses estimates.
// 2. A per-address limit: at most AI_CALLS_PER_HOUR AI requests per hour from
//    one internet address, across every AI feature.

const SPEND = "ai-spend/";
const CALLS = "ai-calls/";
const HOUR_MS = 3_600_000;
export const AI_CALLS_PER_HOUR = 15;

export const BUDGET_MESSAGE = "Civica has reached its AI budget for this month. Please try again next month.";

export function monthlyBudgetCents(env: Record<string, string | undefined> = process.env) {
  const usd = Number(env.MONTHLY_AI_BUDGET_USD);
  return Math.round((Number.isFinite(usd) && usd > 0 ? usd : 10) * 100);
}

const monthOf = (now: number) => new Date(now).toISOString().slice(0, 7);
const enabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// The month's total is cached for a minute per server to save storage reads.
let cached: { month: string; cents: number; at: number } | null = null;

export function resetBudgetCacheForTests() {
  cached = null;
}

export async function monthSpendCents(now = Date.now()): Promise<number> {
  if (!enabled()) return 0;
  const month = monthOf(now);
  if (cached?.month === month && now - cached.at < 60_000) return cached.cents;
  let cents = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: `${SPEND}${month}/`, limit: 1000, cursor });
    for (const blob of page.blobs) cents += Number(/-(\d+)c\.json$/.exec(blob.pathname)?.[1] ?? 0);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  cached = { month, cents, at: now };
  return cents;
}

// The cost is in the file name, so the total is read from one listing.
export async function recordSpend(usd: number | null, now = Date.now()) {
  if (!enabled() || !usd || usd <= 0) return;
  const cents = Math.max(1, Math.ceil(usd * 100));
  const month = monthOf(now);
  try {
    await put(`${SPEND}${month}/${now}-${randomBytes(3).toString("hex")}-${cents}c.json`, "{}", {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    if (cached?.month === month) cached.cents += cents;
  } catch (error) {
    console.error("Couldn't record AI spend", error instanceof Error ? error.message : error);
  }
}

// True while less than `share` of the monthly budget is spent.
export async function withinBudget(share = 1, now = Date.now()) {
  try {
    return (await monthSpendCents(now)) < monthlyBudgetCents() * share;
  } catch (error) {
    console.error("Couldn't read AI spend", error instanceof Error ? error.message : error);
    return true; // the Anthropic Console limit is the backstop
  }
}

// Call before any AI request a visitor starts. Throws 503 (budget) or 429.
export async function guardAiRequest(request: Request, now = Date.now()) {
  if (!enabled()) return;
  if (!(await withinBudget(1, now))) {
    console.warn("AI request refused: monthly budget reached", { budgetUsd: monthlyBudgetCents() / 100 });
    throw new CivicaError(BUDGET_MESSAGE, 503, "budget");
  }
  const tag = addressHash(request, "ai");
  const hour = Math.floor(now / HOUR_MS);
  try {
    const pages = await Promise.all([hour - 1, hour].map((h) => list({ prefix: `${CALLS}${h}/`, limit: 1000 })));
    const recent = pages
      .flatMap((page) => page.blobs)
      .filter((b) => b.pathname.endsWith(`-${tag}.json`) && now - new Date(b.uploadedAt).getTime() < HOUR_MS);
    if (recent.length >= AI_CALLS_PER_HOUR) {
      throw new CivicaError("You've reached the limit for now. Please try again in an hour.", 429);
    }
    await put(`${CALLS}${hour}/${now}-${randomBytes(3).toString("hex")}-${tag}.json`, "{}", {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } catch (error) {
    if (error instanceof CivicaError) throw error;
    // Storage trouble shouldn't take the site down; the in-memory limit still applies.
    console.error("Couldn't check the AI request limit", error instanceof Error ? error.message : error);
  }
}
