import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared signed-in chrome (Bots / Pricing tabs + sign out). */
export function AppHeader({
  email,
  active,
}: {
  email: string | null | undefined;
  active: "bots" | "pricing";
}) {
  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href="/dashboard"
            className="font-heading truncate text-base font-semibold tracking-tight sm:text-lg"
          >
            Chatbot Builder
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({
                  variant: active === "bots" ? "secondary" : "ghost",
                  size: "sm",
                }),
              )}
            >
              Bots
            </Link>
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({
                  variant: active === "pricing" ? "secondary" : "ghost",
                  size: "sm",
                }),
              )}
            >
              Pricing
            </Link>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground md:inline">
            {email}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
