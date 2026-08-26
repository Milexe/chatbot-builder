import { NextResponse } from "next/server";

import { answerBotQuestion } from "@/lib/bot-answer";
import {
  assertAndTouchEmbedSession,
  assertEmbedOrigin,
  assertEmbedRateLimit,
  EmbedLimitError,
  embedCorsHeaders,
  getRequestIp,
  linkEmbedSessionConversation,
} from "@/lib/embed-guards";
import { getPlan, type PlanId } from "@/lib/pricing";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  assertUnderMessageLimit,
  ensureMessagePeriod,
  incrementMessagesUsed,
} from "@/lib/usage";
import type { ProfileRow } from "@/types/database";

type RouteContext = {
  params: Promise<{ botId: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: embedCorsHeaders(request),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { botId } = await context.params;
  let cors = embedCorsHeaders(request);

  try {
    const body = (await request.json()) as {
      message?: string;
      sessionId?: string;
    };

    const message = String(body.message ?? "").trim();
    const sessionId = String(body.sessionId ?? "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400, headers: cors },
      );
    }
    if (message.length > 4000) {
      return NextResponse.json(
        { error: "Message must be 4000 characters or fewer." },
        { status: 400, headers: cors },
      );
    }
    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json(
        { error: "Valid sessionId UUID is required." },
        { status: 400, headers: cors },
      );
    }

    const admin = createServiceClient();
    const ip = getRequestIp(request);

    await assertEmbedRateLimit(admin, botId, ip);

    const { data: bot, error: botError } = await admin
      .from("bots")
      .select("id, owner_id, system_prompt, is_public, allowed_origins")
      .eq("id", botId)
      .maybeSingle();

    if (botError) {
      return NextResponse.json(
        { error: botError.message },
        { status: 500, headers: cors },
      );
    }
    if (!bot || !bot.is_public) {
      return NextResponse.json(
        { error: "Bot not found." },
        { status: 404, headers: cors },
      );
    }

    const allowedOrigins = (bot.allowed_origins as string[] | null) ?? [];
    cors = embedCorsHeaders(request, allowedOrigins);
    assertEmbedOrigin(request, allowedOrigins);

    const { data: profileData, error: profileError } = await admin
      .from("profiles")
      .select(
        "id, email, full_name, plan, messages_used_this_month, messages_period_start",
      )
      .eq("id", bot.owner_id)
      .maybeSingle();

    if (profileError || !profileData) {
      return NextResponse.json(
        { error: profileError?.message || "Owner profile missing." },
        { status: 500, headers: cors },
      );
    }

    const profile = await ensureMessagePeriod(
      admin,
      profileData as ProfileRow,
    );
    const plan = getPlan(profile.plan as PlanId);
    const ownerLimit = assertUnderMessageLimit(profile, plan);
    if (ownerLimit) {
      return NextResponse.json(
        { error: ownerLimit },
        { status: 402, headers: cors },
      );
    }

    const session = await assertAndTouchEmbedSession(
      admin,
      botId,
      sessionId,
      true,
    );

    let conversationId = session.conversationId;
    if (!conversationId) {
      const { data: conversation, error: conversationError } = await admin
        .from("conversations")
        .insert({
          bot_id: botId,
          owner_id: bot.owner_id,
          source: "embed",
        })
        .select("id")
        .single();

      if (conversationError || !conversation) {
        return NextResponse.json(
          {
            error:
              conversationError?.message ||
              "Could not start embed conversation.",
          },
          { status: 500, headers: cors },
        );
      }

      conversationId = conversation.id as string;
      await linkEmbedSessionConversation(admin, sessionId, conversationId);
    }

    const { error: userMsgError } = await admin.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    if (userMsgError) {
      return NextResponse.json(
        { error: userMsgError.message },
        { status: 500, headers: cors },
      );
    }

    try {
      const { answer, citationChunkIds } = await answerBotQuestion(
        admin,
        bot,
        message,
      );

      const { error: assistantError } = await admin.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: answer,
        citation_chunk_ids: citationChunkIds,
      });

      if (assistantError) {
        return NextResponse.json(
          { error: assistantError.message },
          { status: 500, headers: cors },
        );
      }

      await incrementMessagesUsed(admin, profile);

      return NextResponse.json(
        {
          answer,
          session: {
            id: sessionId,
            messageCount: session.messageCount,
            limit: session.limit,
          },
        },
        { headers: cors },
      );
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Chat request failed.";
      await admin.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: `Sorry — I could not answer that (${messageText}).`,
      });
      return NextResponse.json(
        { error: messageText },
        { status: 502, headers: cors },
      );
    }
  } catch (error) {
    if (error instanceof EmbedLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: cors },
      );
    }
    const message =
      error instanceof Error ? error.message : "Embed chat failed.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: cors },
    );
  }
}
