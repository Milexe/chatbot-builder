"use client";

import Link from "next/link";
import { PencilIcon } from "lucide-react";

import { BotFormDialog } from "@/app/dashboard/bots/bot-form-dialog";
import { DeleteBotButton } from "@/app/dashboard/bots/[botId]/delete-bot-button";
import { PauseBotButton } from "@/app/dashboard/bots/[botId]/pause-bot-button";
import { BotUsageMeta } from "@/components/bot-usage-meta";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BotRow } from "@/types/database";

export type BotCardStats = {
  documentCount: number;
};

export function BotsGrid({
  bots,
  statsByBotId,
  messagesUsed,
  messagesLimit,
  documentsLimit,
  atBotLimit,
  planName,
}: {
  bots: BotRow[];
  statsByBotId: Record<string, BotCardStats>;
  messagesUsed: number;
  messagesLimit: number;
  documentsLimit: number;
  atBotLimit: boolean;
  planName: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bots.map((bot) => {
        const stats = statsByBotId[bot.id] ?? { documentCount: 0 };
        const live = bot.is_public;

        return (
          <article
            key={bot.id}
            className="relative flex min-h-[9.5rem] flex-col justify-between rounded-2xl border border-border/80 bg-card p-4"
          >
            <div className="absolute top-3 right-3 flex gap-1.5">
              <PauseBotButton botId={bot.id} isLive={live} />
              <DeleteBotButton botId={bot.id} botName={bot.name} />
            </div>
            <div className="min-w-0 space-y-2 pr-16">
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-1.5 size-2.5 shrink-0 rounded-full",
                    live ? "bg-emerald-500" : "bg-amber-500",
                  )}
                  title={live ? "Live" : "Paused"}
                  aria-label={live ? "Live" : "Paused"}
                />
                <h2 className="font-heading truncate text-base font-semibold tracking-tight">
                  {bot.name}
                </h2>
              </div>
              <BotUsageMeta
                messagesUsed={messagesUsed}
                messagesLimit={messagesLimit}
                documentCount={stats.documentCount}
                documentsLimit={documentsLimit}
                isLive={live}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/dashboard/bots/${bot.id}`}
                className={cn(buttonVariants({ size: "sm" }), "flex-1")}
              >
                Details
              </Link>
              <BotFormDialog
                mode="edit"
                bot={bot}
                trigger={
                  <Button type="button" size="icon-sm" variant="outline">
                    <PencilIcon />
                    <span className="sr-only">Edit</span>
                  </Button>
                }
              />
            </div>
          </article>
        );
      })}

      {atBotLimit ? (
        <div className="flex min-h-[9.5rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/30 p-4 text-center">
          <div>
            <p className="font-heading text-sm font-semibold">Limit reached</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {planName} plan is full
            </p>
          </div>
          <Link
            href="/pricing"
            className={cn(buttonVariants({ size: "sm" }), "w-full max-w-[12rem]")}
          >
            View plans
          </Link>
        </div>
      ) : (
        <BotFormDialog
          mode="create"
          trigger={
            <button
              type="button"
              className="flex min-h-[9.5rem] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-card/60 p-4 text-center transition-colors hover:border-primary hover:bg-accent/40"
            >
              <span className="font-heading text-5xl font-light leading-none text-primary">
                +
              </span>
              <span className="font-heading text-base font-semibold text-primary">
                Create new bot
              </span>
            </button>
          }
        />
      )}
    </div>
  );
}
