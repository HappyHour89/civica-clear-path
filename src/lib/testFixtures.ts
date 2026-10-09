import type { Briefing } from "./schemas";

export const sampleBriefing: Briefing = {
  in_scope: true,
  out_of_scope_message: "",
  title: "The Senate filibuster",
  summary: "The filibuster is a Senate practice that lets a minority of senators delay or block most bills.",
  what_it_does: ["Requires 60 votes to end debate on most legislation."],
  why_it_matters: ["It shapes which bills can pass with a narrow majority."],
  key_facts: [
    { fact: "Ending debate (cloture) requires three-fifths of senators.", source_ids: [1] },
    { fact: "A claim whose source was not retrieved.", source_ids: [2] },
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
    { id: 1, title: "About Filibusters and Cloture", url: "https://www.senate.gov/about/powers-procedures/filibusters-cloture.htm", publisher: "U.S. Senate" },
    { id: 2, title: "Invented page", url: "https://example.com/made-up", publisher: "Unknown" },
  ],
  follow_up_suggestions: ["When was the filibuster created?"],
};
