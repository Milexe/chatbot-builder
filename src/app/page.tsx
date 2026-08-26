import { DemoWidgetHint } from "@/components/demo-widget-hint";
import { DemoWidgetMount } from "@/components/demo-widget-mount";
import { HeroChatPreview } from "@/components/hero-chat-preview";
import { OpenDemoChatButton } from "@/components/open-demo-chat-button";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { PLANS } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { headers } from "next/headers";
import Link from "next/link";

async function resolveDemoWidgetOrigin(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const isLocal =
    Boolean(host) &&
    (host!.includes("localhost") || host!.startsWith("127."));

  // Local pages always load local widget.js (ignore remote DEMO_WIDGET_ORIGIN).
  if (isLocal && host) {
    const proto = headerStore.get("x-forwarded-proto") || "http";
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  const configured = process.env.NEXT_PUBLIC_DEMO_WIDGET_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (!host) return "";
  const proto = headerStore.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}

export default async function HomePage() {
  const demoBotId = process.env.NEXT_PUBLIC_DEMO_BOT_ID?.trim();
  const demoWidgetOrigin = await resolveDemoWidgetOrigin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const demoEnabled = Boolean(demoBotId && demoWidgetOrigin && !user);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-border/70">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_0%,oklch(0.9_0.06_300/_0.5),transparent_48%),radial-gradient(ellipse_at_95%_8%,oklch(0.92_0.03_280/_0.35),transparent_42%),linear-gradient(180deg,oklch(0.96_0.02_300),oklch(0.985_0.01_300))]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 top-8 -z-10 size-72 rounded-full bg-primary/15 blur-3xl sm:size-96"
          />

          <div className="mx-auto grid max-w-5xl gap-10 px-4 pb-14 pt-10 sm:gap-12 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end lg:gap-8">
            <div className="min-w-0">
              <p className="animate-cbb-fade-up font-heading text-3xl font-bold tracking-tight text-foreground sm:text-5xl sm:leading-[1.02]">
                Chatbot Builder
              </p>
              <h1 className="animate-cbb-fade-up-delay mt-4 max-w-xl text-xl font-semibold tracking-tight text-balance text-foreground/90 sm:mt-5 sm:text-2xl">
                Your docs become answers on the website
              </h1>
              <p className="animate-cbb-fade-up-delay-2 mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Upload knowledge, test chat in the app, embed a widget customers
                actually use.
              </p>
              <div className="animate-cbb-fade-up-delay-2 mt-7 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:items-center">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full min-[400px]:w-auto",
                  )}
                >
                  Start free
                </Link>
                {demoEnabled ? (
                  <OpenDemoChatButton className="w-full min-[400px]:w-auto" />
                ) : null}
              </div>
            </div>

            <HeroChatPreview />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Three steps to a live widget
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            For teams that answer the same questions every day.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "1",
                title: "Upload docs",
                body: "TXT or Markdown — chunked and indexed for retrieval.",
              },
              {
                step: "2",
                title: "Chat & refine",
                body: "Test answers in the app against your knowledge base.",
              },
              {
                step: "3",
                title: "Embed",
                body: "One script tag. Visitors ask; your docs answer.",
              },
            ].map((item) => (
              <li key={item.step} className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-heading text-4xl font-bold leading-none tracking-tight text-primary">
                    {item.step}
                  </span>
                  <span
                    aria-hidden
                    className="h-0.5 min-w-0 flex-1 bg-primary/70"
                  />
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="pricing"
          className="scroll-mt-20 border-y border-border/70 bg-muted/40 py-14 sm:py-20"
        >
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Pricing
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Simple limits. Upgrade when the widget goes on a real website.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card p-5 sm:p-6",
                    plan.highlighted
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border/80",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-heading text-lg font-bold tracking-tight">
                      {plan.name}
                    </h3>
                    <p className="font-heading text-xl font-bold tabular-nums">
                      {plan.priceLabel}
                      {plan.priceMonthly > 0 ? (
                        <span className="text-sm font-medium text-muted-foreground">
                          /mo
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span
                          className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({
                        variant: plan.highlighted ? "default" : "outline",
                      }),
                      "mt-6 w-full",
                    )}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border/70 py-8 text-center text-sm text-muted-foreground">
        <p className="font-heading font-semibold text-foreground/85">
          Chatbot Builder
        </p>
        <p className="mt-1">© {new Date().getFullYear()}</p>
      </footer>

      {demoEnabled ? (
        <>
          <DemoWidgetMount
            botId={demoBotId!}
            widgetOrigin={demoWidgetOrigin}
          />
          <DemoWidgetHint />
        </>
      ) : null}
    </>
  );
}
