"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";

export async function clearConversation(botId: string, conversationId: string) {
  const { supabase, user } = await requireUser();

  // Messages cascade with the conversation; one round-trip is enough.
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("bot_id", botId)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message || "Could not clear conversation.");
  }

  // Page layout only — avoid layout/root fan-out on a simple clear.
  revalidatePath(`/dashboard/bots/${botId}`, "page");
}
