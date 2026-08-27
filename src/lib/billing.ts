import type Stripe from "stripe";

import { enforceLiveBotCap } from "@/lib/bot-live-cap";
import {
  planIdFromPriceId,
  type PaidPlanId,
} from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPlan, type PlanId } from "@/lib/pricing";

export type BillingProfileFields = {
  plan: PlanId;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
};

function priceIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  const item = subscription.items.data[0];
  if (!item) return null;
  return typeof item.price === "string" ? item.price : item.price.id;
}

/** Period end lives on SubscriptionItem (Basil+ API), not on Subscription. */
export function periodEndIsoFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");
  if (ends.length === 0) return null;
  return new Date(Math.max(...ends) * 1000).toISOString();
}

function customerIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  if (typeof subscription.customer === "string") return subscription.customer;
  return subscription.customer?.id ?? null;
}

function fieldsFromSubscription(
  subscription: Stripe.Subscription,
  fallbackPlan: PlanId = "free",
): BillingProfileFields {
  const priceId = priceIdFromSubscription(subscription);
  const paidPlan: PaidPlanId | null = priceId
    ? planIdFromPriceId(priceId)
    : null;

  const status = subscription.status;
  const isEntitled =
    status === "active" || status === "trialing" || status === "past_due";

  let plan: PlanId = fallbackPlan;
  if (isEntitled && paidPlan) {
    plan = paidPlan;
  } else if (
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired"
  ) {
    plan = "free";
  }

  return {
    plan,
    stripe_customer_id: customerIdFromSubscription(subscription),
    stripe_subscription_id: isEntitled ? subscription.id : null,
    subscription_status: status,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_end: periodEndIsoFromSubscription(subscription),
  };
}

async function updateProfileByUserId(
  userId: string,
  fields: Partial<BillingProfileFields>,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to update billing profile: ${error.message}`);
  }

  if (fields.plan) {
    await enforceLiveBotCap(
      supabase,
      userId,
      getPlan(fields.plan).limits.bots,
    );
  }
}

async function updateProfileByCustomerId(
  customerId: string,
  fields: Partial<BillingProfileFields>,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up billing profile: ${lookupError.message}`);
  }

  const userId = (profile?.id as string | undefined) ?? null;
  if (!userId) {
    throw new Error("No profile for Stripe customer");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to update billing profile: ${error.message}`);
  }

  if (fields.plan) {
    await enforceLiveBotCap(
      supabase,
      userId,
      getPlan(fields.plan).limits.bots,
    );
  }

  return userId;
}

export async function applySubscriptionToProfile(
  subscription: Stripe.Subscription,
  userId?: string | null,
): Promise<void> {
  const fields = fieldsFromSubscription(subscription);
  const customerId = fields.stripe_customer_id;

  if (userId) {
    await updateProfileByUserId(userId, fields);
    return;
  }

  if (!customerId) {
    throw new Error("Subscription has no customer id");
  }

  await updateProfileByCustomerId(customerId, fields);
}

export async function clearSubscriptionForCustomer(
  customerId: string,
): Promise<void> {
  await updateProfileByCustomerId(customerId, {
    plan: "free",
    stripe_subscription_id: null,
    subscription_status: "canceled",
    cancel_at_period_end: false,
    current_period_end: null,
  });
}

export async function resolveUserIdFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const fromMeta = session.metadata?.userId;
  if (fromMeta) return fromMeta;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!customerId) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}
