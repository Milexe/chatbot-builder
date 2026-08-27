"use client";

import { useFormStatus } from "react-dom";

import { openBillingPortal, startCheckout } from "@/app/pricing/actions";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/pricing";

function PendingLabel({
  idle,
  pending,
}: {
  idle: string;
  pending: string;
}) {
  const { pending: isPending } = useFormStatus();
  return <>{isPending ? pending : idle}</>;
}

export function UpgradeButton({
  planId,
  label,
  variant = "default",
}: {
  planId: Exclude<PlanId, "free">;
  label: string;
  variant?: "default" | "outline";
}) {
  return (
    <form action={startCheckout.bind(null, planId)} className="w-full">
      <Button type="submit" variant={variant} className="w-full">
        <PendingLabel idle={label} pending="Redirecting…" />
      </Button>
    </form>
  );
}

export function ManageBillingButton({
  label = "Manage billing",
  variant = "outline",
}: {
  label?: string;
  variant?: "default" | "outline";
}) {
  return (
    <form action={openBillingPortal} className="w-full">
      <Button type="submit" variant={variant} className="w-full">
        <PendingLabel idle={label} pending="Opening…" />
      </Button>
    </form>
  );
}
