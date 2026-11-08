import { z } from "zod";
import { CivicaError } from "@/lib/claude";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { lookupKey, MONTHLY_AMOUNTS, priceId, stripeClient } from "@/lib/stripe";

const CheckoutSchema = z.discriminatedUnion("plan", [
  z.object({ plan: z.literal("once") }),
  z.object({ plan: z.literal("monthly"), amount: z.union(MONTHLY_AMOUNTS.map((n) => z.literal(n))) }),
]);

// Tags these sessions in the Stripe Dashboard so this flow can be compared
// with others later.
const INTEGRATION_IDENTIFIER = "civica_donations_kqvmtrzw";

// Starts a Stripe Checkout donation and returns its URL. The donor picks the
// amount on Stripe's page for a one-time gift, or here for a monthly one.
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "checkout", 10, 10 * 60 * 1000);
    let input;
    try {
      input = CheckoutSchema.parse(await request.json());
    } catch {
      throw new CivicaError("Choose a donation option.", 400);
    }
    const stripe = stripeClient();
    const price = await priceId(stripe, lookupKey(input.plan, input.plan === "monthly" ? input.amount : undefined));
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: input.plan === "once" ? "payment" : "subscription",
      line_items: [{ price, quantity: 1 }],
      ...(input.plan === "once" ? { submit_type: "donate" as const } : {}),
      // Stays off until a tax registration exists (Dashboard > Tax >
      // Registrations); without one Stripe would collect $0 tax anyway.
      ...(process.env.STRIPE_AUTOMATIC_TAX === "on" ? { automatic_tax: { enabled: true } } : {}),
      integration_identifier: INTEGRATION_IDENTIFIER,
      success_url: `${origin}/support?thanks=1`,
      cancel_url: `${origin}/support`,
    });
    if (!session.url) throw new CivicaError("Couldn't start checkout. Please try again.", 502);
    return Response.json({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
