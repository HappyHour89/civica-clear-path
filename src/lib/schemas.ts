import { z } from "zod";

// One source of truth: these Zod schemas both (1) tell Claude the exact shape to
// answer in, via toolInputSchema(), and (2) validate what comes back.

export const SOURCE_TYPES = [
  "government",
  "court",
  "academic",
  "research",
  "journalism",
  "advocacy",
  "reference",
  "other",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const SourceSchema = z.strictObject({
  id: z.number().int().describe("Short number used to cite this source, starting at 1."),
  title: z.string(),
  url: z.string().describe("Exact URL of a page returned by your web searches."),
  publisher: z.string().describe("Organization that published the page."),
  source_type: z
    .enum(SOURCE_TYPES)
    .describe(
      "government: official government body; court: court opinion or court system; academic: university or peer-reviewed; research: nonpartisan research group or think tank; journalism: news organization; advocacy: group that campaigns for a position; reference: encyclopedia or explainer; other.",
    ),
  published: z
    .string()
    .describe("Publication or last-updated date shown on the page (YYYY-MM-DD when possible), or empty if unknown."),
  excerpt: z
    .string()
    .describe(
      "A short passage from this page, copied word for word from the search result, that supports the facts citing it. Under 300 characters. Empty if you have no exact wording.",
    ),
});

export const ForYouItemSchema = z.strictObject({
  situation: z
    .string()
    .describe("The reader's situation id this item is about (e.g. 'renter'), or empty when no situations were given."),
  who: z.string().describe("Short label for who this is about, e.g. 'If you rent your home'."),
  what_changes: z.string().describe("One or two plain sentences on what concretely changes for them."),
  certainty: z
    .enum(["clear", "depends", "not_affected"])
    .describe("clear: the sources say so directly; depends: it turns on details or pending decisions; not_affected: no direct change."),
  source_ids: z.array(z.number().int()).describe("ids from `sources` that support this item."),
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
  for_you: z
    .array(ForYouItemSchema)
    .describe("What changes for the reader, or for the groups most affected. See the system prompt."),
  watch_outs: z
    .array(
      z.strictObject({
        kind: z
          .enum(["deadline", "money", "rights", "automatic", "penalty", "other"])
          .describe(
            "deadline: a date or time limit; money: fees, costs, or payments; rights: rights given up or limited (e.g. arbitration, waivers); automatic: something that renews or happens unless you act; penalty: consequences for missing or breaking something; other.",
          ),
        title: z.string().describe("A few plain words naming the clause, e.g. 'Rent goes up automatically'."),
        explanation: z.string().describe("One or two plain sentences on what it means for the reader in practice."),
        quote: z
          .string()
          .describe("The clause's exact wording from the uploaded document, under 250 characters. Empty if not quotable."),
      }),
    )
    .describe("Uploaded documents only: clauses worth a second look. Empty for questions without a document."),
  what_it_does: z.array(z.string()).describe("Concrete things the policy, law, institution, or event actually does."),
  why_it_matters: z.array(z.string()).describe("Who is affected and how, stated factually."),
  key_facts: z
    .array(
      z.strictObject({
        fact: z.string(),
        source_ids: z.array(z.number().int()).describe("ids from `sources` that support this fact."),
        disputed: z
          .boolean()
          .describe("True if credible sources disagree about this fact itself, not only about what it means."),
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

export const CHANGE_KINDS = ["added", "removed", "changed"] as const;

// Compare versions: what changed between an older and a newer document.
export const CompareSchema = z.strictObject({
  in_scope: z
    .boolean()
    .describe("False only if the documents have nothing to do with law, government, policy, contracts, or civic life."),
  out_of_scope_message: z.string().describe("If in_scope is false, a short polite note. Otherwise empty."),
  title: z.string().describe("Short neutral title naming the document, e.g. 'Lease renewal: 2025 vs 2026'."),
  summary: z.string().describe("2-4 plain sentences on what changed overall."),
  same_document: z.boolean().describe("False if the two files are not versions of the same document."),
  mismatch_note: z.string().describe("If same_document is false, explain briefly. Otherwise empty."),
  changes: z
    .array(
      z.strictObject({
        kind: z.enum(CHANGE_KINDS).describe("added: only in the newer version; removed: only in the older; changed: in both but different."),
        topic: z.string().describe("A few plain words naming what changed, e.g. 'Late fee'."),
        before: z.string().describe("Exact wording from the OLDER version, under 300 characters. Empty when kind is added."),
        after: z.string().describe("Exact wording from the NEWER version, under 300 characters. Empty when kind is removed."),
        what_it_means: z.string().describe("One or two plain sentences on what this change means in practice and for whom."),
        significance: z
          .enum(["major", "moderate", "minor"])
          .describe("major: changes money, rights, deadlines, or obligations in a big way; moderate: noticeable; minor: small."),
      }),
    )
    .describe("Every meaningful change, most significant first. Ignore pure formatting, numbering, and typo fixes."),
  for_you: z.array(ForYouItemSchema).describe("What these changes mean for the reader's situations, or the groups most affected."),
  questions_to_consider: z.array(z.string()).describe("Open questions that help the reader decide what to do. Never leading."),
  key_terms: z
    .array(z.strictObject({ term: z.string(), definition: z.string() }))
    .describe("Difficult words from the documents, defined in plain language."),
  sources: z.array(SourceSchema).describe("Only pages you searched for context, if any. Usually empty."),
});

export const BILL_STAGES = [
  "introduced",
  "committee",
  "passed_one_chamber",
  "passed_both",
  "to_executive",
  "enacted",
  "vetoed",
  "failed",
  "unknown",
] as const;

export type BillStage = (typeof BILL_STAGES)[number];

// Follow a bill: one bill's current status, found by web research.
export const BillSchema = z.strictObject({
  found: z.boolean().describe("False if no real bill matching the request could be verified."),
  not_found_message: z.string().describe("If found is false, a short note on what to try instead. Otherwise empty."),
  possible_matches: z
    .array(z.string())
    .describe("If the request is ambiguous or not found, up to 4 specific bills it might mean, e.g. 'H.R. 1 (119th Congress)'. Otherwise empty."),
  jurisdiction: z.string().describe("'U.S. Congress' or the state legislature, e.g. 'California Legislature'."),
  number: z.string().describe("Official bill number, e.g. 'H.R. 1234' or 'SB 9'."),
  session: z.string().describe("Congress or legislative session, e.g. '119th Congress' or '2025-2026 Regular Session'."),
  title: z.string().describe("Official short title, or the official title shortened."),
  nickname: z.string().describe("Popular name if it has one, e.g. 'Kids Online Safety Act'. Otherwise empty."),
  summary: z.string().describe("2-3 plain sentences on what the bill would do. Neutral."),
  stage: z
    .enum(BILL_STAGES)
    .describe(
      "Furthest point reached: introduced; committee (referred or in committee); passed_one_chamber; passed_both; to_executive (sent to the President or Governor); enacted (signed or became law); vetoed; failed (died, withdrawn, or session ended); unknown.",
    ),
  status_text: z.string().describe("One or two plain sentences on where the bill stands now."),
  last_action: z.string().describe("The most recent official action, in plain words."),
  last_action_date: z.string().describe("Date of the most recent action, YYYY-MM-DD, or empty if unknown."),
  next_step: z.string().describe("What would have to happen next for it to move forward, in plain words."),
  timeline: z
    .array(z.strictObject({ date: z.string().describe("YYYY-MM-DD"), event: z.string() }))
    .describe("Major actions, oldest first, at most 8."),
  sponsors: z.array(z.strictObject({ name: z.string(), detail: z.string().describe("Party and state or district, or role.") })),
  official_url: z.string().describe("The bill's page on the official legislature website, from your searches, or empty."),
  sources: z.array(SourceSchema),
});

export type Source = z.infer<typeof SourceSchema>;
export type Briefing = z.infer<typeof BriefingSchema>;
export type Comparison = z.infer<typeof CompareSchema>;
export type Bill = z.infer<typeof BillSchema>;
export type ForYouItem = z.infer<typeof ForYouItemSchema>;
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
