import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleBriefing } from "./testFixtures";

const put = vi.fn();
vi.mock("@vercel/blob", () => ({ put: (...args: unknown[]) => put(...args), get: vi.fn(), list: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));

const { POST } = await import("../app/api/publish/route");
const { signBriefing, slugFor, verifyBriefing } = await import("./publicPages");

const question = "What is the filibuster?";

function publishRequest(body: unknown, ip: string) {
  return new Request("http://localhost/api/publish", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

describe("public pages", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    put.mockReset().mockResolvedValue({});
  });
  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("signs a briefing and rejects any edit to it", () => {
    const token = signBriefing({ briefing: sampleBriefing, question, language: "en" })!;
    expect(verifyBriefing({ briefing: sampleBriefing, question, language: "en" }, token)).toBe(true);
    expect(verifyBriefing({ briefing: { ...sampleBriefing, title: "Fake" }, question, language: "en" }, token)).toBe(false);
    expect(verifyBriefing({ briefing: sampleBriefing, question: "Other", language: "en" }, token)).toBe(false);
    expect(verifyBriefing({ briefing: sampleBriefing, question, language: "ko" }, token)).toBe(false);
  });

  it("makes readable, unique slugs", () => {
    expect(slugFor("The Senate filibuster")).toMatch(/^the-senate-filibuster-[0-9a-f]{8}$/);
    expect(slugFor("필리버스터")).toMatch(/^briefing-[0-9a-f]{8}$/);
    expect(slugFor("x")).not.toBe(slugFor("x"));
  });

  it("publishes a signed briefing as an AI draft, with the question hidden if asked", async () => {
    const token = signBriefing({ briefing: sampleBriefing, question, language: "en" });
    const response = await POST(
      publishRequest({ briefing: sampleBriefing, question, language: "en", token, includeQuestion: false, consent: true }, "10.6.0.1"),
    );
    expect(response.status).toBe(200);
    const { slug } = await response.json();
    const [path, body, options] = put.mock.calls[0];
    expect(path).toBe(`pages/${slug}.json`);
    expect(JSON.parse(body)).toMatchObject({ status: "ai_draft", question: "", corrections: [] });
    expect(options).toMatchObject({ access: "private" });
    expect(put.mock.calls[1][0]).toMatch(/^library\/\d{13}-/);
  });

  it("refuses a briefing that was edited after Civica produced it", async () => {
    const token = signBriefing({ briefing: sampleBriefing, question, language: "en" });
    const forged = { ...sampleBriefing, summary: "Something Civica never said." };
    const response = await POST(
      publishRequest({ briefing: forged, question, language: "en", token, includeQuestion: true, consent: true }, "10.6.0.2"),
    );
    expect(response.status).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });

  it("requires consent", async () => {
    const token = signBriefing({ briefing: sampleBriefing, question, language: "en" });
    const response = await POST(
      publishRequest({ briefing: sampleBriefing, question, language: "en", token, includeQuestion: true }, "10.6.0.3"),
    );
    expect(response.status).toBe(400);
  });
});
