import type { SupabaseClient } from "@supabase/supabase-js";

import type { Plan } from "@/lib/pricing";
import type { ProfileRow } from "@/types/database";

function startOfUtcMonth(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

/** ISO timestamp for the start of the current UTC month (message period). */
export function startOfUtcMonthIso(date = new Date()): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  ).toISOString();
}

/** Reset the monthly counter when the billing period rolls over. */
export async function ensureMessagePeriod(
  supabase: SupabaseClient,
  profile: ProfileRow,
): Promise<ProfileRow> {
  const periodStart = startOfUtcMonth();
  if (profile.messages_period_start === periodStart) {
    return profile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      messages_used_this_month: 0,
      messages_period_start: periodStart,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
    .select(
      "id, email, full_name, plan, messages_used_this_month, messages_period_start",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProfileRow;
}

export function assertUnderMessageLimit(
  profile: ProfileRow,
  plan: Plan,
): string | null {
  if (profile.messages_used_this_month >= plan.limits.messagesPerMonth) {
    return `Your ${plan.name} plan allows ${plan.limits.messagesPerMonth} messages this month.`;
  }
  return null;
}

export async function incrementMessagesUsed(
  supabase: SupabaseClient,
  profile: ProfileRow,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      messages_used_this_month: profile.messages_used_this_month + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    throw new Error(error.message);
  }
}
