export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-28 rounded-md bg-muted" />
        <div className="h-4 w-40 rounded-md bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[9.5rem] rounded-2xl border border-border/80 bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}
