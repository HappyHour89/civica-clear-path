import type Stripe from "stripe";
import { stripeClient } from "@/lib/stripe";

// Stripe calls this for payment events. Civica has no accounts to fulfil, so
// each event is verified and logged (Vercel logs) for follow-up; the Stripe
// Dashboard stays the record of donations.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response("Webhooks aren't configured.", { status: 503 });
  if (!signature) return new Response("Missing signature.", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature.", { status: 400 });
  }
  handle(event);
  return Response.json({ received: true });
}

function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      // Bank debits can complete before the money arrives; count only paid ones.
      if (session.payment_status === "paid") {
        console.info("Donation received", { session: session.id, mode: session.mode, amount: session.amount_total, currency: session.currency });
      } else {
        console.info("Donation pending", { session: session.id, status: session.payment_status });
      }
      return;
    }
    case "checkout.session.async_payment_failed":
    case "invoice.payment_failed":
      console.warn("Donation payment failed", { type: event.type, id: event.data.object.id });
      return;
    case "invoice.paid":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      console.info("Monthly donation update", { type: event.type, id: event.data.object.id });
      return;
    case "charge.refunded":
    case "charge.dispute.created":
    case "radar.early_fraud_warning.created":
      // Needs a person: answer disputes in the Dashboard before the deadline.
      console.warn("Needs attention in the Stripe Dashboard", { type: event.type, id: event.data.object.id });
      return;
    default:
      return;
  }
}
