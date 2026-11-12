import type { Bill, Briefing, Comparison } from "./schemas";

export const sampleBriefing: Briefing = {
  in_scope: true,
  out_of_scope_message: "",
  title: "The Senate filibuster",
  summary: "The filibuster is a Senate practice that lets a minority of senators delay or block most bills.",
  for_you: [
    {
      situation: "",
      who: "If you contact your senators",
      what_changes: "A bill your senators support can still stall without 60 votes.",
      certainty: "clear",
      source_ids: [1, 2],
    },
  ],
  watch_outs: [],
  what_it_does: ["Requires 60 votes to end debate on most legislation."],
  why_it_matters: ["It shapes which bills can pass with a narrow majority."],
  key_facts: [
    { fact: "Ending debate (cloture) requires three-fifths of senators.", source_ids: [1], disputed: false },
    { fact: "A claim whose source was not retrieved.", source_ids: [2], disputed: true },
  ],
  perspectives: [
    {
      viewpoint: "Supporters of keeping the filibuster",
      core_values: "Stability and protecting minority input",
      main_arguments: ["It forces broader agreement before major laws change."],
    },
    {
      viewpoint: "Supporters of changing the filibuster",
      core_values: "Majority rule and responsiveness",
      main_arguments: ["It lets a minority block bills most senators support."],
    },
  ],
  common_ground: ["Both sides value deliberation."],
  questions_to_consider: ["How much agreement should a major law require?"],
  key_terms: [{ term: "Cloture", definition: "A vote to end debate." }],
  leaders: [{ name: "Example Leader", role: "Senate Majority Leader", relevance: "Schedules floor votes." }],
  helpful_websites: [
    { name: "U.S. Senate glossary", url: "https://www.senate.gov/reference/glossary.htm", description: "Official definitions." },
    { name: "Bad link", url: "javascript:alert(1)", description: "Should be removed." },
  ],
  phone_numbers: [{ organization: "U.S. Capitol Switchboard", number: "(202) 224-3121", when_to_call: "To reach any member's office." }],
  uncertainties: ["Proposals to change the rule are ongoing."],
  sources: [
    {
      id: 1,
      title: "About Filibusters and Cloture",
      url: "https://www.senate.gov/about/powers-procedures/filibusters-cloture.htm",
      publisher: "U.S. Senate",
      source_type: "government",
      published: "",
      excerpt: "Cloture is the only procedure by which the Senate can vote to place a time limit on consideration of a bill.",
    },
    {
      id: 2,
      title: "Invented page",
      url: "https://example.com/made-up",
      publisher: "Unknown",
      source_type: "other",
      published: "2026-01-01",
      excerpt: "",
    },
  ],
  follow_up_suggestions: ["When was the filibuster created?"],
};

export const sampleComparison: Comparison = {
  in_scope: true,
  out_of_scope_message: "",
  title: "Lease: 2025 vs 2026",
  summary: "Rent rises and a late fee was added.",
  same_document: true,
  mismatch_note: "",
  changes: [
    {
      kind: "changed",
      topic: "Monthly rent",
      before: "Rent is $1,800 per month.",
      after: "Rent is $1,950 per month.",
      what_it_means: "Rent goes up $150 a month.",
      significance: "major",
    },
    {
      kind: "added",
      topic: "Late fee",
      before: "",
      after: "A $75 late fee applies after the 3rd.",
      what_it_means: "Paying late now costs $75.",
      significance: "moderate",
    },
  ],
  for_you: [
    { situation: "renter", who: "If you rent", what_changes: "You pay $150 more.", certainty: "clear", source_ids: [9] },
  ],
  questions_to_consider: ["Can you negotiate the increase?"],
  key_terms: [{ term: "Late fee", definition: "A charge for paying after the due date." }],
  sources: [],
};

export const sampleBill: Bill = {
  found: true,
  not_found_message: "",
  possible_matches: [],
  jurisdiction: "U.S. Congress",
  number: "H.R. 1234",
  session: "119th Congress",
  title: "Example Online Safety Act",
  nickname: "",
  summary: "Sets new rules for online platforms.",
  stage: "committee",
  status_text: "In committee.",
  last_action: "Referred to committee.",
  last_action_date: "2026-03-01",
  next_step: "A committee vote.",
  timeline: [
    { date: "2026-03-01", event: "Referred to committee." },
    { date: "2026-02-20", event: "Introduced." },
  ],
  sponsors: [{ name: "Rep. Example", detail: "D-CA" }],
  official_url: "https://www.congress.gov/bill/119th-congress/house-bill/1234",
  sources: [
    {
      id: 1,
      title: "H.R.1234",
      url: "https://www.congress.gov/bill/119th-congress/house-bill/1234",
      publisher: "Congress.gov",
      source_type: "government",
      published: "",
      excerpt: "",
    },
  ],
};
