import Stripe from "stripe";
import { CivicaError } from "./claude";

// Server-only. Set STRIPE_SECRET_KEY (ideally a restricted rk_ key) and
// STRIPE_WEBHOOK_SECRET as sensitive environment variables in Vercel.

let client: Stripe | null = null;

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new CivicaError("Donations aren't set up yet.", 503);
  // Behind an HTTPS proxy (e.g. a sandbox) the fetch client honours it when
  // Node runs with NODE_USE_ENV_PROXY=1; on Vercel the default client is used.
  client ??= new Stripe(key, process.env.HTTPS_PROXY ? { httpClient: Stripe.createFetchHttpClient() } : {});
  return client;
}

export function donationsEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeTestMode() {
  return /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");
}

// The no-code customer portal login page (scripts/stripe-setup.mjs prints it).
export function portalLoginUrl() {
  const url = process.env.STRIPE_PORTAL_LOGIN_URL;
  return url && url.startsWith("https://billing.stripe.com/") ? url : null;
}

export const MONTHLY_AMOUNTS = [5, 10, 25] as const;

// Prices are created by scripts/stripe-setup.mjs and found by lookup key, so
// the same code works in a sandbox and in live mode.
export function lookupKey(plan: "once" | "monthly", amount?: number) {
  return plan === "once" ? "civica_donation_once" : `civica_donation_monthly_${amount}`;
}

const priceIds = new Map<string, string>();

export async function priceId(stripe: Stripe, key: string) {
  const cached = priceIds.get(key);
  if (cached) return cached;
  const { data } = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (!data[0]) throw new CivicaError("Donations aren't set up yet.", 503);
  priceIds.set(key, data[0].id);
  return data[0].id;
}
