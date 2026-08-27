import Stripe from "stripe";

import type { PlanId } from "@/lib/pricing";

export type PaidPlanId = Exclude<PlanId, "free">;

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  stripeClient = new Stripe(key, {
    apiVersion: "2026-08-26.dahlia",
    typescript: true,
  });
  return stripeClient;
}

export function isPaidPlanId(value: string): value is PaidPlanId {
  return value === "pro" || value === "business";
}

export function priceIdForPlan(planId: PaidPlanId): string {
  const priceId =
    planId === "pro"
      ? process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_PRICE_BUSINESS;

  if (!priceId) {
    throw new Error(
      planId === "pro"
        ? "Missing STRIPE_PRICE_PRO"
        : "Missing STRIPE_PRICE_BUSINESS",
    );
  }

  return priceId;
}

export function planIdFromPriceId(priceId: string): PaidPlanId | null {
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId && priceId === process.env.STRIPE_PRICE_BUSINESS) {
    return "business";
  }
  return null;
}

export function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
