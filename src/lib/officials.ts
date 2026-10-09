import { isStateCode } from "./states";

const LEGISLATORS_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json";
const CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress";
const CACHE_MS = 12 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;

export type FederalOfficial = {
  name: string;
  party: string;
  chamber: "senate" | "house";
  state: string;
  district: number | null;
  phone: string | null;
  website: string | null;
  contactForm: string | null;
};

export type OfficialsResult = {
  state: string;
  senators: FederalOfficial[];
  representative: FederalOfficial | null;
  district: number | null;
  addressMatched: boolean | null;
};

type RawTerm = {
  type?: string;
  state?: string;
  district?: number;
  party?: string;
  phone?: string;
  url?: string;
  contact_form?: string;
};

type RawLegislator = {
  name?: { first?: string; last?: string; official_full?: string };
  terms?: RawTerm[];
};

export function parseLegislators(raw: unknown): FederalOfficial[] {
  if (!Array.isArray(raw)) throw new Error("Unexpected legislators data");
  const officials: FederalOfficial[] = [];
  for (const person of raw as RawLegislator[]) {
    const term = person.terms?.at(-1);
    if (!term?.state || (term.type !== "sen" && term.type !== "rep")) continue;
    const name = person.name?.official_full ?? [person.name?.first, person.name?.last].filter(Boolean).join(" ");
    officials.push({
      name,
      party: term.party ?? "",
      chamber: term.type === "sen" ? "senate" : "house",
      state: term.state,
      district: term.type === "rep" ? (term.district ?? null) : null,
      phone: term.phone ?? null,
      website: term.url ?? null,
      contactForm: term.contact_form ?? null,
    });
  }
  return officials;
}

let cache: { officials: FederalOfficial[]; fetchedAt: number } | null = null;

async function loadLegislators(): Promise<FederalOfficial[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.officials;
  // The file is larger than Next's fetch cache allows, so cache it in memory instead.
  const response = await fetch(LEGISLATORS_URL, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Legislators download failed: ${response.status}`);
  const officials = parseLegislators(await response.json());
  cache = { officials, fetchedAt: Date.now() };
  return officials;
}

type CensusGeography = Record<string, string | number | undefined>;
type CensusResponse = {
  result?: {
    addressMatches?: {
      addressComponents?: { state?: string };
      geographies?: Record<string, CensusGeography[] | undefined>;
    }[];
  };
};

export function parseCensusDistrict(raw: unknown): { state: string; district: number } | null {
  const match = (raw as CensusResponse)?.result?.addressMatches?.[0];
  if (!match?.geographies) return null;
  const state = match.addressComponents?.state?.toUpperCase();
  if (!isStateCode(state)) return null;

  const layerName = Object.keys(match.geographies).find((key) => /congressional district/i.test(key));
  const geography = layerName ? match.geographies[layerName]?.[0] : undefined;
  if (!geography) return null;

  // Census GEOIDs are the 2-digit state code followed by the 2-digit district.
  const codeKey = Object.keys(geography).find((key) => /^CD\d+$/.test(key));
  const code = String(codeKey ? geography[codeKey] : String(geography.GEOID ?? "").slice(2));
  const district = Number.parseInt(code, 10);
  if (!Number.isFinite(district)) return null;
  // 00 = a single at-large seat; 98 = a non-voting delegate (e.g. DC). The
  // legislators dataset records both as district 0.
  return { state, district: district === 98 ? 0 : district };
}

async function lookupDistrict(address: string) {
  const url = new URL(CENSUS_URL);
  url.search = new URLSearchParams({
    address,
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    layers: "all",
    format: "json",
  }).toString();
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) return null;
  return parseCensusDistrict(await response.json());
}

export async function findOfficials(stateInput: string, address: string | null): Promise<OfficialsResult> {
  const [all, located] = await Promise.all([
    loadLegislators(),
    address ? lookupDistrict(address).catch(() => null) : Promise.resolve(null),
  ]);
  // A matched address is more precise than the state picked in the form.
  const state = located?.state ?? stateInput;
  const senators = all.filter((o) => o.chamber === "senate" && o.state === state);
  const houseMembers = all.filter((o) => o.chamber === "house" && o.state === state);

  let representative: FederalOfficial | null = null;
  if (located) {
    representative = houseMembers.find((o) => o.district === located.district) ?? null;
  } else if (houseMembers.length === 1 && houseMembers[0].district === 0) {
    // At-large states and territories have exactly one House member.
    representative = houseMembers[0];
  }

  return {
    state,
    senators,
    representative,
    district: representative?.district ?? located?.district ?? null,
    addressMatched: address ? located !== null : null,
  };
}
