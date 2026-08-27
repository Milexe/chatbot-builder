"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Show a one-shot billing flash, then strip query params from the URL. */
export function BillingFlash({ message }: { message: string | null }) {
  const router = useRouter();
  const [text] = useState(message);

  useEffect(() => {
    if (!message) return;
    router.replace("/pricing", { scroll: false });
  }, [message, router]);

  if (!text) return null;

  return (
    <p
      className="rounded-xl border border-border/80 bg-card px-4 py-3 text-sm text-muted-foreground"
      role="status"
    >
      {text}
    </p>
  );
}
