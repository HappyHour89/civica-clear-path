import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { SYSTEM_PROMPT } from "./prompts";
import { collectSearchResultUrls } from "./sources";
import { toolInputSchema } from "./schemas";

const MAX_ROUNDS = 5;
// Per API call. A full answer with web search usually takes 60–90 seconds;
// the routes allow 300 seconds in total.
const REQUEST_TIMEOUT_MS = 180_000;

export class CivicaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Civica can run on Claude (default) or on Meta AI's Anthropic-compatible
// Messages API. Meta mode is used when CIVICA_PROVIDER=meta, or when
// ANTHROPIC_BASE_URL points at api.meta.ai (the Claude Code setup Meta
// documents), so the same environment variables work for both.
type Provider = {
  name: "anthropic" | "meta";
  model: string;
  key: string | undefined;
  // Settings that hold the key, named in the error when none is set.
  keyVars: string;
  // Anthropic-only request features: the server-side fallback beta and effort.
  anthropicExtras: boolean;
  webSearch: boolean;
  createClient: () => Anthropic;
};

function pointsAtMeta(url: string | undefined) {
  try {
    return url ? new URL(url).hostname.endsWith("meta.ai") : false;
  } catch {
    return false;
  }
}

export function getProvider(env: NodeJS.ProcessEnv = process.env): Provider {
  const webSearch = env.CIVICA_WEB_SEARCH !== "off";
  if (env.CIVICA_PROVIDER === "meta" || pointsAtMeta(env.ANTHROPIC_BASE_URL)) {
    const key = env.META_AI_API_KEY || env.ANTHROPIC_AUTH_TOKEN || env.MODEL_API_KEY;
    const baseURL =
      env.META_AI_BASE_URL || (pointsAtMeta(env.ANTHROPIC_BASE_URL) ? env.ANTHROPIC_BASE_URL : undefined);
    return {
      name: "meta",
      model: env.CIVICA_MODEL || env.ANTHROPIC_MODEL || "muse-wonder-1.0",
      key,
      keyVars: "META_AI_API_KEY (or ANTHROPIC_AUTH_TOKEN)",
      anthropicExtras: false,
      webSearch,
      createClient: () =>
        new Anthropic({ baseURL: baseURL || "https://api.meta.ai", apiKey: null, authToken: key, timeout: REQUEST_TIMEOUT_MS }),
    };
  }
  return {
    name: "anthropic",
    model: env.CIVICA_MODEL || "claude-opus-5-5",
    key: env.ANTHROPIC_API_KEY,
    keyVars: "ANTHROPIC_API_KEY",
    anthropicExtras: true,
    webSearch,
    createClient: () => new Anthropic({ timeout: REQUEST_TIMEOUT_MS }),
  };
}

let cached: { name: Provider["name"]; client: Anthropic } | null = null;

function getClient(provider: Provider) {
  if (!provider.key) {
    throw new CivicaError(`The server is missing its ${provider.keyVars} setting.`, 500);
  }
  if (cached?.name !== provider.name) cached = { name: provider.name, client: provider.createClient() };
  return cached.client;
}

type ResearchOptions<T> = {
  messages: Anthropic.Beta.BetaMessageParam[];
  toolName: string;
  toolDescription: string;
  schema: z.ZodType<T>;
  maxSearches: number;
};

type ResearchResult<T> = { data: T; searchedUrls: Set<string>; pageAges: Map<string, string> };

// Meta's endpoint may not support every Claude feature, so a rejected request
// steps down to a simpler form: first without web search, strict tools or
// prompt caching, then with no tools at all (the answer comes back as JSON
// text). The accepted form is remembered for later requests.
// "compat" is Claude's fallback: web search and the tool stay, but without
// strict schema mode, beta features or effort settings, any of which an API
// change can start rejecting.
type Level = "full" | "compat" | "basic-tools" | "json-text";
const META_LEVELS: Level[] = ["full", "basic-tools", "json-text"];
let metaLevel = 0;
let claudeCompat = false;

export function resetProviderStateForTests() {
  metaLevel = 0;
  claudeCompat = false;
  cached = null;
}

export async function research<T>(options: ResearchOptions<T>): Promise<ResearchResult<T>> {
  const provider = getProvider();
  const client = getClient(provider);
  if (provider.name !== "meta") {
    if (!claudeCompat) {
      try {
        return await researchWithTools(client, provider, options, "full");
      } catch (error) {
        if (!(error instanceof Anthropic.BadRequestError) || isBillingError(error)) throw toCivicaError(error);
        // Logged so the cause shows up in the server logs (Vercel > Logs).
        console.error("Claude rejected the full request; retrying without strict mode or betas.", providerMessage(error));
      }
    }
    try {
      const result = await researchWithTools(client, provider, options, "compat");
      claudeCompat = true;
      return result;
    } catch (error) {
      throw toCivicaError(error);
    }
  }
  for (;;) {
    const index = metaLevel;
    const level = META_LEVELS[index];
    try {
      return level === "json-text"
        ? await researchWithJson(client, provider, options)
        : await researchWithTools(client, provider, options, level);
    } catch (error) {
      if (!(error instanceof Anthropic.BadRequestError) || index === META_LEVELS.length - 1) {
        throw toCivicaError(error);
      }
      console.error(`Meta AI rejected the "${level}" request; trying a simpler one.`, providerMessage(error));
      metaLevel = Math.max(metaLevel, index + 1);
    }
  }
}

async function researchWithTools<T>(
  client: Anthropic,
  provider: Provider,
  options: ResearchOptions<T>,
  level: Exclude<Level, "json-text">,
): Promise<ResearchResult<T>> {
  const messages = [...options.messages];
  const searchedUrls = new Set<string>();
  const pageAges = new Map<string, string>();

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.beta.messages.create(buildRequest(provider, { ...options, messages }, level));
    collectSearchResultUrls(response.content, searchedUrls, pageAges);

    if (response.stop_reason === "refusal") {
      throw new CivicaError("This request couldn't be answered. Try rephrasing your question.", 422);
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.Beta.BetaToolUseBlock =>
        block.type === "tool_use" && block.name === options.toolName,
    );
    if (toolUse) {
      const parsed = options.schema.safeParse(toolUse.input);
      if (!parsed.success) {
        console.error("Claude returned an invalid answer shape", parsed.error.issues);
        throw new CivicaError("The answer came back in an unexpected format. Please try again.", 502);
      }
      return { data: parsed.data, searchedUrls, pageAges };
    }

    if (response.stop_reason === "max_tokens") {
      throw new CivicaError("The answer was too long to finish. Try a narrower question.", 502);
    }

    messages.push({ role: "assistant", content: response.content });
    // pause_turn means the server paused a long web-search turn: send it back
    // unchanged to resume. Otherwise Claude answered in prose, so ask for the tool.
    if (response.stop_reason !== "pause_turn") {
      messages.push({
        role: "user",
        content: `Please call the ${options.toolName} tool now with your complete answer.`,
      });
    }
  }

  throw new CivicaError("Research took too many steps. Please try again.", 504);
}

// The most compatible form: a plain Messages request with no tools, asking
// for the answer as a JSON object in the reply text. No web search happens,
// so no source can be verified.
async function researchWithJson<T>(
  client: Anthropic,
  provider: Provider,
  options: ResearchOptions<T>,
): Promise<ResearchResult<T>> {
  const system = [
    SYSTEM_PROMPT,
    // Overrides the prompt's search and tool instructions, which don't apply here.
    "For this answer you have no web search and no tool to call. Answer from what you know, flag anything that may be out of date as uncertain, and leave any list of sources or phone numbers empty: never cite pages or numbers you have not retrieved.",
    `Instead of calling a tool, reply with only a JSON object, with no other text and no code fences, that matches this JSON Schema:\n${JSON.stringify(toolInputSchema(options.schema))}`,
  ].join("\n\n");
  const messages = [...options.messages] as Anthropic.MessageParam[];

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.messages.create({
      model: provider.model,
      max_tokens: 8192,
      system,
      messages,
    });
    if (response.stop_reason === "refusal") {
      throw new CivicaError("This request couldn't be answered. Try rephrasing your question.", 422);
    }
    const text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("");
    const problem = parseJsonAnswer(text, options.schema);
    if (problem.ok) return { data: problem.data, searchedUrls: new Set(), pageAges: new Map() };
    console.error("Meta AI returned an unusable JSON answer", problem.error);
    if (response.stop_reason === "max_tokens") {
      throw new CivicaError("The answer was too long to finish. Try a narrower question.", 502);
    }
    messages.push(
      { role: "assistant", content: text || "(empty reply)" },
      {
        role: "user",
        content: `That reply could not be used (${problem.error}). Reply again with only the corrected JSON object.`,
      },
    );
  }
  throw new CivicaError("The answer came back in an unexpected format. Please try again.", 502);
}

export function parseJsonAnswer<T>(
  text: string,
  schema: z.ZodType<T>,
): { ok: true; data: T } | { ok: false; error: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return { ok: false, error: "no JSON object found" };
  let value: unknown;
  try {
    value = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    return { ok: false, error: `does not match the schema: ${issues.join("; ")}` };
  }
  return { ok: true, data: parsed.data };
}

function buildRequest(
  provider: Provider,
  options: ResearchOptions<unknown>,
  level: Exclude<Level, "json-text">,
): Anthropic.Beta.MessageCreateParamsNonStreaming {
  const full = level === "full";
  // Claude keeps web search and its larger output in compat mode.
  const searching = full || level === "compat";
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      name: options.toolName,
      description: options.toolDescription,
      ...(full && { strict: true }),
      input_schema: toolInputSchema(options.schema),
    },
  ];
  if (provider.webSearch && searching) {
    // The plain search tool: the 20260209 version expects a code-execution
    // tool alongside it, and without one its searches fail and burn max_uses.
    tools.unshift({ type: "web_search_20250305", name: "web_search", max_uses: options.maxSearches });
  }
  return {
    model: provider.model,
    // Some compatible APIs cap output lower than Claude does.
    max_tokens: searching ? 16000 : 8192,
    ...(provider.anthropicExtras && full && {
      // If a safety classifier declines, the API retries on its recommended
      // fallback model inside the same call instead of failing outright.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
    }),
    system: searching ? [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }] : SYSTEM_PROMPT,
    tools,
    tool_choice: { type: "auto" },
    messages: options.messages,
  };
}

// The provider's own error text, e.g. "max_tokens: must be at most 8192".
function providerMessage(error: InstanceType<typeof Anthropic.APIError>) {
  const body = error.error as { error?: { message?: unknown }; message?: unknown } | undefined;
  const message = body?.error?.message ?? body?.message ?? error.message;
  return String(message).slice(0, 300);
}

function isBillingError(error: InstanceType<typeof Anthropic.APIError>) {
  return /credit balance|billing|quota/i.test(providerMessage(error));
}

function toCivicaError(error: unknown): CivicaError {
  if (error instanceof CivicaError) return error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("AI provider credentials rejected", providerMessage(error));
    return new CivicaError("Civica's AI service isn't set up correctly. Please try again later.", 500);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new CivicaError("Civica is busy right now. Please wait a minute and try again.", 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    // Logged in full for the operator; users only see a friendly message.
    const reason = providerMessage(error);
    console.error("AI provider rejected the request", reason);
    if (isBillingError(error)) {
      return new CivicaError("Civica's AI service is temporarily unavailable. Please try again later.", 503);
    }
    return new CivicaError("The AI service couldn't process this request. Please try again or rephrase it.", 400);
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new CivicaError("The AI service took too long to answer. Please try again.", 504);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new CivicaError("Couldn't reach the AI service. Please try again.", 503);
  }
  if (error instanceof Anthropic.APIError) {
    console.error("AI provider API error", error.status, providerMessage(error));
    return new CivicaError("The AI service had a problem. Please try again.", 502);
  }
  console.error("Unexpected error calling Claude", error);
  return new CivicaError("Something went wrong. Please try again.", 500);
}
