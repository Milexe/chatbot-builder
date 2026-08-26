import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteBot } from "@/app/dashboard/bots/actions";
import { BotSettingsForm } from "@/app/dashboard/bots/[botId]/bot-settings-form";
import { ChatPanel } from "@/app/dashboard/bots/[botId]/chat-panel";
import { DocumentsPanel } from "@/app/dashboard/bots/[botId]/documents-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import { ensureMessagePeriod } from "@/lib/usage";
import { cn } from "@/lib/utils";
import type { BotRow, DocumentRow, MessageRow } from "@/types/database";

type BotPageProps = {
  params: Promise<{ botId: string }>;
  searchParams: Promise<{ error?: string }>;
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

  const { data: bot } = await supabase
    .from("bots")
    .select(
      "id, owner_id, name, slug, system_prompt, welcome_message, primary_color, allowed_origins, is_public, created_at, updated_at",
    )
    .eq("id", botId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!bot) {
    notFound();
  }

  const botRow = bot as BotRow;

  const { data: documents } = await supabase
    .from("documents")
    .select(
      "id, bot_id, owner_id, file_name, storage_path, mime_type, byte_size, status, error_message, created_at, updated_at",
    )
    .eq("bot_id", botId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const documentRows = (documents ?? []) as DocumentRow[];

  const { count: accountDocCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const docsUsed = accountDocCount ?? documentRows.length;
  const readyDocumentCount = documentRows.filter(
    (doc) => doc.status === "ready",
  ).length;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("bot_id", botId)
    .eq("owner_id", user.id)
    .eq("source", "app")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const conversationId = (conversation?.id as string | undefined) ?? null;

  let messageRows: MessageRow[] = [];
  if (conversationId) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, role, content, citation_chunk_ids, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    messageRows = (messages ?? []) as MessageRow[];
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2",
            )}
          >
            ← Bots
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{botRow.name}</h1>
          <p className="text-sm text-muted-foreground">/{botRow.slug}</p>
        </div>
        <form action={deleteBot.bind(null, botId)}>
          <Button type="submit" variant="destructive" size="sm">
            Delete bot
          </Button>
        </form>
      </div>

      {query.error ? (
        <p className="text-sm text-destructive" role="alert">
          {query.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>
            Answers use retrieved chunks from your ready documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatPanel
            botId={botId}
            conversationId={conversationId}
            welcomeMessage={botRow.welcome_message}
            messages={messageRows.map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              created_at: message.created_at,
            }))}
            messagesUsed={usageProfile.messages_used_this_month}
            messagesLimit={plan.limits.messagesPerMonth}
            readyDocumentCount={readyDocumentCount}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Name, welcome message, and accent color for the future widget.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BotSettingsForm bot={botRow} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge</CardTitle>
            <CardDescription>
              Files are chunked and embedded after upload so chat can retrieve
              them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentsPanel
              botId={botId}
              documents={documentRows}
              documentsUsed={docsUsed}
              documentsLimit={plan.limits.documents}
              maxFileMb={plan.limits.maxFileMb}
              canUpload={docsUsed < plan.limits.documents}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
