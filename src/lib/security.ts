import { createHash } from "node:crypto";
import { del, list, put } from "@vercel/blob";
import { clientKey } from "./rateLimit";
import { serverSecret } from "./publicPages";

// Failed review-desk sign-ins. Each one is logged (Vercel > Logs) and kept as
// a small private file for a week, so the limits below hold across all of
// Vercel's servers (the in-memory limiter only sees one server). Addresses are
// stored as a short keyed hash, never in the clear, and passcodes never.

const FAILURES = "security/login-failures/";
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
// Wrong passcodes allowed per address, and in total, per 15 minutes.
export const MAX_FAILURES_PER_ADDRESS = 10;
export const MAX_FAILURES_TOTAL = 60;

// A short keyed hash of the visitor's internet address, never the address.
export function addressHash(request: Request, purpose: string) {
  return createHash("sha256")
    .update(`${purpose}|${serverSecret() ?? ""}|${clientKey(request)}`)
    .digest("hex")
    .slice(0, 12);
}

export function addressTag(request: Request) {
  return addressHash(request, "login");
}

export type FailureCounts = { fromAddress: number; total: number };

export async function recentFailures(tag: string, now = Date.now()): Promise<FailureCounts> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { fromAddress: 0, total: 0 };
  // Records sit in one folder per 15 minutes, so only two small folders are read.
  const bucket = Math.floor(now / LOGIN_WINDOW_MS);
  const pages = await Promise.all(
    [bucket - 1, bucket].map((b) => list({ prefix: `${FAILURES}${b}/`, limit: 1000 })),
  );
  const recent = pages
    .flatMap((page) => page.blobs)
    .filter((b) => now - new Date(b.uploadedAt).getTime() < LOGIN_WINDOW_MS);
  return { fromAddress: recent.filter((b) => b.pathname.endsWith(`-${tag}.json`)).length, total: recent.length };
}

export function isLockedOut(counts: FailureCounts) {
  return counts.fromAddress >= MAX_FAILURES_PER_ADDRESS || counts.total >= MAX_FAILURES_TOTAL;
}

export async function recordFailedLogin(request: Request, tag: string, before: FailureCounts, now = new Date()) {
  const fromAddress = before.fromAddress + 1;
  const total = before.total + 1;
  const country = request.headers.get("x-vercel-ip-country") ?? "unknown";
  console.warn("Review desk sign-in failed", { address: tag, country, fromAddress, total });
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(`${FAILURES}${Math.floor(now.getTime() / LOGIN_WINDOW_MS)}/${now.getTime()}-${tag}.json`, JSON.stringify({ at: now.toISOString(), address: tag, country }), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    }).catch((error) => console.error("Couldn't record failed sign-in", error instanceof Error ? error.message : error));
  }
  // Alert on the first failure from an address, and when a limit is reached.
  if (fromAddress === 1 || fromAddress === MAX_FAILURES_PER_ADDRESS || total === MAX_FAILURES_TOTAL) {
    const lock =
      fromAddress >= MAX_FAILURES_PER_ADDRESS || total >= MAX_FAILURES_TOTAL ? " Sign-in is now paused for 15 minutes." : "";
    await sendSecurityAlert(
      `Civica: wrong review-desk passcode (address ${tag}, ${country}). ${fromAddress} from this address and ${total} in total in the last 15 minutes.${lock}`,
    );
  }
}

// Posts to SECURITY_ALERT_WEBHOOK_URL if set: a Slack or Discord incoming
// webhook, or an ntfy.sh topic for phone notifications. Never throws.
// Forgiving about how the setting was typed: surrounding spaces or quotes are
// dropped, and a missing "https://" is added. Only https URLs are used.
export function alertUrl(raw = process.env.SECURITY_ALERT_WEBHOOK_URL): URL | null {
  const value = (raw ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  if (!value) return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function sendSecurityAlert(text: string, retryDelayMs = 1500) {
  const url = alertUrl();
  if (!url) {
    console.warn("Security alerts are off: SECURITY_ALERT_WEBHOOK_URL is missing or not a valid https URL.");
    return;
  }
  // ntfy shows the request body as the notification, so it gets plain text;
  // Slack reads "text" and Discord reads "content" from JSON.
  const ntfy = url.hostname === "ntfy.sh";
  const send = () =>
    fetch(url, {
      method: "POST",
      headers: ntfy
        ? { "Content-Type": "text/plain; charset=utf-8", Title: "Civica security alert", Tags: "warning" }
        : { "Content-Type": "application/json" },
      body: ntfy ? text : JSON.stringify({ text, content: text }),
      signal: AbortSignal.timeout(5000),
    });
  try {
    let response = await send();
    // Busy shared servers can be told "too many requests"; try once more.
    if (response.status === 429 || response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      response = await send();
    }
    if (response.ok) console.info("Security alert sent", { host: url.hostname });
    else console.error("Security alert was refused", { status: response.status, host: url.hostname });
  } catch (error) {
    console.error("Security alert failed to send", error instanceof Error ? error.message : error);
  }
}

// Daily clean-up (from the cron job): failed sign-in records older than a
// week, and large uploads that were never read (normally deleted at once).
export async function cleanUpSecurityFiles(now = Date.now()) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { deleted: 0 };
  const stale: string[] = [];
  for (const [prefix, maxAge] of [
    [FAILURES, 7 * 24 * 3_600_000],
    ["uploads/", 3_600_000],
    ["ai-calls/", 24 * 3_600_000],
    ["ai-spend/", 100 * 24 * 3_600_000],
  ] as const) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, limit: 1000, cursor });
      for (const blob of page.blobs) {
        if (now - new Date(blob.uploadedAt).getTime() > maxAge) stale.push(blob.url);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  for (let i = 0; i < stale.length; i += 500) await del(stale.slice(i, i + 500));
  return { deleted: stale.length };
}
