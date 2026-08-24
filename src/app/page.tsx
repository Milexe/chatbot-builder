import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLANS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-20 text-center">
          <Badge variant="secondary" className="mb-4">
            Docs → chatbot → embed
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Turn your company docs into a chatbot your customers can use
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground text-pretty">
            Upload knowledge, chat inside the app, and embed a widget on your
            site. Built for service businesses that answer the same questions
            every day.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Start free
            </Link>
            <Link
              href="/#pricing"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              See pricing
            </Link>
          </div>
        </section>

        <section className="border-y bg-muted/40 py-16">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Upload docs",
                body: "PDF, TXT, or Markdown — we chunk and index them for retrieval.",
              },
              {
                step: "2",
                title: "Chat & refine",
                body: "Test answers in a ChatGPT-like interface with citations.",
              },
              {
                step: "3",
                title: "Embed",
                body: "Drop a script on your site. Visitors ask; your docs answer.",
              },
            ].map((item) => (
              <Card key={item.step}>
                <CardHeader>
                  <Badge variant="outline" className="w-fit">
                    Step {item.step}
                  </Badge>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-5xl px-4 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Pricing</h2>
            <p className="mt-2 text-muted-foreground">
              Simple limits. Upgrade when the widget goes on a real website.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={
                  plan.highlighted ? "border-primary shadow-md" : undefined
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-baseline justify-between gap-2">
                    <span>{plan.name}</span>
                    <span className="text-2xl font-semibold">
                      {plan.priceLabel}
                      {plan.priceMonthly > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">
                          /mo
                        </span>
                      )}
                    </span>
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span className="text-primary">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({
                        variant: plan.highlighted ? "default" : "outline",
                      }),
                      "w-full",
                    )}
                  >
                    {plan.cta}
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Chatbot Builder
      </footer>
    </>
  );
}
