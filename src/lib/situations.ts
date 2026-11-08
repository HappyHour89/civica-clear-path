// Situations a reader can pick so a briefing says what changes for someone
// like them. Fixed choices (no free text) keep requests private and the
// prompt predictable.
export const SITUATIONS = {
  renter: "rents their home",
  homeowner: "owns their home",
  student: "is a student",
  parent: "is a parent or caregiver",
  worker: "works for an employer",
  business: "owns a small business",
  senior: "is retired or 65+",
  veteran: "is a veteran or in the military",
  immigrant: "is an immigrant or visa holder",
  benefits: "receives public benefits (e.g. SNAP, Medicaid, Social Security)",
} as const;

export type Situation = keyof typeof SITUATIONS;

export function isSituation(value: unknown): value is Situation {
  return typeof value === "string" && Object.hasOwn(SITUATIONS, value);
}

// Reads a comma-separated list, keeping known situations once each, in order.
export function parseSituations(value: unknown): Situation[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",").map((s) => s.trim()))].filter(isSituation);
}
