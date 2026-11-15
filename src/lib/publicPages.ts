import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { get, list, put } from "@vercel/blob";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { LANGUAGES, type Language } from "./i18n";
import { BriefingSchema, type Briefing } from "./schemas";

// Permanent public pages. A briefing becomes public only when the reader
// presses Publish, and only if Civica's server produced it: /api/ask signs
// every question briefing, and /api/publish refuses anything unsigned or
// edited, so no one can post made-up text under Civica's name. Uploaded
// documents are never signed, so they can never be published.
//
// Pages are stored privately in the project's Vercel Blob store and served
// only through /p/[slug].

export const PageSchema = z.object({
  slug: z.string(),
  language: z.enum(Object.keys(LANGUAGES) as [Language, ...Language[]]),
  question: z.string(),
  briefing: BriefingSchema,
  publishedAt: z.string(),
  // "ai_draft" until a person on the review panel signs off.
  status: z.enum(["ai_draft", "reviewed"]),
  // note: "published" | "reviewed" | "unreviewed" | "corrected" | "noted" | "simplified"
  history: z.array(z.object({ at: z.string(), note: z.string(), by: z.string().optional() })),
  corrections: z.array(z.object({ at: z.string(), text: z.string(), by: z.string().optional() })),
  // Filled in by the review panel (see /review). Older pages have none.
  review: z
    .object({ by: z.string(), at: z.string(), checklist: z.array(z.string()) })
    .nullable()
    .default(null),
  reviewerNote: z.string().default(""),
  simplerSummary: z.string().default(""),
});

export type PublishedPage = z.infer<typeof PageSchema>;

export type LibraryEntry = { slug: string; title: string; summary: string; language: Language; publishedAt: string };

export function serverSecret() {
  if (process.env.PUBLISH_SECRET) return process.env.PUBLISH_SECRET;
  // Without its own setting, derive a key from a server-only secret that
  // never leaves the server.
  const base = process.env.ANTHROPIC_API_KEY ?? process.env.META_AI_API_KEY;
  return base ? createHash("sha256").update(`civica-publish|${base}`).digest("hex") : null;
}

function signed(payload: { briefing: Briefing; question: string; language: Language }) {
  return JSON.stringify([payload.language, payload.question, payload.briefing]);
}

export function signBriefing(payload: { briefing: Briefing; question: string; language: Language }) {
  const key = serverSecret();
  return key ? createHmac("sha256", key).update(signed(payload)).digest("base64url") : null;
}

export function verifyBriefing(payload: { briefing: Briefing; question: string; language: Language }, token: string) {
  const expected = signBriefing(payload);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function slugFor(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
  return `${base || "briefing"}-${randomBytes(4).toString("hex")}`;
}

export function isSlug(value: string) {
  return /^[a-z0-9-]{1,80}$/.test(value);
}

// Newest first when listed alphabetically.
function libraryPath(slug: string, at: Date) {
  return `library/${String(9_999_999_999_999 - at.getTime()).padStart(13, "0")}-${slug}.json`;
}

export async function savePage(page: PublishedPage) {
  const at = new Date(page.publishedAt);
  const entry: LibraryEntry = {
    slug: page.slug,
    title: page.briefing.title,
    summary: page.briefing.summary,
    language: page.language,
    publishedAt: page.publishedAt,
  };
  const options = { access: "private" as const, addRandomSuffix: false, contentType: "application/json" };
  await put(`pages/${page.slug}.json`, JSON.stringify(page), { ...options, allowOverwrite: true });
  await put(libraryPath(page.slug, at), JSON.stringify(entry), options);
}

export async function readJson(pathname: string, fresh = false): Promise<unknown> {
  const result = await get(pathname, { access: "private", useCache: !fresh });
  if (!result || result.statusCode !== 200) return null;
  return JSON.parse(await new Response(result.stream).text());
}

export async function getPage(slug: string): Promise<PublishedPage | null> {
  "use cache";
  cacheTag(`page-${slug}`);
  cacheLife("days");
  if (!isSlug(slug) || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const parsed = PageSchema.safeParse(await readJson(`pages/${slug}.json`));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function listLibrary(limit = 30): Promise<LibraryEntry[]> {
  "use cache";
  cacheTag("library");
  cacheLife("hours");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  try {
    const { blobs } = await list({ prefix: "library/", limit });
    const entries = await Promise.all(blobs.map((blob) => readJson(blob.pathname).catch(() => null)));
    return entries.filter((e): e is LibraryEntry => Boolean(e && typeof e === "object" && "slug" in e));
  } catch {
    return [];
  }
}

// Uncached read for the review desk, which must see the latest version.
export async function readPageFresh(slug: string): Promise<PublishedPage | null> {
  if (!isSlug(slug) || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const parsed = PageSchema.safeParse(await readJson(`pages/${slug}.json`, true));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writePage(page: PublishedPage) {
  await put(`pages/${page.slug}.json`, JSON.stringify(page), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
