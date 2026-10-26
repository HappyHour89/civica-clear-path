import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { SYSTEM_PROMPT } from "./prompts";
import { collectSearchResultUrls } from "./sources";
import { toolInputSchema } from "./schemas";

const MAX_ROUNDS = 5;

export class CivicaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Civica can run on Claude (default) or on Meta AI's Anthropic-compatible
// Messages API. Set CIVICA_PROVIDER=meta and META_AI_API_KEY to use Meta.
type Provider = {
  name: "anthropic" | "meta";
  model: string;
  keyVar: string;
  // Anthropic-only request features: the server-side fallback beta and effort.
  anthropicExtras: boolean;
  webSearch: boolean;
  createClient: () => Anthropic;
};

export function getProvider(env: NodeJS.ProcessEnv = process.env): Provider {
  const webSearch = env.CIVICA_WEB_SEARCH !== "off";
  if (env.CIVICA_PROVIDER === "meta") {
    return {
      name: "meta",
      model: env.CIVICA_MODEL || "muse-wonder-1.0",
      keyVar: "META_AI_API_KEY",
      anthropicExtras: false,
      webSearch,
      createClient: () =>
        new Anthropic({
          baseURL: env.META_AI_BASE_URL || "https://api.meta.ai",
          apiKey: null,
          authToken: env.META_AI_API_KEY,
        }),
    };
  }
  return {
    name: "anthropic",
    model: env.CIVICA_MODEL || "claude-opus-5-5",
    keyVar: "ANTHROPIC_API_KEY",
    anthropicExtras: true,
    webSearch,
    createClient: () => new Anthropic(),
  };
}

let cached: { name: Provider["name"]; client: Anthropic } | null = null;

function getClient(provider: Provider) {
  if (!process.env[provider.keyVar]) {
    throw new CivicaError(`The server is missing its ${provider.keyVar} setting.`, 500);
  }
  if (cached?.name !== provider.name) cached = { name: provider.name, client: provider.createClient() };
  return cached.client;
}

export async function research<T>(options: {
  messages: Anthropic.Beta.BetaMessageParam[];
  toolName: string;
  toolDescription: string;
  schema: z.ZodType<T>;
  maxSearches: number;
}): Promise<{ data: T; searchedUrls: Set<string> }> {
  const messages = [...options.messages];
  const searchedUrls = new Set<string>();

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await callClaude({ ...options, messages });
    collectSearchResultUrls(response.content, searchedUrls);

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
      return { data: parsed.data, searchedUrls };
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

async function callClaude(options: {
  messages: Anthropic.Beta.BetaMessageParam[];
  toolName: string;
  toolDescription: string;
  schema: z.ZodType;
  maxSearches: number;
}) {
  const provider = getProvider();
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      name: options.toolName,
      description: options.toolDescription,
      strict: true,
      input_schema: toolInputSchema(options.schema),
    },
  ];
  if (provider.webSearch) {
    tools.unshift({ type: "web_search_20260209", name: "web_search", max_uses: options.maxSearches });
  }
  try {
    return await getClient(provider).beta.messages.create({
      model: provider.model,
      max_tokens: 16000,
      ...(provider.anthropicExtras && {
        // If a safety classifier declines, the API retries on its recommended
        // fallback model inside the same call instead of failing outright.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
      }),
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools,
      tool_choice: { type: "auto" },
      messages: options.messages,
    });
  } catch (error) {
    throw toCivicaError(error);
  }
}

function toCivicaError(error: unknown): CivicaError {
  if (error instanceof CivicaError) return error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("AI provider credentials rejected", error.message);
    return new CivicaError("The server's AI credentials are invalid.", 500);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new CivicaError("Civica is busy right now. Please wait a minute and try again.", 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error("Anthropic rejected the request", error.message);
    return new CivicaError("The request couldn't be processed. If you uploaded a file, try a smaller or different one.", 400);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new CivicaError("Couldn't reach the AI service. Please try again.", 503);
  }
  if (error instanceof Anthropic.APIError) {
    console.error("Anthropic API error", error.status, error.message);
    return new CivicaError("The AI service had a problem. Please try again.", 502);
  }
  console.error("Unexpected error calling Claude", error);
  return new CivicaError("Something went wrong. Please try again.", 500);
}
