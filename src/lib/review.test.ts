import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleBriefing } from "./testFixtures";

const store = new Map<string, string>();
const cookieJar = new Map<string, string>();
vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (path: string, body: string) => {
    store.set(path, body);
    return {};
  }),
  get: vi.fn(async (path: string) =>
    store.has(path) ? { statusCode: 200, stream: new Response(store.get(path)).body, headers: new Headers(), blob: {} } : null,
  ),
  list: vi.fn(async ({ prefix }: { prefix: string }) => ({
    blobs: [...store.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })),
    hasMore: false,
  })),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined) }),
}));

const review = await import("./review");
const { POST: login } = await import("../app/api/review/login/route");
const { POST: action } = await import("../app/api/review/action/route");
const { POST: feedback } = await import("../app/api/feedback/route");

const page = {
  slug: "filibuster-abc12345",
  language: "en",
  question: "",
  briefing: sampleBriefing,
  publishedAt: "2026-11-15T00:00:00.000Z",
  status: "ai_draft",
  history: [{ at: "2026-11-15T00:00:00.000Z", note: "published" }],
  corrections: [],
};

const json = (url: string, body: unknown, ip: string) =>
  new Request(url, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": ip } });

describe("review desk", () => {
  beforeEach(() => {
    store.clear();
    cookieJar.clear();
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    process.env.REVIEWER_CODES = "Maya:maya-code-123, Jordan:jordan-code-456, Short:abc";
    store.set(`pages/${page.slug}.json`, JSON.stringify(page));
  });
  afterEach(() => {
    delete process.env.REVIEWER_CODES;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("reads reviewers from the setting and ignores weak passcodes", () => {
    expect(review.reviewerList().map((r) => r.name)).toEqual(["Maya", "Jordan"]);
    expect(review.reviewerForCode("jordan-code-456")).toBe("Jordan");
    expect(review.reviewerForCode("abc")).toBeNull();
    expect(review.reviewerForCode("wrong")).toBeNull();
  });

  it("signs sessions and rejects tampered, expired, or removed reviewers", () => {
    const token = review.sessionToken("Maya", 0);
    expect(review.readSession(token, 1000)).toBe("Maya");
    const [, expires, sig] = token.split(".");
    expect(review.readSession(`${Buffer.from("Jordan").toString("base64url")}.${expires}.${sig}`, 1000)).toBeNull();
    expect(review.readSession(token, 13 * 3_600_000)).toBeNull();
    process.env.REVIEWER_CODES = "Jordan:jordan-code-456";
    expect(review.readSession(token, 1000)).toBeNull();
  });

  it("signs a reviewer in with a passcode and sets an httpOnly cookie", async () => {
    const ok = await login(json("http://x/api/review/login", { code: "maya-code-123" }, "10.7.0.1"));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toMatch(/^civica_reviewer=.+HttpOnly; SameSite=Strict/);
    const bad = await login(json("http://x/api/review/login", { code: "nope-nope-nope" }, "10.7.0.2"));
    expect(bad.status).toBe(401);
  });

  it("refuses actions without a session", async () => {
    const response = await action(json("http://x/api/review/action", { slug: page.slug, action: "note", text: "Hi" }, "10.7.0.3"));
    expect(response.status).toBe(401);
  });

  it("approves only with the full checklist, and stamps the reviewer's name", async () => {
    cookieJar.set(review.SESSION_COOKIE, review.sessionToken("Maya"));
    const partial = await action(json("http://x/api/review/action", { slug: page.slug, action: "approve", checklist: ["facts"] }, "10.7.0.4"));
    expect(partial.status).toBe(400);
    const full = await action(
      json("http://x/api/review/action", { slug: page.slug, action: "approve", checklist: ["facts", "sources", "balance", "plain"] }, "10.7.0.4"),
    );
    expect(full.status).toBe(200);
    const saved = JSON.parse(store.get(`pages/${page.slug}.json`)!);
    expect(saved).toMatchObject({ status: "reviewed", review: { by: "Maya" } });
    expect(saved.history.at(-1)).toMatchObject({ note: "reviewed", by: "Maya" });
  });

  it("adds public corrections with the reviewer's name", async () => {
    cookieJar.set(review.SESSION_COOKIE, review.sessionToken("Jordan"));
    await action(json("http://x/api/review/action", { slug: page.slug, action: "correction", text: "The vote was 52-48, not 51-49." }, "10.7.0.5"));
    const saved = JSON.parse(store.get(`pages/${page.slug}.json`)!);
    expect(saved.corrections[0]).toMatchObject({ text: "The vote was 52-48, not 51-49.", by: "Jordan" });
  });

  it("stores reader feedback privately and counts it by kind", async () => {
    await feedback(json("http://x/api/feedback", { slug: page.slug, kind: "confusing", message: "What is cloture?" }, "10.7.0.6"));
    await feedback(json("http://x/api/feedback", { slug: page.slug, kind: "error" }, "10.7.0.6"));
    expect((await feedback(json("http://x/api/feedback", { slug: "../etc", kind: "error" }, "10.7.0.6"))).status).toBe(400);
    expect(await review.feedbackCounts()).toEqual({ [page.slug]: { clear: 0, confusing: 1, error: 1 } });
    expect((await review.feedbackFor(page.slug)).map((f) => f.kind).sort()).toEqual(["confusing", "error"]);
  });
});
