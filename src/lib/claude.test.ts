import Anthropic from "@anthropic-ai/sdk";
import { Messages } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { Messages as StandardMessages } from "@anthropic-ai/sdk/resources/messages/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as askRoute } from "../app/api/ask/route";
import { CivicaError, parseJsonAnswer, research, resetProviderStateForTests } from "./claude";
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
    resetProviderStateForTests();
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

  it("sends a plain Messages request to Meta AI when CIVICA_PROVIDER=meta", async () => {
    process.env.CIVICA_PROVIDER = "meta";
    process.env.META_AI_API_KEY = "meta-key";
    try {
      const spy = mockResponses({ stop_reason: "tool_use", content: [toolCall("submit_answer", followUp)] });
      await research({
        messages: [{ role: "user", content: "q" }],
        toolName: "submit_answer",
        toolDescription: "d",
        schema: FollowUpSchema,
        maxSearches: 3,
      });
      const params = spy.mock.calls[0][0] as unknown as Record<string, unknown>;
      expect(params.model).toBe("muse-wonder-1.0");
      expect(params).not.toHaveProperty("betas");
      expect(params).not.toHaveProperty("fallbacks");
      expect(params).not.toHaveProperty("output_config");
      const client = spy.mock.contexts[0] as unknown as { _client: Anthropic };
      expect(client._client.baseURL).toBe("https://api.meta.ai");
      expect(client._client.authToken).toBe("meta-key");
      expect(client._client.apiKey).toBeNull();
    } finally {
      delete process.env.CIVICA_PROVIDER;
      delete process.env.META_AI_API_KEY;
    }
  });

  it("retries Meta with a minimal request after a 400, and keeps using it", async () => {
    process.env.CIVICA_PROVIDER = "meta";
    process.env.META_AI_API_KEY = "meta-key";
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const spy = vi.spyOn(Messages.prototype, "create");
      spy.mockRejectedValueOnce(new Anthropic.BadRequestError(400, undefined, "unknown tool type", new Headers()));
      spy.mockResolvedValue({ stop_reason: "tool_use", content: [toolCall("submit_answer", followUp)] } as never);
      const options = {
        messages: [{ role: "user" as const, content: "q" }],
        toolName: "submit_answer",
        toolDescription: "d",
        schema: FollowUpSchema,
        maxSearches: 3,
      };
      const { data } = await research(options);
      expect(data).toEqual(followUp);
      await research(options);

      type Params = { tools: { name: string; strict?: boolean }[]; system: unknown };
      const [full, retry, next] = spy.mock.calls.map((call) => call[0] as unknown as Params);
      expect(full.tools.map((t) => t.name)).toEqual(["web_search", "submit_answer"]);
      for (const minimal of [retry, next]) {
        expect(minimal.tools).toHaveLength(1);
        expect(minimal.tools[0]).not.toHaveProperty("strict");
        expect(typeof minimal.system).toBe("string");
      }
      expect(spy).toHaveBeenCalledTimes(3);
    } finally {
      delete process.env.CIVICA_PROVIDER;
      delete process.env.META_AI_API_KEY;
    }
  });

  it("falls back to a no-tools JSON answer when Meta rejects tool requests", async () => {
    process.env.CIVICA_PROVIDER = "meta";
    process.env.META_AI_API_KEY = "meta-key";
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const toolSpy = vi.spyOn(Messages.prototype, "create");
      toolSpy.mockRejectedValue(new Anthropic.BadRequestError(400, undefined, "tools not supported", new Headers()));
      const textSpy = vi.spyOn(StandardMessages.prototype, "create").mockResolvedValue({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "```json\n" + JSON.stringify(followUp) + "\n```" }],
      } as never);
      const options = {
        messages: [{ role: "user" as const, content: "q" }],
        toolName: "submit_answer",
        toolDescription: "d",
        schema: FollowUpSchema,
        maxSearches: 3,
      };
      const { data, searchedUrls } = await research(options);
      expect(data).toEqual(followUp);
      expect(searchedUrls.size).toBe(0);
      expect(toolSpy).toHaveBeenCalledTimes(2);
      const params = textSpy.mock.calls[0][0] as unknown as Record<string, unknown>;
      expect(params).not.toHaveProperty("tools");
      expect(params.system).toContain("JSON Schema");

      // Later requests go straight to the JSON form.
      await research(options);
      expect(toolSpy).toHaveBeenCalledTimes(2);
      expect(textSpy).toHaveBeenCalledTimes(2);
    } finally {
      delete process.env.CIVICA_PROVIDER;
      delete process.env.META_AI_API_KEY;
    }
  });

  it("keeps the provider's reason out of the user-facing error", async () => {
    process.env.CIVICA_PROVIDER = "meta";
    process.env.META_AI_API_KEY = "meta-key";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const body = { type: "error", error: { type: "invalid_request_error", message: "model: unknown model" } };
    try {
      vi.spyOn(Messages.prototype, "create").mockRejectedValue(
        new Anthropic.BadRequestError(400, body, "400 raw", new Headers()),
      );
      vi.spyOn(StandardMessages.prototype, "create").mockRejectedValue(
        new Anthropic.BadRequestError(400, body, "400 raw", new Headers()),
      );
      const error = await research({
        messages: [{ role: "user", content: "q" }],
        toolName: "t",
        toolDescription: "d",
        schema: FollowUpSchema,
        maxSearches: 1,
      }).catch((e) => e);
      expect(error).toBeInstanceOf(CivicaError);
      expect(error.status).toBe(400);
      expect(error.message).not.toContain("unknown model");
    } finally {
      delete process.env.CIVICA_PROVIDER;
      delete process.env.META_AI_API_KEY;
    }
  });

  it("parses JSON answers wrapped in prose and reports schema problems", () => {
    expect(parseJsonAnswer(`Sure! ${JSON.stringify(followUp)} Hope that helps.`, FollowUpSchema)).toEqual({
      ok: true,
      data: followUp,
    });
    const bad = parseJsonAnswer('{"answer": 5}', FollowUpSchema);
    expect(bad.ok).toBe(false);
    expect(parseJsonAnswer("no json here", FollowUpSchema)).toEqual({ ok: false, error: "no JSON object found" });
  });

  it("turns a billing rejection into a friendly 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const body = { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low" } };
    vi.spyOn(Messages.prototype, "create").mockRejectedValueOnce(
      new Anthropic.BadRequestError(400, body, "400 raw", new Headers()),
    );
    const error = await research({ messages: [], toolName: "t", toolDescription: "d", schema: FollowUpSchema, maxSearches: 1 }).catch((e) => e);
    expect(error.status).toBe(503);
    expect(error.message).not.toMatch(/credit/i);
  });

  it("retries Claude once with a plain request after a 400, then keeps using it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi
      .spyOn(Messages.prototype, "create")
      .mockRejectedValueOnce(new Anthropic.BadRequestError(400, undefined, "bad", new Headers()))
      .mockResolvedValueOnce({ stop_reason: "tool_use", content: [toolCall("t", followUp)] } as never)
      .mockResolvedValueOnce({ stop_reason: "tool_use", content: [toolCall("t", followUp)] } as never);
    const options = { messages: [], toolName: "t", toolDescription: "d", schema: FollowUpSchema, maxSearches: 1 };
    await expect(research(options)).resolves.toMatchObject({ data: followUp });
    const retry = spy.mock.calls[1][0] as unknown as Record<string, unknown>;
    expect(retry).not.toHaveProperty("betas");
    expect(retry).not.toHaveProperty("output_config");
    const tools = retry.tools as { name: string; strict?: boolean }[];
    expect(tools.map((tool) => tool.name)).toEqual(["web_search", "t"]);
    expect(tools[1]).not.toHaveProperty("strict");

    await research(options);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls[2][0]).not.toHaveProperty("betas");
  });

  it("gives up after the plain request is rejected too", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi
      .spyOn(Messages.prototype, "create")
      .mockRejectedValue(new Anthropic.BadRequestError(400, undefined, "bad", new Headers()));
    await expect(
      research({ messages: [], toolName: "t", toolDescription: "d", schema: FollowUpSchema, maxSearches: 1 }),
    ).rejects.toMatchObject({ status: 400 });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("uses Meta mode for the Claude Code-style ANTHROPIC_BASE_URL setup", async () => {
    const saved = { ...process.env };
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_BASE_URL = "https://api.meta.ai";
    process.env.ANTHROPIC_AUTH_TOKEN = "meta-token";
    process.env.ANTHROPIC_MODEL = "muse-wonder-1.0";
    try {
      const spy = mockResponses({ stop_reason: "tool_use", content: [toolCall("submit_answer", followUp)] });
      await research({
        messages: [{ role: "user", content: "q" }],
        toolName: "submit_answer",
        toolDescription: "d",
        schema: FollowUpSchema,
        maxSearches: 3,
      });
      const params = spy.mock.calls[0][0] as unknown as Record<string, unknown>;
      expect(params.model).toBe("muse-wonder-1.0");
      expect(params).not.toHaveProperty("betas");
      const client = spy.mock.contexts[0] as unknown as { _client: Anthropic };
      expect(client._client.baseURL).toBe("https://api.meta.ai");
      expect(client._client.authToken).toBe("meta-token");
    } finally {
      process.env = saved;
    }
  });

  it("can turn web search off for providers that lack it", async () => {
    process.env.CIVICA_WEB_SEARCH = "off";
    try {
      const spy = mockResponses({ stop_reason: "tool_use", content: [toolCall("submit_answer", followUp)] });
      await research({
        messages: [{ role: "user", content: "q" }],
        toolName: "submit_answer",
        toolDescription: "d",
        schema: FollowUpSchema,
        maxSearches: 3,
      });
      const params = spy.mock.calls[0][0] as unknown as { tools: { name: string }[] };
      expect(params.tools.map((t) => t.name)).toEqual(["submit_answer"]);
    } finally {
      delete process.env.CIVICA_WEB_SEARCH;
    }
  });

  it("names the Meta key when it is missing", async () => {
    process.env.CIVICA_PROVIDER = "meta";
    try {
      const error = await research({
        messages: [],
        toolName: "t",
        toolDescription: "d",
        schema: FollowUpSchema,
        maxSearches: 1,
      }).catch((e) => e);
      expect(error).toBeInstanceOf(CivicaError);
      expect(error.message).toContain("META_AI_API_KEY");
    } finally {
      delete process.env.CIVICA_PROVIDER;
    }
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
    resetProviderStateForTests();
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

  it("tells the model the reader's situations and keeps only verified citations", async () => {
    const spy = mockResponses({
      stop_reason: "tool_use",
      content: [
        searchResult("https://www.senate.gov/about/powers-procedures/filibusters-cloture.htm"),
        toolCall("submit_briefing", sampleBriefing),
      ],
    });
    const response = await askRoute(
      askRequest(
        { question: "What is the filibuster?", language: "en", state: "", situations: "renter,bogus,parent,renter" },
        "10.0.0.9",
      ),
    );
    const { briefing } = await response.json();
    expect(briefing.for_you[0].source_ids).toEqual([1]);

    const params = spy.mock.calls[0][0] as unknown as { messages: { content: { type: string; text?: string }[] }[] };
    const prompt = params.messages[0].content.at(-1)?.text ?? "";
    expect(prompt).toContain("Reader's situations: renter (rents their home); parent (is a parent or caregiver)");
    expect(prompt).not.toContain("bogus");
  });

  it("does not expose the AI provider's reason in error responses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const body = { type: "error", error: { type: "invalid_request_error", message: "max_tokens too large" } };
    vi.spyOn(Messages.prototype, "create").mockRejectedValue(
      new Anthropic.BadRequestError(400, body, "400 raw", new Headers()),
    );
    const response = await askRoute(askRequest({ question: "q", language: "en" }, "10.0.0.10"));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain("max_tokens");
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

  it("keeps clauses worth a second look only for uploaded documents", async () => {
    const watch = { kind: "automatic", title: "Renews every year", explanation: "Unless you cancel.", quote: "shall renew" };
    const withWatch = { ...sampleBriefing, watch_outs: [watch] };
    mockResponses(
      { stop_reason: "tool_use", content: [toolCall("submit_briefing", withWatch)] },
      { stop_reason: "tool_use", content: [toolCall("submit_briefing", withWatch)] },
    );
    const pdf = new File(["%PDF-1.7 fake"], "lease.pdf", { type: "application/pdf" });
    const fromDoc = await askRoute(askRequest({ question: "", language: "en", file: pdf }, "10.0.0.11"));
    expect((await fromDoc.json()).briefing.watch_outs).toEqual([watch]);
    const fromQuestion = await askRoute(askRequest({ question: "What is a lease?", language: "en" }, "10.0.0.12"));
    expect((await fromQuestion.json()).briefing.watch_outs).toEqual([]);
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
