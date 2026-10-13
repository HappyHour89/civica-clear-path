import { US_STATES } from "./states";

// Each URL below was confirmed to exist in search results on 2026-10-13. State
// deadlines are deliberately not stored: Civica only shows dates it has checked
// against an official source.
export const VOTE_LINKS = {
  check: "https://www.usa.gov/confirm-voter-registration",
  register: "https://vote.gov/",
  polling: "https://www.usa.gov/find-polling-place",
  mail: "https://www.usa.gov/absentee-voting",
  registerIndex: "https://vote.gov/register",
  electionOffices: "https://www.usa.gov/state-election-office",
  deadlines: "https://www.usa.gov/voter-registration-deadlines",
  earlyVoting: "https://www.usa.gov/early-voting",
} as const;

// Guam's state page didn't appear in search results, so it falls back to the index.
const UNCONFIRMED_STATE_PAGES = new Set(["GU"]);

// vote.gov state pages use the lowercased, hyphenated name: /register/north-carolina.
export function voteGovStateUrl(code: string): string {
  if (UNCONFIRMED_STATE_PAGES.has(code) || !US_STATES[code]) return VOTE_LINKS.registerIndex;
  const slug = US_STATES[code]
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "-");
  return `https://vote.gov/register/${slug}`;
}
