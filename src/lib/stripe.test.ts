import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const list = vi.fn();
const constructEvent = vi.fn();
vi.mock("stripe", () => {
  class Stripe {
    static createFetchHttpClient = () => ({});
    checkout = { sessions: { create: (...args: unknown[]) => create(...args) } };
    prices = { list: (...args: unknown[]) => list(...args) };
    webhooks = { constructEvent: (...args: unknown[]) => constructEvent(...args) };
  }
  return { default: Stripe };
});

const checkout = (await import("../app/api/checkout/route")).POST;
const webhook = (await import("../app/api/stripe/webhook/route")).POST;

function checkoutRequest(body: unknown, ip: string) {
  return new Request("https://civica.test/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    create.mockReset().mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    list.mockReset().mockImplementation(({ lookup_keys }: { lookup_keys: string[] }) =>
      Promise.resolve({ data: [{ id: `price_for_${lookup_keys[0]}` }] }),
    );
  });
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_AUTOMATIC_TAX;
  });

  it("starts a one-time donation where the donor picks the amount", async () => {
    const response = await checkout(checkoutRequest({ plan: "once" }, "10.2.0.1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    const params = create.mock.calls[0][0];
    expect(params).toMatchObject({
      mode: "payment",
      submit_type: "donate",
      line_items: [{ price: "price_for_civica_donation_once", quantity: 1 }],
      success_url: "https://civica.test/support?thanks=1",
      cancel_url: "https://civica.test/support",
    });
    expect(params.integration_identifier).toMatch(/^civica_donations_[a-z]{8}$/);
    expect(params).not.toHaveProperty("payment_method_types");
    expect(params).not.toHaveProperty("automatic_tax");
  });

  it("starts a monthly donation as a subscription, with tax only when switched on", async () => {
    process.env.STRIPE_AUTOMATIC_TAX = "on";
    const response = await checkout(checkoutRequest({ plan: "monthly", amount: 25 }, "10.2.0.2"));
    expect(response.status).toBe(200);
    const params = create.mock.calls[0][0];
    expect(params).toMatchObject({
      mode: "subscription",
      line_items: [{ price: "price_for_civica_donation_monthly_25" }],
      automatic_tax: { enabled: true },
    });
    expect(params).not.toHaveProperty("submit_type");
  });

  it("rejects amounts that aren't offered", async () => {
    const response = await checkout(checkoutRequest({ plan: "monthly", amount: 7 }, "10.2.0.3"));
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("says donations aren't set up without a key", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const response = await checkout(checkoutRequest({ plan: "once" }, "10.2.0.4"));
    expect(response.status).toBe(503);
  });
});

describe("POST /api/stripe/webhook", () => {
  const event = (signature: string | null) =>
    new Request("https://civica.test/api/stripe/webhook", {
      method: "POST",
      body: '{"id":"evt_1"}',
      headers: signature ? { "stripe-signature": signature } : {},
    });

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    constructEvent.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    vi.restoreAllMocks();
  });

  it("verifies the signature against the raw body and acknowledges", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", payment_status: "paid", mode: "payment", amount_total: 1000, currency: "usd" } },
    });
    const response = await webhook(event("t=1,v1=abc"));
    expect(response.status).toBe(200);
    expect(constructEvent).toHaveBeenCalledWith('{"id":"evt_1"}', "t=1,v1=abc", "whsec_x");
  });

  it("rejects missing or invalid signatures", async () => {
    expect((await webhook(event(null))).status).toBe(400);
    constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });
    expect((await webhook(event("t=1,v1=forged"))).status).toBe(400);
  });

  it("refuses events when no webhook secret is set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect((await webhook(event("t=1,v1=abc"))).status).toBe(503);
    expect(constructEvent).not.toHaveBeenCalled();
  });
});
