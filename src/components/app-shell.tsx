import { AppHeader } from "@/components/app-header";

/** Shared signed-in page chrome: gradient + header + main gutters. */
export function AppShell({
  email,
  active,
  children,
}: {
  email: string | null | undefined;
  active: "bots" | "pricing";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(ellipse_at_0%_0%,oklch(0.94_0.03_300/_0.45),transparent_40%),oklch(0.985_0.01_300)]">
      <AppHeader email={email} active={active} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
