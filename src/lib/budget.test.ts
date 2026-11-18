import { Messages } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the private Vercel Blob store.
const store = new Map<string, Date>();
vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (path: string) => {
    store.set(path, new Date());
    return {};
  }),
  get: vi.fn(async () => null),
  del: vi.fn(async () => undefined),
  list: vi.fn(async ({ prefix }: { prefix: string }) => ({
    blobs: [...store.entries()]
      .filter(([k]) => k.startsWith(prefix))
      .map(([pathname, uploadedAt]) => ({ pathname, url: pathname, uploadedAt })),
    hasMore: false,
  })),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));

const budget = await import("./budget");
const { addressHash } = await import("./security");
const { POST: ask } = await import("../app/api/ask/route");

const month = new Date().toISOString().slice(0, 7);
const visitor = (ip: string) =>
  new Request("https://civica-clear-path.com/api/ask", { method: "POST", headers: { "x-forwarded-for": ip } });

beforeEach(() => {
  store.clear();
  budget.resetBudgetCacheForTests();
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  process.env.PUBLISH_SECRET = "test-secret";
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.MONTHLY_AI_BUDGET_USD;
});
afterEach(() => vi.restoreAllMocks());

describe("monthly AI budget", () => {
  it("defaults to $10 and can be changed", () => {
    expect(budget.monthlyBudgetCents({})).toBe(1000);
    expect(budget.monthlyBudgetCents({ MONTHLY_AI_BUDGET_USD: "25" })).toBe(2500);
    expect(budget.monthlyBudgetCents({ MONTHLY_AI_BUDGET_USD: "nonsense" })).toBe(1000);
  });

  it("adds up what each request cost this month", async () => {
    await budget.recordSpend(0.42);
    await budget.recordSpend(0.031);
    await budget.recordSpend(null); // no estimate: not recorded
    budget.resetBudgetCacheForTests();
    expect(await budget.monthSpendCents()).toBe(42 + 4);
  });

  it("refuses new AI requests once the month's budget is spent, before calling the AI", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    store.set(`ai-spend/${month}/1-aaaaaa-1000c.json`, new Date());
    await expect(budget.guardAiRequest(visitor("10.1.0.1"))).rejects.toMatchObject({ status: 503, code: "budget" });

    const create = vi.spyOn(Messages.prototype, "create");
    const form = new FormData();
    form.set("question", "What is a filibuster?");
    form.set("language", "en");
    const response = await ask(
      new Request("https://civica-clear-path.com/api/ask", { method: "POST", body: form, headers: { "x-forwarded-for": "10.1.0.2" } }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "budget" });
    expect(create).not.toHaveBeenCalled();
  });

  it("lets the newspaper use only half the budget", async () => {
    store.set(`ai-spend/${month}/1-aaaaaa-600c.json`, new Date());
    expect(await budget.withinBudget(0.5)).toBe(false);
    expect(await budget.withinBudget(1)).toBe(true);
  });
});

describe("AI requests per address, across servers", () => {
  it("allows 15 an hour from one address, then refuses; others are unaffected", async () => {
    for (let i = 0; i < budget.AI_CALLS_PER_HOUR; i++) await budget.guardAiRequest(visitor("10.2.0.1"));
    await expect(budget.guardAiRequest(visitor("10.2.0.1"))).rejects.toMatchObject({ status: 429 });
    await expect(budget.guardAiRequest(visitor("10.2.0.2"))).resolves.toBeUndefined();
  });

  it("stores a scrambled address, never the address itself", async () => {
    await budget.guardAiRequest(visitor("203.0.113.9"));
    const names = [...store.keys()].join(" ");
    expect(names).not.toContain("203.0.113.9");
    expect(names).toContain(addressHash(visitor("203.0.113.9"), "ai"));
  });
});
