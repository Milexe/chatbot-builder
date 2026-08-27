import { cache } from "react";
import { redirect } from "next/navigation";

import { getPlan, type Plan, type PlanId } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

/** One Auth round-trip per request (layout + page share this). */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
});

async function getProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, plan, messages_used_this_month, messages_period_start, stripe_customer_id, stripe_subscription_id, subscription_status, cancel_at_period_end, current_period_end",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProfileRow | null;
}

export async function requireProfilePlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ profile: ProfileRow; plan: Plan; planId: PlanId }> {
  let profile = await getProfile(supabase, userId);

  if (!profile) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      email: user?.email ?? null,
      full_name:
        typeof user?.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user?.user_metadata?.name === "string"
            ? user.user_metadata.name
            : "",
      plan: "free",
    });
    if (error) {
      // Concurrent signup: trigger may have created the row between select and insert.
      profile = await getProfile(supabase, userId);
      if (!profile) {
        throw new Error(error.message);
      }
    } else {
      profile = await getProfile(supabase, userId);
    }
  }

  if (!profile) {
    throw new Error("Profile could not be loaded.");
  }

  const planId = profile.plan;
  return { profile, planId, plan: getPlan(planId) };
}
