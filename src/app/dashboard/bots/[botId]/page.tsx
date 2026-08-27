import { PencilIcon } from "lucide-react";

import { BotFormDialog } from "@/app/dashboard/bots/bot-form-dialog";
import { BackToBotsLink } from "@/app/dashboard/bots/[botId]/back-to-bots-link";
import { ChatPanel } from "@/app/dashboard/bots/[botId]/chat-panel";
import { DeleteBotButton } from "@/app/dashboard/bots/[botId]/delete-bot-button";
import { DocumentsPanel } from "@/app/dashboard/bots/[botId]/documents-panel";
import { EmbedSnippet } from "@/app/dashboard/bots/[botId]/embed-snippet";
import { PauseBotButton } from "@/app/dashboard/bots/[botId]/pause-bot-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import { ensureMessagePeriod } from "@/lib/usage";
import { cn } from "@/lib/utils";
import type { BotRow } from "@/types/database";
import { notFound } from "next/navigation";

type BotPageProps = {
  params: Promise<{ botId: string }>;
  searchParams: Promise<{ error?: string }>;
};

type DocumentListItem = {
  id: string;
  file_name: string;
  byte_size: number | null;
  status: "pending" | "processing" | "ready" | "failed";
  error_message: string | null;
};

type ChatMessageItem = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export default async function BotDetailPage({
  params,
  searchParams,
}: BotPageProps) {
  const { botId } = await params;
  const query = await searchParams;
  const { supabase, user } = await requireUser();
  const { plan, profile } = await requireProfilePlan(supabase, user.id);
  const usageProfile = await ensureMessagePeriod(supabase, profile);

  const [botResult, documentsResult, accountDocCountResult, conversationResult] =
    await Promise.all([
      supabase
        .from("bots")
        .select(
          "id, owner_id, name, slug, system_prompt, welcome_message, primary_color, allowed_origins, is_public, created_at, updated_at",
        )
        .eq("id", botId)
        .eq("owner_id", user.id)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("id, file_name, byte_size, status, error_message")
        .eq("bot_id", botId)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id),
      supabase
        .from("conversations")
        .select("id")
        .eq("bot_id", botId)
        .eq("owner_id", user.id)
        .eq("source", "app")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!botResult.data) {
    notFound();
  }

  const botRow = botResult.data as BotRow;
  const documentRows = (documentsResult.data ?? []) as DocumentListItem[];
  const docsUsed = accountDocCountResult.count ?? documentRows.length;
  const conversationId =
    (conversationResult.data?.id as string | undefined) ?? null;

  let messageRows: ChatMessageItem[] = [];
  if (conversationId) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    messageRows = (messages ?? []) as ChatMessageItem[];
  }

  const isLive = botRow.is_public;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <BackToBotsLink />
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                isLive ? "bg-emerald-500" : "bg-amber-500",
              )}
              title={isLive ? "Live" : "Paused"}
              aria-hidden
            />
            <h1 className="font-heading truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {botRow.name}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isLive ? "Live on embeds" : "Paused — hidden from embeds"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PauseBotButton botId={botId} isLive={isLive} />
          <BotFormDialog
            mode="edit"
            bot={botRow}
            trigger={
              <Button type="button" variant="outline" size="icon-sm">
                <PencilIcon />
                <span className="sr-only">Edit</span>
              </Button>
            }
          />
          <DeleteBotButton botId={botId} botName={botRow.name} />
        </div>
      </div>

      {query.error ? (
        <p className="text-sm text-destructive" role="alert">
          {query.error}
        </p>
      ) : null}

      <Card className="gap-3 rounded-2xl border-border/80 py-3">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="font-heading">Chat</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <ChatPanel
            key={conversationId ?? "new"}
            botId={botId}
            conversationId={conversationId}
            botName={botRow.name}
            welcomeMessage={botRow.welcome_message}
            primaryColor={botRow.primary_color}
            messages={messageRows.map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
            }))}
            messagesUsed={usageProfile.messages_used_this_month}
            messagesLimit={plan.limits.messagesPerMonth}
            documentCount={documentRows.length}
            isLive={isLive}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-3 rounded-2xl border-border/80 py-3">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="font-heading">Knowledge</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <DocumentsPanel
              botId={botId}
              documents={documentRows}
              documentsUsed={docsUsed}
              documentsOnBot={documentRows.length}
              documentsLimit={plan.limits.documents}
              maxFileMb={plan.limits.maxFileMb}
              canUpload={docsUsed < plan.limits.documents}
            />
          </CardContent>
        </Card>

        <Card className="gap-3 rounded-2xl border-border/80 py-3">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="font-heading">Embed</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <EmbedSnippet botId={botId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
