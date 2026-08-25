import Link from "next/link";

import { CreateBotForm } from "@/app/dashboard/bots/create-bot-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import type { BotRow } from "@/types/database";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const { plan } = await requireProfilePlan(supabase, user.id);

  const { data: bots, error } = await supabase
    .from("bots")
    .select(
      "id, owner_id, name, slug, system_prompt, welcome_message, primary_color, allowed_origins, is_public, created_at, updated_at",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const botRows = (bots ?? []) as BotRow[];
  const atBotLimit = botRows.length >= plan.limits.bots;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bots</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.name} plan · {botRows.length}/{plan.limits.bots} bots used
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load bots: {error.message}. Apply the SQL migration if you
          have not already.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          {botRows.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No bots yet</CardTitle>
                <CardDescription>
                  Create your first bot, then upload TXT or Markdown docs.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            botRows.map((bot) => (
              <Card key={bot.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span
                        className="inline-block size-3 rounded-full"
                        style={{ backgroundColor: bot.primary_color }}
                        aria-hidden
                      />
                      {bot.name}
                    </CardTitle>
                    <CardDescription>/{bot.slug}</CardDescription>
                  </div>
                  <Link
                    href={`/dashboard/bots/${bot.id}`}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    Open
                  </Link>
                </CardHeader>
              </Card>
            ))
          )}
        </section>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Create bot</CardTitle>
            <CardDescription>
              {atBotLimit ? (
                <>
                  Limit reached on the {plan.name} plan.{" "}
                  <Badge variant="secondary">Upgrade later</Badge>
                </>
              ) : (
                "Name it, set a welcome line, pick a color."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {atBotLimit ? (
              <p className="text-sm text-muted-foreground">
                Delete a bot or wait for billing (Stripe) to raise the limit.
              </p>
            ) : (
              <CreateBotForm />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
