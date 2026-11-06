import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { z } from "zod";
import { CivicaError } from "./claude";
import { LANGUAGES } from "./i18n";

// The Premium waitlist is the only thing Civica stores, and only when someone
// asks to join: their email, language and signup time, one private file per
// address in the project's Vercel Blob store (read it in the Vercel dashboard).

export const WaitlistSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  language: z.enum(Object.keys(LANGUAGES) as [keyof typeof LANGUAGES]),
});

export async function joinWaitlist(input: z.infer<typeof WaitlistSchema>, now = new Date()) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new CivicaError("The waitlist isn't open yet. Please try again later.", 503);
  }
  // Named by a hash of the address, so signing up twice keeps a single entry
  // and the address does not appear in file names.
  const id = createHash("sha256").update(input.email).digest("hex").slice(0, 32);
  try {
    await put(
      `waitlist/${id}.json`,
      JSON.stringify({ email: input.email, language: input.language, joinedAt: now.toISOString() }),
      { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json" },
    );
  } catch (error) {
    console.error("Waitlist write failed", error instanceof Error ? error.message : error);
    throw new CivicaError("Couldn't join the waitlist right now. Please try again.", 503);
  }
}
