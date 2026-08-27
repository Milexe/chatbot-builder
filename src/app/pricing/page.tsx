import {
  ManageBillingButton,
  UpgradeButton,
} from "@/app/pricing/billing-buttons";
import { BackToBotsLink } from "@/app/dashboard/bots/[botId]/back-to-bots-link";
import { AppShell } from "@/components/app-shell";
import { BillingFlash } from "@/components/billing-flash";
import { buttonVariants } from "@/components/ui/button";
import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import { PLANS, type Plan, type PlanId } from "@/lib/pricing";
import { ensureMessagePeriod } from "@/lib/usage";
import { cn } from "@/lib/utils";

type PricingPageProps = {
  searchParams: Promise<{
    billing?: string;
    error?: string;
  }>;
};

const PLAN_RANK = { free: 0, pro: 1, business: 2 } as const;

function formatPeriodEnd(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function planActionLabel(target: Plan, currentId: PlanId): string {
  if (PLAN_RANK[currentId] > PLAN_RANK[target.id]) {
    return `Downgrade to ${target.name}`;
  }
  if (PLAN_RANK[currentId] < PLAN_RANK[target.id]) {
    return `Upgrade to ${target.name}`;
  }
  return target.cta;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const query = await searchParams;
  const { supabase, user } = await requireUser();
  const { plan, profile } = await requireProfilePlan(supabase, user.id);
  const usage = await ensureMessagePeriod(supabase, profile);

  const { count: botCount } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const { count: docCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const botsUsed = botCount ?? 0;
  const docsUsed = docCount ?? 0;
  const periodEnd = formatPeriodEnd(profile.current_period_end);
  const currentId = plan.id as PlanId;
  const isPaid = currentId !== "free";
  const cancelScheduled = Boolean(profile.cancel_at_period_end);

  const statusMessage = (() => {
    if (query.billing === "success") {
      return "Payment received. Plan and limits update when Stripe confirms (usually seconds).";
    }
    if (query.billing === "canceled") {
      return "Checkout canceled — no charge.";
    }
    if (query.error === "already_on_plan") {
      return "You are already on that plan.";
    }
    if (query.error === "checkout_failed" || query.error === "customer_failed") {
      return "Could not start Checkout. Check Stripe keys / Price IDs and try again.";
    }
    if (query.error === "portal_failed") {
      return "Could not open the billing portal. Try again in a moment.";
    }
    if (query.error) {
      return "Something went wrong with billing. Try again.";
    }
    return null;
  })();

  return (
    <AppShell email={user.email} active="pricing">
      <div className="space-y-6">
        <div className="space-y-1">
          <BackToBotsLink />
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Pricing & billing
          </h1>
          <p className="text-sm text-muted-foreground">
            Stripe Checkout for upgrades · Customer Portal for cards, cancel at
            period end, and invoices.
          </p>
        </div>

        <BillingFlash message={statusMessage} />

        <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Current plan
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold tracking-tight">
                {plan.name}
                <span className="ml-2 text-base font-medium text-muted-foreground">
                  {plan.priceLabel}
                  {plan.priceMonthly > 0 ? "/mo" : ""}
                </span>
              </h2>
              {cancelScheduled && periodEnd ? (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                  Cancels at period end — access until {periodEnd}.
                </p>
              ) : periodEnd && isPaid ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Current period ends {periodEnd}.
                </p>
              ) : null}
              {profile.subscription_status ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Status: {profile.subscription_status}
                  {cancelScheduled ? " (cancel scheduled)" : ""}
                </p>
              ) : null}
            </div>
            {isPaid ||
            (profile.stripe_customer_id &&
              !profile.stripe_customer_id.startsWith("mock_")) ? (
              <div className="w-full sm:w-auto sm:min-w-[10.5rem]">
                <ManageBillingButton />
              </div>
            ) : null}
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
              <dt className="text-xs text-muted-foreground">Bots</dt>
              <dd className="font-heading mt-1 text-lg font-semibold tabular-nums">
                {botsUsed}/{plan.limits.bots}
              </dd>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
              <dt className="text-xs text-muted-foreground">Documents</dt>
              <dd className="font-heading mt-1 text-lg font-semibold tabular-nums">
                {docsUsed}/{plan.limits.documents}
              </dd>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
              <dt className="text-xs text-muted-foreground">
                Messages this month
              </dt>
              <dd className="font-heading mt-1 text-lg font-semibold tabular-nums">
                {usage.messages_used_this_month}/{plan.limits.messagesPerMonth}
              </dd>
            </div>
          </dl>

          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            <li>
              Max file size: {plan.limits.maxFileMb} MB · Branding{" "}
              {plan.limits.removeBranding ? "removable" : "required on embed"}
            </li>
            <li>
              Card details and invoices live in the Stripe Customer Portal —
              we never store card numbers.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Change plan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upgrades go through Checkout (or proration if you already
            subscribe). Downgrades and cancel use Manage billing.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((item) => {
              const isCurrent = item.id === currentId;
              const isUpgrade = PLAN_RANK[item.id] > PLAN_RANK[currentId];
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card p-5",
                    isUpgrade
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border/80",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-heading text-lg font-bold tracking-tight">
                      {item.name}
                    </h3>
                    <p className="font-heading text-xl font-bold tabular-nums">
                      {item.priceLabel}
                      {item.priceMonthly > 0 ? (
                        <span className="text-sm font-medium text-muted-foreground">
                          /mo
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span
                          className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    {isCurrent ? (
                      <div
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "pointer-events-none h-8 w-full justify-center opacity-70",
                        )}
                        aria-current="true"
                      >
                        Current plan
                      </div>
                    ) : item.id === "free" ? (
                      isPaid ? (
                        cancelScheduled ? (
                          <div
                            className={cn(
                              buttonVariants({ variant: "outline" }),
                              "pointer-events-none h-8 w-full justify-center opacity-70",
                            )}
                          >
                            Free after {periodEnd ?? "period end"}
                          </div>
                        ) : (
                          <ManageBillingButton label="Cancel subscription" />
                        )
                      ) : (
                        <div
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "pointer-events-none h-8 w-full justify-center opacity-70",
                          )}
                        >
                          Included
                        </div>
                      )
                    ) : (
                      <UpgradeButton
                        planId={item.id}
                        label={planActionLabel(item, currentId)}
                        variant={isUpgrade ? "default" : "outline"}
                        confirmProration={isUpgrade && isPaid}
                        planName={item.name}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
