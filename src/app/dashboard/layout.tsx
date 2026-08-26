import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { RemoveDemoWidget } from "@/components/remove-demo-widget";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await requireUser();

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(ellipse_at_0%_0%,oklch(0.94_0.03_300/_0.45),transparent_40%),oklch(0.985_0.01_300)]">
      <RemoveDemoWidget />
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
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Bots
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground md:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
