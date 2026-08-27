/** Shared pulse blocks for signed-in route loading states. */
export function PageHeaderSkeleton({
  titleWidth = "w-40",
  subtitleWidth = "w-64",
}: {
  titleWidth?: string;
  subtitleWidth?: string;
}) {
  return (
    <div className="space-y-2">
      <div className={`h-8 ${titleWidth} rounded-md bg-muted`} />
      <div className={`h-4 ${subtitleWidth} max-w-full rounded-md bg-muted`} />
    </div>
  );
}

export function PlanCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[16rem] rounded-2xl border border-border/80 bg-muted/40"
        />
      ))}
    </div>
  );
}

export function BotCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[9.5rem] rounded-2xl border border-border/80 bg-muted/40"
        />
      ))}
    </div>
  );
}

/** Full signed-in chrome skeleton (for routes that own their AppShell). */
export function AppShellSkeleton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(ellipse_at_0%_0%,oklch(0.94_0.03_300/_0.45),transparent_40%),oklch(0.985_0.01_300)]">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />
            <div className="hidden h-7 w-16 animate-pulse rounded-md bg-muted sm:block" />
            <div className="hidden h-7 w-16 animate-pulse rounded-md bg-muted sm:block" />
          </div>
          <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 animate-pulse px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
