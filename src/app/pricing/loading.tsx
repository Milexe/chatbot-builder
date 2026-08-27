import {
  AppShellSkeleton,
  PageHeaderSkeleton,
  PlanCardsSkeleton,
} from "@/components/route-skeletons";

export default function PricingLoading() {
  return (
    <AppShellSkeleton>
      <div className="space-y-6">
        <PageHeaderSkeleton titleWidth="w-52" subtitleWidth="w-80" />
        <div className="min-h-[10rem] rounded-2xl border border-border/80 bg-muted/40" />
        <div className="space-y-3">
          <div className="h-6 w-36 rounded-md bg-muted" />
          <div className="h-4 w-72 max-w-full rounded-md bg-muted" />
          <PlanCardsSkeleton />
        </div>
      </div>
    </AppShellSkeleton>
  );
}
