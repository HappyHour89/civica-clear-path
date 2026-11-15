import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { list, put } from "@vercel/blob";
import { cookies } from "next/headers";
import { z } from "zod";
import { CivicaError } from "./claude";
import { isSlug, readJson, serverSecret } from "./publicPages";

// The review panel. There are no accounts: the owner gives each reviewer a
// name and a passcode in the REVIEWER_CODES setting, e.g.
//   REVIEWER_CODES="Maya:7Hk2-pQ9x,Jordan:Wm4t-Zr8c"
// Signing in sets a signed, httpOnly cookie for 12 hours. The name is what
// readers see next to "Reviewed by".

export const SESSION_COOKIE = "civica_reviewer";
const SESSION_HOURS = 12;

export const CHECKLIST = ["facts", "sources", "balance", "plain"] as const;

function equal(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function reviewerList(raw = process.env.REVIEWER_CODES ?? "") {
  return raw
    .split(",")
    .map((entry) => {
      const at = entry.lastIndexOf(":");
      return { name: entry.slice(0, at).trim(), code: entry.slice(at + 1).trim() };
    })
    .filter((r) => r.name && r.code.length >= 8);
}

export function reviewerForCode(code: string) {
  // Check every entry so the time taken doesn't reveal which one matched.
  let found: string | null = null;
  for (const r of reviewerList()) if (equal(r.code, code)) found = r.name;
  return found;
}

function sign(value: string) {
  const key = serverSecret();
  if (!key) throw new CivicaError("Review isn't set up on this server.", 503);
  return createHmac("sha256", `review|${key}`).update(value).digest("base64url");
}

export function sessionToken(name: string, now = Date.now()) {
  const payload = `${Buffer.from(name).toString("base64url")}.${now + SESSION_HOURS * 3_600_000}`;
  return `${payload}.${sign(payload)}`;
}

export function readSession(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [name, expires, signature] = token.split(".");
  if (!name || !expires || !signature) return null;
  try {
    if (!equal(signature, sign(`${name}.${expires}`)) || Number(expires) < now) return null;
  } catch {
    return null;
  }
  const decoded = Buffer.from(name, "base64url").toString();
  // A reviewer removed from REVIEWER_CODES loses access right away.
  return reviewerList().some((r) => r.name === decoded) ? decoded : null;
}

export async function currentReviewer() {
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value);
}

export async function requireReviewer() {
  const name = await currentReviewer();
  if (!name) throw new CivicaError("Sign in to the review desk first.", 401);
  return name;
}

export const sessionCookie = (value: string, maxAge: number) => ({
  name: SESSION_COOKIE,
  value,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});

// Reader feedback on public pages: one small private file per message.
export const FeedbackSchema = z.object({
  slug: z.string().refine(isSlug),
  kind: z.enum(["clear", "confusing", "error"]),
  message: z.string().trim().max(1000).default(""),
});

export type Feedback = z.infer<typeof FeedbackSchema> & { at: string };

export async function saveFeedback(input: z.infer<typeof FeedbackSchema>, now = new Date()) {
  const entry: Feedback = { ...input, at: now.toISOString() };
  // The kind is in the file name so the queue can count without reading files.
  await put(`feedback/${input.slug}/${now.getTime()}-${input.kind}-${randomBytes(3).toString("hex")}.json`, JSON.stringify(entry), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export async function feedbackFor(slug: string): Promise<Feedback[]> {
  const { blobs } = await list({ prefix: `feedback/${slug}/`, limit: 200 });
  const entries = await Promise.all(blobs.map((b) => readJson(b.pathname, true).catch(() => null)));
  return (entries.filter(Boolean) as Feedback[]).sort((a, b) => b.at.localeCompare(a.at));
}

// Counts per page and kind, for the review queue.
export async function feedbackCounts() {
  const counts: Record<string, Record<Feedback["kind"], number>> = {};
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "feedback/", limit: 1000, cursor });
    for (const blob of page.blobs) {
      const [, slug, file] = blob.pathname.split("/");
      const kind = /-(clear|confusing|error)-/.exec(file ?? "")?.[1] as Feedback["kind"] | undefined;
      if (!slug || !kind) continue;
      counts[slug] ??= { clear: 0, confusing: 0, error: 0 };
      counts[slug][kind] += 1;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return counts;
}
