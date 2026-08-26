"use server";

import { revalidatePath } from "next/cache";

import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import { createChatCompletion } from "@/lib/openrouter";
import { buildContextBlock, retrieveRelevantChunks } from "@/lib/rag";
import {
  assertUnderMessageLimit,
  ensureMessagePeriod,
  incrementMessagesUsed,
} from "@/lib/usage";

export type ChatActionState = {
  ok: boolean;
  message: string;
};

export async function sendChatMessage(
  botId: string,
  conversationId: string | null,
  _prev: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const { supabase, user } = await requireUser();
  const { profile, plan } = await requireProfilePlan(supabase, user.id);
  const currentProfile = await ensureMessagePeriod(supabase, profile);

  const limitError = assertUnderMessageLimit(currentProfile, plan);
  if (limitError) {
    return { ok: false, message: limitError };
  }

  const content = String(formData.get("content") ?? "").trim();
  if (!content) {
    return { ok: false, message: "Type a message first." };
  }
  if (content.length > 4000) {
    return { ok: false, message: "Message must be 4000 characters or fewer." };
  }

  const { data: bot } = await supabase
    .from("bots")
    .select("id, system_prompt, welcome_message")
    .eq("id", botId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!bot) {
    return { ok: false, message: "Bot not found." };
  }

  let activeConversationId = conversationId;

  if (activeConversationId) {
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", activeConversationId)
      .eq("bot_id", botId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!existing) {
      activeConversationId = null;
    }
  }

  if (!activeConversationId) {
    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({
        bot_id: botId,
        owner_id: user.id,
        source: "app",
      })
      .select("id")
      .single();

    if (createError || !created) {
      return {
        ok: false,
        message: createError?.message || "Could not start a conversation.",
      };
    }
    activeConversationId = created.id as string;
  }

  const { error: userMsgError } = await supabase.from("messages").insert({
    conversation_id: activeConversationId,
    role: "user",
    content,
  });

  if (userMsgError) {
    return { ok: false, message: userMsgError.message };
  }

  try {
    const chunks = await retrieveRelevantChunks(supabase, botId, content);
    const context = buildContextBlock(chunks);

    const answer = await createChatCompletion([
      {
        role: "system",
        content: `${bot.system_prompt}

Use only the context below to answer. If the answer is not in the context, say you do not know.

Context:
${context}`,
      },
      { role: "user", content },
    ]);

    const { error: assistantError } = await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "assistant",
      content: answer,
      citation_chunk_ids: chunks.map((chunk) => chunk.id),
    });

    if (assistantError) {
      return { ok: false, message: assistantError.message };
    }

    await incrementMessagesUsed(supabase, currentProfile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat request failed.";
    await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "assistant",
      content: `Sorry — I could not answer that (${message}).`,
    });
    revalidatePath(`/dashboard/bots/${botId}`);
    return { ok: false, message };
  }

  revalidatePath(`/dashboard/bots/${botId}`);
  return { ok: true, message: "" };
}

export async function clearConversation(botId: string, conversationId: string) {
  const { supabase, user } = await requireUser();

  await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("bot_id", botId)
    .eq("owner_id", user.id);

  revalidatePath(`/dashboard/bots/${botId}`);
}
