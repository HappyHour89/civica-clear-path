import { Messages } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Edition } from "./schemas";

const store = new Map<string, string>();
const scheduled: (() => Promise<void>)[] = [];
vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (path: string, body: string) => {
    store.set(path, body);
    return {};
  }),
  get: vi.fn(async (path: string) =>
    store.has(path) ? { statusCode: 200, stream: new Response(store.get(path)).body, headers: new Headers(), blob: {} } : null,
  ),
  list: vi.fn(async () => ({ blobs: [], hasMore: false })),
}));
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => scheduled.push(fn), connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));

const editions = await import("./editions");
const { resetProviderStateForTests } = await import("./claude");
const { GET } = await import("../app/api/edition/route");

const story = (headline: string, source_ids: number[], affects: string[] = []) => ({
  section: "local" as const,
  headline,
  dek: "What happened.",
  body: "Details.",
  affects,
  what_next: "A vote on Dec 2.",
  date: "2026-11-14",
  source_ids,
});

const edition: Edition = {
  lead: story("Council approves water rates", [1], ["renter", "homeowner", "made-up"]),
  stories: [story("School board adds bus routes", [1], ["parent"]), story("Unsourced rumor", [9])],
  upcoming: [{ date: "2026-12-02", title: "Budget hearing", body: "The council sets next year's budget.", how_to_take_part: "Speak at public comment." }],
  quick_hits: ["Library hours extended."],
  sources: [
    { id: 1, title: "Water rates", url: "https://www.sandiego.gov/water", publisher: "City of San Diego", source_type: "government", published: "", excerpt: "" },
    { id: 9, title: "Blog", url: "https://example.com/rumor", publisher: "Blog", source_type: "other", published: "", excerpt: "" },
  ],
};

function mockEdition() {
  return vi.spyOn(Messages.prototype, "create").mockResolvedValueOnce({
    stop_reason: "tool_use",
    content: [
      {
        type: "web_search_tool_result",
        tool_use_id: "s1",
        content: [{ type: "web_search_result", url: "https://www.sandiego.gov/water", title: "x", encrypted_content: "x", page_age: null }],
      },
      { type: "tool_use", id: "t1", name: "submit_edition", input: edition },
    ],
  } as never);
}

describe("newspaper editions", () => {
  beforeEach(() => {
    store.clear();
    scheduled.length = 0;
    resetProviderStateForTests();
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("accepts only real places and languages", () => {
    expect(editions.parseEditionKey("CA", "es")).toEqual({ region: "CA", language: "es" });
    expect(editions.parseEditionKey("US", "zh-Hant")).toEqual({ region: "US", language: "zh-Hant" });
    expect(editions.parseEditionKey("XX", "en")).toBeNull();
    expect(editions.parseEditionKey("CA", "fr")).toBeNull();
  });

  it("drops stories without a verified source and situations that don't exist", async () => {
    mockEdition();
    const stored = await editions.generateEdition("CA", "en");
    expect(stored.edition.stories.map((s) => s.headline)).toEqual(["School board adds bus routes"]);
    expect(stored.edition.lead.affects).toEqual(["renter", "homeowner"]);
    expect(stored.edition.sources.map((s) => s.id)).toEqual([1]);
    expect(editions.isFresh(stored)).toBe(true);
    expect(editions.isFresh(stored, Date.now() + editions.FRESH_FOR_MS + 1)).toBe(false);
  });

  it("serves what it has and writes a new edition in the background, once", async () => {
    mockEdition();
    const first = await GET(new Request("http://x/api/edition?region=CA&lang=en"));
    expect(await first.json()).toEqual({ stored: null, refreshing: true });
    expect(scheduled).toHaveLength(1);

    // A second visitor during the refresh doesn't start another one.
    await GET(new Request("http://x/api/edition?region=CA&lang=en"));
    expect(scheduled).toHaveLength(1);

    await scheduled[0]();
    const after = await (await GET(new Request("http://x/api/edition?region=CA&lang=en"))).json();
    expect(after.refreshing).toBe(false);
    expect(after.stored.edition.lead.headline).toBe("Council approves water rates");
  });

  it("rejects unknown editions", async () => {
    expect((await GET(new Request("http://x/api/edition?region=ZZ&lang=en"))).status).toBe(400);
  });
});
