import type Anthropic from "@anthropic-ai/sdk";
import type { Source, SourceType } from "./schemas";

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeUrl(value: string): string | null {
  if (!isSafeHttpUrl(value)) return null;
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");
  return `${host}${path}${url.search}`;
}

// Records every URL the model's web searches returned, and the page date the
// search engine reported for it (`pageAges`), when there is one.
export function collectSearchResultUrls(
  content: Anthropic.Beta.BetaContentBlock[],
  into: Set<string>,
  pageAges?: Map<string, string>,
) {
  for (const block of content) {
    // A failed search returns an error object instead of a list of results.
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const result of block.content) {
      const normalized = normalizeUrl(result.url);
      if (!normalized) continue;
      into.add(normalized);
      if (pageAges && result.page_age) pageAges.set(normalized, result.page_age);
    }
  }
}

export function keepVerifiedSources(sources: Source[], searchedUrls: Set<string>): Source[] {
  return sources.filter((source) => {
    const normalized = normalizeUrl(source.url);
    return normalized !== null && searchedUrls.has(normalized);
  });
}

// Keeps only sources whose URL was actually retrieved, and fills in the page
// date from the search results where the model left it empty.
export function verifySources(
  sources: Source[],
  searchedUrls: Set<string>,
  pageAges: Map<string, string>,
  now = new Date(),
) {
  return keepVerifiedSources(sources, searchedUrls).map((source) => {
    if (source.published) return source;
    const pageAge = pageAges.get(normalizeUrl(source.url) ?? "");
    return pageAge ? { ...source, published: absoluteDate(pageAge, now) } : source;
  });
}

// Search results date pages relatively ("80 days ago"); turn day and week
// counts into a calendar date so the label doesn't go stale. Anything else is
// kept as given.
export function absoluteDate(pageAge: string, now: Date): string {
  const match = /^(\d+) (hour|day|week)s? ago$/.exec(pageAge.trim());
  if (!match) return pageAge;
  const days = match[2] === "hour" ? 0 : Number(match[1]) * (match[2] === "week" ? 7 : 1);
  return new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

const COURT_HOSTS = ["supremecourt.gov", "uscourts.gov"];

// The source type when the web address alone proves it; null otherwise, in
// which case the model's label is shown and marked as such.
export function domainSourceType(url: string): SourceType | null {
  if (!isSafeHttpUrl(url)) return null;
  const host = new URL(url).hostname.toLowerCase();
  const isOrUnder = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (COURT_HOSTS.some(isOrUnder)) return "court";
  if (host.endsWith(".gov") || host.endsWith(".mil")) return "government";
  if (host.endsWith(".edu")) return "academic";
  return null;
}

export function effectiveSourceType(source: Source): { type: SourceType; fromDomain: boolean } {
  const fromDomain = domainSourceType(source.url);
  return fromDomain ? { type: fromDomain, fromDomain: true } : { type: source.source_type, fromDomain: false };
}

export type EvidenceLevel = "primary" | "secondary" | "advocacy" | "unsourced";

// What kind of source backs a fact. This rates the sources, not whether an
// interpretation is right.
export function evidenceLevel(sources: Source[]): EvidenceLevel {
  if (sources.length === 0) return "unsourced";
  const types = sources.map((source) => effectiveSourceType(source).type);
  if (types.some((type) => type === "government" || type === "court")) return "primary";
  if (types.every((type) => type === "advocacy")) return "advocacy";
  return "secondary";
}
