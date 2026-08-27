import { streamBotAnswer } from "@/lib/bot-answer";
import { createChatSseResponse } from "@/lib/chat-sse";
import { requireProfilePlan } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  assertUnderMessageLimit,
  ensureMessagePeriod,
  incrementMessagesUsed,
} from "@/lib/usage";

type RouteContext = {
  params: Promise<{ botId: string }>;
};

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  const { botId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string; conversationId?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = String(body.message ?? "").trim();
  if (!content) {
    return Response.json({ error: "Type a message first." }, { status: 400 });
  }
  if (content.length > 4000) {
    return Response.json(
      { error: "Message must be 4000 characters or fewer." },
      { status: 400 },
    );
  }

  const { profile, plan } = await requireProfilePlan(supabase, user.id);
  const currentProfile = await ensureMessagePeriod(supabase, profile);
  const limitError = assertUnderMessageLimit(currentProfile, plan);
  if (limitError) {
    return Response.json({ error: limitError }, { status: 402 });
  }

  const { data: bot } = await supabase
    .from("bots")
    .select("id, system_prompt")
    .eq("id", botId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!bot) {
    return Response.json({ error: "Bot not found." }, { status: 404 });
  }

  let activeConversationId =
    typeof body.conversationId === "string" && body.conversationId
      ? body.conversationId
      : null;

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
      return Response.json(
        {
          error: createError?.message || "Could not start a conversation.",
        },
        { status: 500 },
      );
    }
    activeConversationId = created.id as string;
  }

  const { error: userMsgError } = await supabase.from("messages").insert({
    conversation_id: activeConversationId,
    role: "user",
    content,
  });

  if (userMsgError) {
    return Response.json({ error: userMsgError.message }, { status: 500 });
  }

  const conversationId = activeConversationId;

  return createChatSseResponse(async (send) => {
    try {
      const { answer, citationChunkIds } = await streamBotAnswer(
        supabase,
        bot,
        content,
        {
          onReady: (ids) => {
            send({
              type: "meta",
              conversationId,
              citationChunkIds: ids,
            });
          },
          onDelta: (text) => {
            send({ type: "delta", text });
          },
        },
      );

      const { error: assistantError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: answer,
        citation_chunk_ids: citationChunkIds,
      });

      if (assistantError) {
        throw new Error(assistantError.message);
      }

      await incrementMessagesUsed(supabase, currentProfile);
      send({ type: "done", answer });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Chat request failed.";
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: `Sorry — I could not answer that (${message}).`,
      });
      send({ type: "error", message });
    }
  });
}
