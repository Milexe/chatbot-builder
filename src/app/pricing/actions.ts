"use server";

import { redirect } from "next/navigation";

import { applySubscriptionToProfile } from "@/lib/billing";
import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import {
  appOrigin,
  getStripe,
  isPaidPlanId,
  priceIdForPlan,
  type PaidPlanId,
} from "@/lib/stripe";

const PLAN_RANK = { free: 0, pro: 1, business: 2 } as const;

function isRealStripeId(value: string | null | undefined): value is string {
  return Boolean(value) && !value!.startsWith("mock_");
}

async function ensureStripeCustomer(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  email: string | null | undefined,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", userId)
    .maybeSingle();

  const existing = profile?.stripe_customer_id as string | null | undefined;
  if (isRealStripeId(existing)) return existing;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email ?? (profile?.email as string | null) ?? undefined,
    metadata: { userId },
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return customer.id;
}

/** Stripe Checkout for Free → paid, or subscription update for plan upgrades. */
export async function startCheckout(planId: string) {
  if (!isPaidPlanId(planId)) {
    redirect("/pricing?error=invalid_plan");
  }

  const { supabase, user } = await requireUser();
  const { plan: currentPlan, profile } = await requireProfilePlan(
    supabase,
    user.id,
  );

  if (currentPlan.id === planId) {
    redirect("/pricing?error=already_on_plan");
  }

  // Downgrade (e.g. Business → Pro): Customer Portal, no error banner.
  if (PLAN_RANK[currentPlan.id] > PLAN_RANK[planId]) {
    await redirectToBillingPortal(supabase, user.id, user.email);
  }

  let customerId: string;
  try {
    customerId = await ensureStripeCustomer(supabase, user.id, user.email);
  } catch {
    redirect("/pricing?error=customer_failed");
  }

  const stripe = getStripe();
  const priceId = priceIdForPlan(planId as PaidPlanId);
  const origin = appOrigin();
  const existingSubId = isRealStripeId(profile.stripe_subscription_id)
    ? profile.stripe_subscription_id
    : null;

  if (existingSubId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(existingSubId);
      const itemId = subscription.items.data[0]?.id;
      if (!itemId) {
        redirect("/pricing?error=checkout_failed");
      }

      const updated = await stripe.subscriptions.update(existingSubId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
        cancel_at_period_end: false,
        metadata: { userId: user.id },
      });

      await applySubscriptionToProfile(updated, user.id);
    } catch {
      redirect("/pricing?error=checkout_failed");
    }

    redirect("/pricing?billing=success");
  }

  let sessionUrl: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pricing?billing=success`,
      cancel_url: `${origin}/pricing?billing=canceled`,
      locale: "en",
      client_reference_id: user.id,
      metadata: { userId: user.id, planId },
      subscription_data: {
        metadata: { userId: user.id, planId },
      },
    });
    sessionUrl = session.url;
  } catch {
    redirect("/pricing?error=checkout_failed");
  }

  if (!sessionUrl) {
    redirect("/pricing?error=checkout_failed");
  }

  redirect(sessionUrl);
}

async function redirectToBillingPortal(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  email: string | null | undefined,
): Promise<never> {
  let customerId: string;
  try {
    customerId = await ensureStripeCustomer(supabase, userId, email);
  } catch {
    redirect("/pricing?error=portal_failed");
  }

  const stripe = getStripe();
  const origin = appOrigin();

  let portalUrl: string | null = null;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/pricing`,
      locale: "en",
    });
    portalUrl = session.url;
  } catch {
    redirect("/pricing?error=portal_failed");
  }

  if (!portalUrl) {
    redirect("/pricing?error=portal_failed");
  }

  redirect(portalUrl);
}

/** Stripe Customer Portal — cards, cancel at period end, invoices. */
export async function openBillingPortal() {
  const { supabase, user } = await requireUser();
  await requireProfilePlan(supabase, user.id);
  await redirectToBillingPortal(supabase, user.id, user.email);
}
