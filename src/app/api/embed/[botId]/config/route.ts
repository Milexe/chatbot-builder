import { NextResponse } from "next/server";

import {
  assertEmbedOrigin,
  EmbedLimitError,
  embedCorsHeaders,
} from "@/lib/embed-guards";
import { getPlan, type PlanId } from "@/lib/pricing";
import { createServiceClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ botId: string }>;
};

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: embedCorsHeaders(request),
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { botId } = await context.params;
  let cors = embedCorsHeaders(request);

  try {
    const admin = createServiceClient();
    const { data: bot, error } = await admin
      .from("bots")
      .select(
        "id, name, welcome_message, primary_color, is_public, owner_id, allowed_origins",
      )
      .eq("id", botId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
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

    const { data: profile } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", bot.owner_id)
      .maybeSingle();

    const planId = (profile?.plan as PlanId | undefined) ?? "free";
    const plan = getPlan(planId);

    return NextResponse.json(
      {
        id: bot.id,
        name: bot.name,
        welcomeMessage: bot.welcome_message,
        primaryColor: bot.primary_color,
        showBranding: !plan.limits.removeBranding,
      },
      { headers: cors },
    );
  } catch (error) {
    if (error instanceof EmbedLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: cors },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to load bot config.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: cors },
    );
  }
}
