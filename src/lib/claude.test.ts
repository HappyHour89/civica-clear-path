import Anthropic from "@anthropic-ai/sdk";
import { Messages } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as askRoute } from "../app/api/ask/route";
import { CivicaError, research } from "./claude";
import { BriefingSchema, FollowUpSchema } from "./schemas";
import { sampleBriefing } from "./testFixtures";

type FakeMessage = { stop_reason: string; content: unknown[] };

function searchResult(...urls: string[]) {
  return {
    type: "web_search_tool_result",
    tool_use_id: "srvtoolu_1",
    content: urls.map((url) => ({ type: "web_search_result", url, title: url, encrypted_content: "x", page_age: null })),
  };
}

function toolCall(name: string, input: unknown) {
  return { type: "tool_use", id: "toolu_1", name, input };
}

function mockResponses(...responses: FakeMessage[]) {
  const spy = vi.spyOn(Messages.prototype, "create");
  for (const response of responses) {
    spy.mockResolvedValueOnce(response as never);
  }
  return spy;
}

const followUp = { answer: "Cloture needs 60 votes [1].", sources: [] };

describe("research", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resumes a paused search turn and returns the validated tool answer", async () => {
    const paused = { stop_reason: "pause_turn", content: [searchResult("https://a.gov/x")] };
    const spy = mockResponses(paused, {
      stop_reason: "tool_use",
      content: [searchResult("https://b.gov/y"), toolCall("submit_answer", followUp)],
    });

    const { data, searchedUrls } = await research({
      messages: [{ role: "user", content: "q" }],
      toolName: "submit_answer",
      toolDescription: "d",
      schema: FollowUpSchema,
      maxSearches: 2,
    });

    expect(data).toEqual(followUp);
    expect([...searchedUrls]).toEqual(["a.gov/x", "b.gov/y"]);
    const secondCall = spy.mock.calls[1][0] as { messages: unknown[] };
    // A paused turn is sent back as-is, with no extra user message.
    expect(secondCall.messages).toEqual([
      { role: "user", content: "q" },
      { role: "assistant", content: paused.content },
    ]);
  });

  it("sends the expected request shape", async () => {
    const spy = mockResponses({ stop_reason: "tool_use", content: [toolCall("submit_answer", followUp)] });
    await research({
      messages: [{ role: "user", content: "q" }],
      toolName: "submit_answer",
      toolDescription: "d",
      schema: FollowUpSchema,
      maxSearches: 3,
    });
    const params = spy.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(params).toMatchObject({
      model: "claude-opus-5-5",
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
      tool_choice: { type: "auto" },
    });
    expect(params).not.toHaveProperty("thinking");
    const tools = params.tools as { name: string; strict?: boolean; max_uses?: number }[];
    expect(tools[0]).toMatchObject({ name: "web_search", max_uses: 3 });
    expect(tools[1]).toMatchObject({ name: "submit_answer", strict: true });
  });

  it("asks for the tool when Claude answers in prose", async () => {
    const prose = { stop_reason: "end_turn", content: [{ type: "text", text: "Here is an answer" }] };
    const spy = mockResponses(prose, { stop_reason: "tool_use", content: [toolCall("submit_answer", followUp)] });
    await research({
      messages: [{ role: "user", content: "q" }],
      toolName: "submit_answer",
      toolDescription: "d",
      schema: FollowUpSchema,
      maxSearches: 1,
    });
    const secondCall = spy.mock.calls[1][0] as { messages: { role: string; content: unknown }[] };
    expect(secondCall.messages.at(-1)).toEqual({
      role: "user",
      content: "Please call the submit_answer tool now with your complete answer.",
    });
  });

  it("turns a refusal into a friendly error", async () => {
    mockResponses({ stop_reason: "refusal", content: [] });
    await expect(
      research({ messages: [], toolName: "t", toolDescription: "d", schema: FollowUpSchema, maxSearches: 1 }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("rejects answers that do not match the schema", async () => {
    mockResponses({ stop_reason: "tool_use", content: [toolCall("submit_briefing", { title: "only a title" })] });
    await expect(
      research({ messages: [], toolName: "submit_briefing", toolDescription: "d", schema: BriefingSchema, maxSearches: 1 }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("maps API rate limits to HTTP 429", async () => {
    vi.spyOn(Messages.prototype, "create").mockRejectedValueOnce(
      new Anthropic.RateLimitError(429, undefined, "rate limited", new Headers()),
    );
    await expect(
      research({ messages: [], toolName: "t", toolDescription: "d", schema: FollowUpSchema, maxSearches: 1 }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("fails clearly when the API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const error = await research({
      messages: [],
      toolName: "t",
      toolDescription: "d",
      schema: FollowUpSchema,
      maxSearches: 1,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(CivicaError);
    expect(error.status).toBe(500);
  });
});

describe("POST /api/ask", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function askRequest(fields: Record<string, string | Blob>, ip: string) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return new Request("http://localhost/api/ask", {
      method: "POST",
      body: form,
      headers: { "x-forwarded-for": ip },
    });
  }

  it("drops unverified sources and unsafe links before responding", async () => {
    const spy = mockResponses({
      stop_reason: "tool_use",
      content: [
        searchResult("https://www.senate.gov/about/powers-procedures/filibusters-cloture.htm/"),
        toolCall("submit_briefing", sampleBriefing),
      ],
    });

    const response = await askRoute(
      askRequest({ question: "What is the filibuster?", language: "ko", state: "CA" }, "10.0.0.1"),
    );
    const { briefing } = await response.json();

    expect(response.status).toBe(200);
    expect(briefing.sources.map((s: { id: number }) => s.id)).toEqual([1]);
    expect(briefing.key_facts[1].source_ids).toEqual([]);
    expect(briefing.helpful_websites).toHaveLength(1);

    const params = spy.mock.calls[0][0] as unknown as { messages: { content: { type: string; text?: string }[] }[] };
    const prompt = params.messages[0].content.at(-1)?.text ?? "";
    expect(prompt).toContain("Korean");
    expect(prompt).toContain("California (CA)");
    expect(prompt).toContain("<user_question>\nWhat is the filibuster?\n</user_question>");
  });

  it("requires a question or a file", async () => {
    const response = await askRoute(askRequest({ question: "  ", language: "en" }, "10.0.0.2"));
    expect(response.status).toBe(400);
  });

  it("rejects unsupported languages", async () => {
    const response = await askRoute(askRequest({ question: "Hi", language: "fr" }, "10.0.0.3"));
    expect(response.status).toBe(400);
  });

  it("sends an uploaded PDF to Claude as a document", async () => {
    const spy = mockResponses({ stop_reason: "tool_use", content: [toolCall("submit_briefing", sampleBriefing)] });
    const pdf = new File(["%PDF-1.7 fake"], "bill.pdf", { type: "application/pdf" });
    const response = await askRoute(askRequest({ question: "", language: "en", file: pdf }, "10.0.0.4"));
    expect(response.status).toBe(200);
    const params = spy.mock.calls[0][0] as unknown as { messages: { content: { type: string; title?: string }[] }[] };
    expect(params.messages[0].content[0]).toMatchObject({ type: "document", title: "bill.pdf" });
  });

  it("rate limits repeated requests from the same visitor", async () => {
    vi.spyOn(Messages.prototype, "create").mockResolvedValue({
      stop_reason: "tool_use",
      content: [toolCall("submit_briefing", sampleBriefing)],
    } as never);
    const statuses = [];
    for (let i = 0; i < 9; i++) {
      statuses.push((await askRoute(askRequest({ question: "q", language: "en" }, "10.0.0.5"))).status);
    }
    expect(statuses.slice(0, 8).every((s) => s === 200)).toBe(true);
    expect(statuses[8]).toBe(429);
  });
});
