// Creates Civica's Stripe catalog and customer portal. Safe to re-run: prices
// are found by lookup_key and only created when missing.
//
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs
//
// Run it once per Stripe environment (sandbox, then live). It never creates
// tax registrations: those record a registration you already hold with a tax
// authority, so add them yourself in the Dashboard (Tax > Locations).
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}
// Behind an HTTPS proxy (e.g. a sandbox), use fetch, which honours it when run
// with NODE_USE_ENV_PROXY=1; otherwise the SDK's default client.
const stripe = new Stripe(key, process.env.HTTPS_PROXY ? { httpClient: Stripe.createFetchHttpClient() } : {});

// Stripe's own tax codes (Tax Codes API). Donations: "Cash Donation".
// The institutional license has no code yet: choose one with your tax advisor
// (candidates: txcd_10103001 SaaS - business use, txcd_10701400 Website
// Information Services - business use) before sending a live invoice.
const DONATION_TAX_CODE = "txcd_90000001";

const catalog = [
  {
    product: { name: "Civica donation", tax_code: DONATION_TAX_CODE, metadata: { civica: "donation_once" } },
    prices: [
      {
        lookup_key: "civica_donation_once",
        currency: "usd",
        tax_behavior: "exclusive",
        // The donor chooses the amount on the Checkout page.
        custom_unit_amount: { enabled: true, minimum: 100, preset: 1000, maximum: 1000000 },
      },
    ],
  },
  {
    product: { name: "Civica monthly supporter", tax_code: DONATION_TAX_CODE, metadata: { civica: "donation_monthly" } },
    prices: [5, 10, 25].map((dollars) => ({
      lookup_key: `civica_donation_monthly_${dollars}`,
      nickname: `$${dollars} / month`,
      currency: "usd",
      unit_amount: dollars * 100,
      tax_behavior: "exclusive",
      recurring: { interval: "month" },
    })),
  },
  {
    product: { name: "Civica for Institutions (annual license)", metadata: { civica: "institution_license" } },
    prices: [
      {
        lookup_key: "civica_institution_annual",
        nickname: "$500 / year",
        currency: "usd",
        unit_amount: 50000,
        tax_behavior: "exclusive",
        recurring: { interval: "year" },
      },
    ],
  },
];

async function ensureProduct(spec) {
  const found = await stripe.products.search({ query: `metadata['civica']:'${spec.metadata.civica}'` });
  if (found.data[0]) return found.data[0];
  return stripe.products.create(spec);
}

for (const entry of catalog) {
  const product = await ensureProduct(entry.product);
  for (const price of entry.prices) {
    const existing = await stripe.prices.list({ lookup_keys: [price.lookup_key], limit: 1 });
    if (existing.data[0]) {
      console.log(`price ${price.lookup_key}: exists (${existing.data[0].id})`);
      continue;
    }
    const created = await stripe.prices.create({ ...price, product: product.id });
    console.log(`price ${price.lookup_key}: created (${created.id})`);
  }
}

// Customer portal with a no-code login page: monthly donors enter their email,
// get a link, and can cancel or update their card. No Civica accounts needed.
// (Switching amount isn't offered: the portal can't switch between prices
// with the same interval on one product. Donors cancel and pick a new amount.)
const portalFeatures = {
  customer_update: { enabled: true, allowed_updates: ["email", "address"] },
  invoice_history: { enabled: true },
  payment_method_update: { enabled: true },
  subscription_cancel: { enabled: true, mode: "immediately" },
};
const configs = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
const portal = configs.data[0]
  ? await stripe.billingPortal.configurations.update(configs.data[0].id, {
      features: portalFeatures,
      login_page: { enabled: true },
      business_profile: { headline: "Manage your Civica monthly donation" },
    })
  : await stripe.billingPortal.configurations.create({
      features: portalFeatures,
      login_page: { enabled: true },
      business_profile: { headline: "Manage your Civica monthly donation" },
    });
console.log(`customer portal login: ${portal.login_page.url}`);
