import { put } from "@vercel/blob";
import { research } from "./claude";
import { todayIso } from "./http";
import { describeRequestContext } from "./prompts";
import { readJson } from "./publicPages";
import { EditionSchema, type Edition } from "./schemas";
import { SITUATIONS } from "./situations";
import { isSafeHttpUrl, verifySources } from "./sources";
import { isStateCode, US_STATES } from "./states";
import { isLanguage, type Language } from "./i18n";

// The personal newspaper. One edition per place (a state, or "US" for the
// national edition) and language, shared by every reader there, kept in the
// private Blob store and rewritten when it is older than FRESH_FOR. A reader's
// own situations, followed bills, and language personalize it in the browser.

export const FRESH_FOR_MS = 3 * 60 * 60 * 1000;
// A refresh that started this recently is still running; don't start another.
const LOCK_FOR_MS = 6 * 60 * 1000;

export type Region = "US" | keyof typeof US_STATES;

export type StoredEdition = { region: Region; language: Language; generatedAt: string; edition: Edition };

export function isRegion(value: unknown): value is Region {
  return value === "US" || isStateCode(value);
}

export function parseEditionKey(region: unknown, language: unknown) {
  return isRegion(region) && isLanguage(language) ? { region, language } : null;
}

const path = (region: Region, language: Language) => `editions/${region}-${language}.json`;
const lockPath = (region: Region, language: Language) => `editions/${region}-${language}.lock.json`;

export async function readEdition(region: Region, language: Language): Promise<StoredEdition | null> {
  const value = (await readJson(path(region, language), true).catch(() => null)) as StoredEdition | null;
  return value && EditionSchema.safeParse(value.edition).success ? value : null;
}

export function isFresh(stored: StoredEdition | null, now = Date.now()) {
  return Boolean(stored && now - new Date(stored.generatedAt).getTime() < FRESH_FOR_MS);
}

// Claims the right to refresh this edition, unless another refresh is under
// way. Best effort: two simultaneous claims can both win, which only costs an
// extra refresh.
export async function claimRefresh(region: Region, language: Language, now = Date.now()) {
  const lock = (await readJson(lockPath(region, language), true).catch(() => null)) as { at?: number } | null;
  if (lock?.at && now - lock.at < LOCK_FOR_MS) return false;
  await put(lockPath(region, language), JSON.stringify({ at: now }), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return true;
}

function instructions(region: Region) {
  const place = region === "US" ? "the United States as a whole" : `${US_STATES[region]}`;
  const local =
    region === "US"
      ? "Focus on federal developments, with a few notable state actions that affect many people."
      : `Cover three levels: federal actions that matter to people in ${place}; the ${place} legislature, governor, agencies, and state courts; and local government in ${place}'s largest cities and counties (city councils, county boards, school boards, water and utility districts, rent and housing boards).`;
  return `You are the editor of Civica, a nonpartisan civic newspaper, writing today's edition for readers in ${place}.
- Search the web for the most consequential government and civic developments of the past 7 days. ${local}
- Prefer official sources (government sites, court opinions, agendas and minutes) and established news organizations. Every story must cite at least one source you retrieved.
- Write neutral headlines and plain sentences a 9th grader could follow. Describe what happened and what it changes; never say whether it is good or bad, and never use one side's loaded terms.
- In affects, use only these ids: ${Object.keys(SITUATIONS).join(", ")}.
- In upcoming, list only real hearings, votes, comment deadlines, or elections in the next 30 days that you found, with how the public can take part.
- Never invent events, dates, numbers, or quotes. If little happened at one level, write fewer stories rather than padding.`;
}

export async function generateEdition(region: Region, language: Language): Promise<StoredEdition> {
  const { data, searchedUrls, pageAges } = await research({
    messages: [
      {
        role: "user",
        content: [
          describeRequestContext({ language, state: region === "US" ? null : region, today: todayIso() }),
          instructions(region),
        ].join("\n\n"),
      },
    ],
    toolName: "submit_edition",
    toolDescription: "Submit today's finished, neutral edition.",
    schema: EditionSchema,
    maxSearches: 10,
  });
  const sources = verifySources(data.sources, searchedUrls, pageAges);
  const ids = new Set(sources.map((s) => s.id));
  const situationIds = new Set(Object.keys(SITUATIONS));
  const clean = (story: Edition["lead"]) => ({
    ...story,
    affects: story.affects.filter((a) => situationIds.has(a)),
    source_ids: story.source_ids.filter((id) => ids.has(id)),
  });
  // A story with no verified source is dropped rather than printed.
  const stories = data.stories.map(clean).filter((s) => s.source_ids.length > 0).slice(0, 8);
  const lead = clean(data.lead);
  const edition: Edition = {
    lead: lead.source_ids.length > 0 ? lead : (stories.shift() ?? lead),
    stories,
    upcoming: data.upcoming.slice(0, 6),
    quick_hits: data.quick_hits.slice(0, 5),
    sources: sources.filter((s) => isSafeHttpUrl(s.url)),
  };
  const stored: StoredEdition = { region, language, generatedAt: new Date().toISOString(), edition };
  await put(path(region, language), JSON.stringify(stored), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return stored;
}
