import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Chatbot Builder
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/#pricing"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
