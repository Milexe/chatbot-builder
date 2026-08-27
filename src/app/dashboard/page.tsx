import { BotsGrid, type BotCardStats } from "@/app/dashboard/bots/bots-grid";
import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import { ensureMessagePeriod, startOfUtcMonthIso } from "@/lib/usage";
import type { BotRow } from "@/types/database";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const { plan, profile } = await requireProfilePlan(supabase, user.id);
  const usageProfile = await ensureMessagePeriod(supabase, profile);

  const { data: bots, error } = await supabase
    .from("bots")
    .select(
      "id, owner_id, name, slug, system_prompt, welcome_message, primary_color, allowed_origins, is_public, created_at, updated_at",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const botRows = (bots ?? []) as BotRow[];
  const atBotLimit = botRows.length >= plan.limits.bots;

  const [{ data: documents }, { data: messageRows }] = await Promise.all([
    supabase.from("documents").select("bot_id").eq("owner_id", user.id),
    supabase
      .from("messages")
      .select("id, conversations!inner(bot_id, owner_id)")
      .eq("role", "user")
      .eq("conversations.owner_id", user.id)
      .gte("created_at", startOfUtcMonthIso()),
  ]);

  const statsByBotId: Record<string, BotCardStats> = {};
  for (const bot of botRows) {
    statsByBotId[bot.id] = { documentCount: 0, messageCount: 0 };
  }
  for (const doc of documents ?? []) {
    const botId = doc.bot_id as string;
    if (!statsByBotId[botId]) {
      statsByBotId[botId] = { documentCount: 0, messageCount: 0 };
    }
    statsByBotId[botId].documentCount += 1;
  }
  for (const row of messageRows ?? []) {
    const conversation = row.conversations as
      | { bot_id?: string }
      | { bot_id?: string }[]
      | null;
    const botId = Array.isArray(conversation)
      ? conversation[0]?.bot_id
      : conversation?.bot_id;
    if (!botId) continue;
    if (!statsByBotId[botId]) {
      statsByBotId[botId] = { documentCount: 0, messageCount: 0 };
    }
    statsByBotId[botId].messageCount += 1;
  }

  const docsUsed = documents?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Bots
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{plan.name}</span>
          <span
            className="size-1 shrink-0 rounded-full bg-muted-foreground/45"
            aria-hidden
          />
          <span>
            Bots {botRows.length}/{plan.limits.bots}
          </span>
          <span
            className="size-1 shrink-0 rounded-full bg-muted-foreground/45"
            aria-hidden
          />
          <span>
            Messages {usageProfile.messages_used_this_month}/
            {plan.limits.messagesPerMonth}
          </span>
          <span
            className="size-1 shrink-0 rounded-full bg-muted-foreground/45"
            aria-hidden
          />
          <span>
            Docs {docsUsed}/{plan.limits.documents}
          </span>
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}

      <BotsGrid
        bots={botRows}
        statsByBotId={statsByBotId}
        atBotLimit={atBotLimit}
        planName={plan.name}
      />
    </div>
  );
}
