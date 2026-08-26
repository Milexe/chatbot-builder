import Link from "next/link";

/** Same quiet text style as login ← Back. */
export function BackToBotsLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      ← Bots
    </Link>
  );
}
