import type Anthropic from "@anthropic-ai/sdk";
import type { Source } from "./schemas";

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

export function collectSearchResultUrls(
  content: Anthropic.Beta.BetaContentBlock[],
  into: Set<string>,
) {
  for (const block of content) {
    // A failed search returns an error object instead of a list of results.
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const result of block.content) {
      const normalized = normalizeUrl(result.url);
      if (normalized) into.add(normalized);
    }
  }
}

export function keepVerifiedSources(sources: Source[], searchedUrls: Set<string>): Source[] {
  return sources.filter((source) => {
    const normalized = normalizeUrl(source.url);
    return normalized !== null && searchedUrls.has(normalized);
  });
}
