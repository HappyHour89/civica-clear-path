import { afterEach, describe, expect, it, vi } from "vitest";
import { findOfficials, parseCensusDistrict, parseLegislators } from "./officials";
import { checkRateLimit } from "./rateLimit";
import { BriefingSchema, toolInputSchema } from "./schemas";
import { collectSearchResultUrls, isSafeHttpUrl, keepVerifiedSources, normalizeUrl } from "./sources";
import { sampleBriefing } from "./testFixtures";
import { fileToContentBlock } from "./upload";

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

const legislatorsFixture = [
  {
    name: { first: "Ann", last: "Smith", official_full: "Ann Smith" },
    terms: [
      { type: "rep", state: "WY", district: 0, party: "Democrat" },
      { type: "sen", state: "WY", party: "Independent", phone: "202-224-0001", url: "https://smith.senate.gov" },
    ],
  },
  { name: { first: "Bo", last: "Lee" }, terms: [{ type: "rep", state: "WY", district: 0, party: "Republican", phone: "202-225-0002" }] },
  { name: { first: "Cy", last: "Ng" }, terms: [{ type: "rep", state: "CA", district: 12, party: "Democrat" }] },
  { name: { first: "Di", last: "Ro" }, terms: [{ type: "rep", state: "CA", district: 13, party: "Republican" }] },
  { name: { first: "Ed", last: "Fa" }, terms: [{ type: "sen", state: "CA", party: "Democrat" }] },
];

function censusFixture(state: string, geography: Record<string, string>) {
  return {
    result: {
      addressMatches: [
        { addressComponents: { state }, geographies: { "119th Congressional Districts": [geography], States: [{}] } },
      ],
    },
  };
}

describe("officials", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses each legislator's most recent term", () => {
    const officials = parseLegislators(legislatorsFixture);
    expect(officials[0]).toMatchObject({ name: "Ann Smith", chamber: "senate", district: null, phone: "202-224-0001" });
    expect(officials[1]).toMatchObject({ name: "Bo Lee", chamber: "house", district: 0 });
  });

  it("reads congressional districts from Census responses", () => {
    expect(parseCensusDistrict(censusFixture("CA", { CD119: "12", GEOID: "0612" }))).toEqual({ state: "CA", district: 12 });
    expect(parseCensusDistrict(censusFixture("CA", { GEOID: "0613" }))).toEqual({ state: "CA", district: 13 });
    expect(parseCensusDistrict(censusFixture("WY", { CD119: "00" }))).toEqual({ state: "WY", district: 0 });
    expect(parseCensusDistrict(censusFixture("DC", { CD119: "98" }))).toEqual({ state: "DC", district: 0 });
    expect(parseCensusDistrict({ result: { addressMatches: [] } })).toBeNull();
    expect(parseCensusDistrict(null)).toBeNull();
  });

  function stubFetch(census: unknown) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) =>
        String(url).includes("census.gov")
          ? Response.json(census)
          : Response.json(legislatorsFixture),
      ),
    );
  }

  it("finds the House member for a matched address", async () => {
    stubFetch(censusFixture("CA", { CD119: "13" }));
    const result = await findOfficials("CA", "1 Main St");
    expect(result.senators.map((s) => s.name)).toEqual(["Ed Fa"]);
    expect(result.representative?.name).toBe("Di Ro");
    expect(result.addressMatched).toBe(true);
  });

  it("shows the at-large member without an address and flags unmatched addresses", async () => {
    stubFetch({ result: { addressMatches: [] } });
    const wyoming = await findOfficials("WY", null);
    expect(wyoming.representative?.name).toBe("Bo Lee");
    expect(wyoming.addressMatched).toBeNull();

    const california = await findOfficials("CA", "nowhere");
    expect(california.representative).toBeNull();
    expect(california.addressMatched).toBe(false);
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
