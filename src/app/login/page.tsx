import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";
import { SiteHeader } from "@/components/site-header";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="relative isolate flex flex-1 flex-col justify-center overflow-hidden px-4 py-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.9_0.06_300/_0.4),transparent_55%),linear-gradient(180deg,oklch(0.96_0.02_300),oklch(0.98_0.01_300))]"
        />
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border/80 bg-card/95 p-5 shadow-[0_24px_60px_-36px_oklch(0.35_0.06_300/_0.45)] sm:p-7">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Google or email to manage bots.
          </p>
          <div className="mt-6 flex flex-col gap-4">
            {params.error ? (
              <p className="text-sm text-destructive" role="alert">
                {params.error}
              </p>
            ) : null}
            <LoginForm nextPath={params.next} />
            <Link
              href="/"
              className="self-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
