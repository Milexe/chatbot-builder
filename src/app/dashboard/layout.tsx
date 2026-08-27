import { AppShell } from "@/components/app-shell";
import { RemoveDemoWidget } from "@/components/remove-demo-widget";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await requireUser();

  return (
    <>
      <RemoveDemoWidget />
      <AppShell email={user.email} active="bots">
        {children}
      </AppShell>
    </>
  );
}
