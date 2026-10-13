import { afterEach, describe, expect, it, vi } from "vitest";
import { countdownTo } from "./election";
import { delegation, filterMembers, MEMBERS } from "./legislators";
import { findOfficials, parseCensusDistrict } from "./officials";
import { checkRateLimit } from "./rateLimit";
import { BriefingSchema, toolInputSchema } from "./schemas";
import { collectSearchResultUrls, isSafeHttpUrl, keepVerifiedSources, normalizeUrl } from "./sources";
import { sampleBriefing } from "./testFixtures";
import { fileToContentBlock } from "./upload";
import { voteGovStateUrl } from "./vote";
import { DISTRICT_MAPS, districtWinners, VOTER_GROUPS } from "../content/learn";

describe("toolInputSchema", () => {
  function walk(node: unknown, visit: (obj: Record<string, unknown>) => void) {
    if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
    else if (node && typeof node === "object") {
      visit(node as Record<string, unknown>);
      Object.values(node).forEach((n) => walk(n, visit));
    }
  }

  it("produces a schema Claude's strict mode accepts", () => {
    walk(toolInputSchema(BriefingSchema), (obj) => {
      expect(obj).not.toHaveProperty("$schema");
      expect(obj).not.toHaveProperty("minimum");
      expect(obj).not.toHaveProperty("maximum");
      if (obj.type === "object") {
        expect(obj.additionalProperties).toBe(false);
        expect(obj.required).toEqual(Object.keys(obj.properties as object));
      }
    });
  });

  it("accepts a well-formed briefing", () => {
    expect(BriefingSchema.safeParse(sampleBriefing).success).toBe(true);
  });
});

describe("sources", () => {
  it("normalizes URLs so small formatting differences still match", () => {
    expect(normalizeUrl("https://WWW.Senate.gov/a/b/#top")).toBe("senate.gov/a/b");
    expect(normalizeUrl("https://example.com/?q=1")).toBe("example.com?q=1");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("only allows http(s) links", () => {
    expect(isSafeHttpUrl("https://congress.gov")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,hi")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });

  it("ignores failed searches and keeps only retrieved sources", () => {
    const urls = new Set<string>();
    collectSearchResultUrls(
      [
        { type: "web_search_tool_result", tool_use_id: "a", content: { type: "web_search_tool_result_error", error_code: "unavailable" } },
        {
          type: "web_search_tool_result",
          tool_use_id: "b",
          content: [{ type: "web_search_result", url: "https://www.senate.gov/about/powers-procedures/filibusters-cloture.htm", title: "t", encrypted_content: "", page_age: null }],
        },
      ] as never,
      urls,
    );
    expect(keepVerifiedSources(sampleBriefing.sources, urls).map((s) => s.id)).toEqual([1]);
  });
});

function censusFixture(state: string, geography: Record<string, string>) {
  return {
    result: {
      addressMatches: [
        { addressComponents: { state }, geographies: { "119th Congressional Districts": [geography], States: [{}] } },
      ],
    },
  };
}

describe("legislators snapshot", () => {
  it("has a full, current Congress with names and offices", () => {
    expect(MEMBERS.filter((m) => m.chamber === "senate")).toHaveLength(100);
    expect(MEMBERS.filter((m) => m.chamber === "house").length).toBeGreaterThan(430);
    expect(MEMBERS.every((m) => m.name.trim() && m.state && /^\d{4}$/.test(m.since))).toBe(true);
    expect(new Set(MEMBERS.map((m) => m.id)).size).toBe(MEMBERS.length);
  });

  it("filters by chamber, state, party, and accent-insensitive name", () => {
    const wy = filterMembers(MEMBERS, { state: "WY" });
    expect(wy.filter((m) => m.chamber === "senate")).toHaveLength(2);
    const anyName = MEMBERS[0].name;
    const plain = anyName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    expect(filterMembers(MEMBERS, { query: plain }).map((m) => m.id)).toContain(MEMBERS[0].id);
    const party = filterMembers(MEMBERS, { chamber: "house", party: "Republican" });
    expect(party.every((m) => m.chamber === "house" && m.party === "Republican")).toBe(true);
  });

  it("orders a state's House members by district", () => {
    const { house } = delegation(MEMBERS, "CA");
    const districts = house.map((m) => m.district ?? 0);
    expect(districts).toEqual([...districts].sort((a, b) => a - b));
  });
});

describe("officials", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads congressional districts from Census responses", () => {
    expect(parseCensusDistrict(censusFixture("CA", { CD119: "12", GEOID: "0612" }))).toEqual({ state: "CA", district: 12 });
    expect(parseCensusDistrict(censusFixture("CA", { GEOID: "0613" }))).toEqual({ state: "CA", district: 13 });
    expect(parseCensusDistrict(censusFixture("WY", { CD119: "00" }))).toEqual({ state: "WY", district: 0 });
    expect(parseCensusDistrict(censusFixture("DC", { CD119: "98" }))).toEqual({ state: "DC", district: 0 });
    expect(parseCensusDistrict({ result: { addressMatches: [] } })).toBeNull();
    expect(parseCensusDistrict(null)).toBeNull();
  });

  it("finds the House member for a matched address", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(censusFixture("CA", { CD119: "12" }))));
    const result = await findOfficials("NY", "1 Main St");
    expect(result.state).toBe("CA");
    expect(result.senators).toHaveLength(2);
    expect(result.representative).toMatchObject({ state: "CA", district: 12 });
    expect(result.addressMatched).toBe(true);
  });

  it("shows the at-large member without an address, and separates no-match from failure", async () => {
    const wyoming = await findOfficials("WY", null);
    expect(wyoming.representative).toMatchObject({ state: "WY", district: 0 });
    expect(wyoming.addressMatched).toBeNull();

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ result: { addressMatches: [] } })));
    const noMatch = await findOfficials("CA", "nowhere");
    expect(noMatch).toMatchObject({ representative: null, addressMatched: false, lookupFailed: false });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    const failed = await findOfficials("CA", "1 Main St");
    expect(failed).toMatchObject({ representative: null, addressMatched: null, lookupFailed: true });
  });
});

describe("election countdown", () => {
  it("counts down to local midnight on November 3, 2026", () => {
    // Only days are checked: clocks change on Nov 1 in many time zones, shifting the hours.
    expect(countdownTo(new Date(2026, 9, 13, 12, 0, 0))).toMatchObject({ phase: "before", days: 20 });
    expect(countdownTo(new Date(2026, 10, 2, 23, 59, 30))).toEqual({
      phase: "before",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 30,
    });
    expect(countdownTo(new Date(2026, 10, 3, 9))).toEqual({ phase: "today" });
    expect(countdownTo(new Date(2026, 10, 4, 0, 0, 1))).toEqual({ phase: "after" });
  });
});

describe("uploads", () => {
  it("detects PDFs and images by their bytes", async () => {
    expect(await fileToContentBlock(new File(["%PDF-1.4 x"], "a.txt"))).toMatchObject({ type: "document", source: { media_type: "application/pdf" } });
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2])], "a.pdf");
    expect(await fileToContentBlock(png)).toMatchObject({ type: "image", source: { media_type: "image/png" } });
  });

  it("accepts UTF-8 text, including Korean", async () => {
    const block = await fileToContentBlock(new File(["법안 제1조"], "bill.txt"));
    expect(block).toMatchObject({ type: "document", source: { type: "text", data: "법안 제1조" } });
  });

  it("rejects unknown binary files, empty files, and oversized files", async () => {
    await expect(fileToContentBlock(new File([new Uint8Array([0xff, 0xfe, 0x00, 0xc3])], "x.bin"))).rejects.toMatchObject({ status: 415 });
    await expect(fileToContentBlock(new File([], "empty.txt"))).rejects.toMatchObject({ status: 400 });
    await expect(fileToContentBlock(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.txt"))).rejects.toMatchObject({ status: 413 });
  });
});

describe("rate limit", () => {
  it("blocks after the limit and resets after the window", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 2, 1000, 0).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 1000, 10).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 1000, 20)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(checkRateLimit(key, 2, 1000, 1000).allowed).toBe(true);
  });
});

describe("vote links", () => {
  it("builds vote.gov state pages matching the confirmed URLs", () => {
    expect(voteGovStateUrl("CA")).toBe("https://vote.gov/register/california");
    expect(voteGovStateUrl("NC")).toBe("https://vote.gov/register/north-carolina");
    expect(voteGovStateUrl("DC")).toBe("https://vote.gov/register/district-of-columbia");
    expect(voteGovStateUrl("VI")).toBe("https://vote.gov/register/us-virgin-islands");
    expect(voteGovStateUrl("MP")).toBe("https://vote.gov/register/northern-mariana-islands");
    expect(voteGovStateUrl("AS")).toBe("https://vote.gov/register/american-samoa");
    expect(voteGovStateUrl("GU")).toBe("https://vote.gov/register");
  });
});

describe("redistricting example maps", () => {
  function connected(cells: number[]) {
    const set = new Set(cells);
    const seen = new Set([cells[0]]);
    const queue = [cells[0]];
    while (queue.length) {
      const c = queue.pop()!;
      const neighbors = [c - 5, c + 5, c % 5 ? c - 1 : -1, c % 5 < 4 ? c + 1 : -1];
      for (const n of neighbors) {
        if (set.has(n) && !seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    return seen.size === cells.length;
  }

  it("has five equal, contiguous districts per map with the described outcomes", () => {
    for (const map of DISTRICT_MAPS) {
      for (let d = 0; d < 5; d++) {
        const cells = map.flatMap((district, i) => (district === d ? [i] : []));
        expect(cells).toHaveLength(5);
        expect(connected(cells)).toBe(true);
      }
    }
    const seatsForA = DISTRICT_MAPS.map((map) => districtWinners(map).filter((w) => w === "A").length);
    expect(seatsForA).toEqual([3, 5, 2]);
    expect(VOTER_GROUPS.filter((g) => g === "A")).toHaveLength(15);
  });
});
