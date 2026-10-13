import { delegation, MEMBERS, type Member } from "./legislators";
import { isStateCode } from "./states";

const CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress";
const TIMEOUT_MS = 10_000;

export type FederalOfficial = Member;

export type OfficialsResult = {
  state: string;
  senators: FederalOfficial[];
  representative: FederalOfficial | null;
  district: number | null;
  // null when no address was given; false when the Census Bureau found no match.
  addressMatched: boolean | null;
  lookupFailed: boolean;
};

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
  if (!response.ok) throw new Error(`Census lookup failed: ${response.status}`);
  return parseCensusDistrict(await response.json());
}

export async function findOfficials(stateInput: string, address: string | null): Promise<OfficialsResult> {
  let located: { state: string; district: number } | null = null;
  let lookupFailed = false;
  if (address) {
    try {
      located = await lookupDistrict(address);
    } catch (error) {
      console.error("Census district lookup failed", error);
      lookupFailed = true;
    }
  }
  // A matched address is more precise than the state picked in the form.
  const state = located?.state ?? stateInput;
  const { senators, house } = delegation(MEMBERS, state);

  let representative: FederalOfficial | null = null;
  if (located) {
    representative = house.find((m) => m.district === located.district) ?? null;
  } else if (house.length === 1 && house[0].district === 0) {
    // At-large states and territories have exactly one House member.
    representative = house[0];
  }

  return {
    state,
    senators,
    representative,
    district: representative?.district ?? located?.district ?? null,
    addressMatched: address && !lookupFailed ? located !== null : null,
    lookupFailed,
  };
}
