import {
  BotCardsSkeleton,
  PageHeaderSkeleton,
} from "@/components/route-skeletons";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <PageHeaderSkeleton titleWidth="w-28" subtitleWidth="w-40" />
      <BotCardsSkeleton />
    </div>
  );
}
