import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Keep at most `maxLive` bots public (embed Live).
 * Oldest live bots stay up; newer excess bots are paused.
 * Returns how many bots were paused.
 *
 * Call from mutations / billing — not on every page load.
 */
export async function enforceLiveBotCap(
  supabase: SupabaseClient,
  userId: string,
  maxLive: number,
): Promise<number> {
  const { data: liveBots, error } = await supabase
    .from("bots")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = liveBots ?? [];
  if (rows.length <= maxLive) return 0;

  const toPause = rows.slice(Math.max(0, maxLive)).map((row) => row.id as string);
  if (toPause.length === 0) return 0;

  const { error: updateError } = await supabase
    .from("bots")
    .update({
      is_public: false,
      updated_at: new Date().toISOString(),
    })
    .in("id", toPause)
    .eq("owner_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return toPause.length;
}
