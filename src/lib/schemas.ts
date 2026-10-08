import { z } from "zod";

// One source of truth: these Zod schemas both (1) tell Claude the exact shape to
// answer in, via toolInputSchema(), and (2) validate what comes back.

export const SourceSchema = z.strictObject({
  id: z.number().int().describe("Short number used to cite this source, starting at 1."),
  title: z.string(),
  url: z.string().describe("Exact URL of a page returned by your web searches."),
  publisher: z.string().describe("Organization that published the page."),
});

export const BriefingSchema = z.strictObject({
  in_scope: z
    .boolean()
    .describe("False only if the request has nothing to do with politics, law, government, or civic life."),
  out_of_scope_message: z
    .string()
    .describe("If in_scope is false, a short polite note explaining what Civica can help with. Otherwise empty."),
  title: z.string().describe("Short neutral title for the topic."),
  summary: z.string().describe("2-4 sentence plain-language explanation a 9th grader could follow."),
  what_it_does: z.array(z.string()).describe("Concrete things the policy, law, institution, or event actually does."),
  why_it_matters: z.array(z.string()).describe("Who is affected and how, stated factually."),
  key_facts: z
    .array(
      z.strictObject({
        fact: z.string(),
        source_ids: z.array(z.number().int()).describe("ids from `sources` that support this fact."),
      }),
    )
    .describe("Verifiable factual claims, each tied to sources."),
  perspectives: z
    .array(
      z.strictObject({
        viewpoint: z.string().describe("Neutral descriptive label, e.g. 'Supporters of stricter limits'. No party smears."),
        core_values: z.string().describe("The values or priorities this viewpoint emphasizes."),
        main_arguments: z.array(z.string()).describe("Strongest good-faith arguments, as its advocates would put them."),
      }),
    )
    .describe("At least two competing viewpoints, presented with equal care and length."),
  common_ground: z.array(z.string()).describe("Points most sides agree on, if any."),
  questions_to_consider: z
    .array(z.string())
    .describe("Open questions that help the reader weigh the issue for themselves. Never leading."),
  key_terms: z
    .array(z.strictObject({ term: z.string(), definition: z.string() }))
    .describe("Difficult words or jargon from this topic, defined in plain language."),
  leaders: z
    .array(z.strictObject({ name: z.string(), role: z.string(), relevance: z.string() }))
    .describe("Current officials or institutions central to this issue, as confirmed by search."),
  helpful_websites: z
    .array(z.strictObject({ name: z.string(), url: z.string(), description: z.string() }))
    .describe("Official or nonpartisan sites where the reader can learn more or take action."),
  phone_numbers: z
    .array(z.strictObject({ organization: z.string(), number: z.string(), when_to_call: z.string() }))
    .describe("Only numbers you found in search results, preferring ones local to the user's state."),
  uncertainties: z
    .array(z.string())
    .describe("What is disputed, unknown, still changing, or where evidence is thin."),
  sources: z.array(SourceSchema),
  follow_up_suggestions: z.array(z.string()).describe("3 short follow-up questions the reader might ask next."),
});

export const FollowUpSchema = z.strictObject({
  answer: z
    .string()
    .describe("Plain-language answer in short paragraphs. Cite sources inline as [1], [2] using ids from `sources`."),
  sources: z.array(SourceSchema),
});

export type Source = z.infer<typeof SourceSchema>;
export type Briefing = z.infer<typeof BriefingSchema>;
export type FollowUp = z.infer<typeof FollowUpSchema>;

const UNSUPPORTED_KEYWORDS = new Set(["$schema", "minimum", "maximum"]);

function stripUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupported);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !UNSUPPORTED_KEYWORDS.has(key))
        .map(([key, value]) => [key, stripUnsupported(value)]),
    );
  }
  return node;
}

// Claude's strict tool mode rejects a few JSON Schema keywords Zod emits.
export function toolInputSchema(schema: z.ZodType) {
  return stripUnsupported(z.toJSONSchema(schema)) as {
    type: "object";
    [key: string]: unknown;
  };
}
