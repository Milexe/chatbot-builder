import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  applySubscriptionToProfile,
  clearSubscriptionForCustomer,
  resolveUserIdFromCheckoutSession,
} from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function retrieveSubscription(
  stripe: Stripe,
  subscriptionRef: string | Stripe.Subscription | null | undefined,
): Promise<Stripe.Subscription | null> {
  if (!subscriptionRef) return null;
  if (typeof subscriptionRef !== "string") return subscriptionRef;
  return stripe.subscriptions.retrieve(subscriptionRef);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const subscription = await retrieveSubscription(
          stripe,
          session.subscription,
        );
        if (!subscription) break;

        const userId = await resolveUserIdFromCheckoutSession(session);
        await applySubscriptionToProfile(subscription, userId);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await applySubscriptionToProfile(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
        if (customerId) {
          await clearSubscriptionForCustomer(customerId);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed";
    console.error("[stripe webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
