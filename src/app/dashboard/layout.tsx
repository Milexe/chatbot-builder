import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { RemoveDemoWidget } from "@/components/remove-demo-widget";
import { requireUser } from "@/lib/auth/session";

async function DashboardAuthedHeader() {
  const { user } = await requireUser();
  return <AppHeader email={user.email} active="bots" />;
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(ellipse_at_0%_0%,oklch(0.94_0.03_300/_0.45),transparent_40%),oklch(0.985_0.01_300)]">
      <RemoveDemoWidget />
      <Suspense fallback={<AppHeader email={undefined} active="bots" />}>
        <DashboardAuthedHeader />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
