"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { openBillingPortal, startCheckout } from "@/app/pricing/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  /** Paid → paid plan change (proration) — confirm before charging. */
  confirmProration = false,
  planName,
}: {
  planId: Exclude<PlanId, "free">;
  label: string;
  variant?: "default" | "outline";
  confirmProration?: boolean;
  planName?: string;
}) {
  const [open, setOpen] = useState(false);
  const action = startCheckout.bind(null, planId);

  if (!confirmProration) {
    return (
      <form action={action} className="w-full">
        <Button type="submit" variant={variant} className="w-full">
          <PendingLabel idle={label} pending="Redirecting…" />
        </Button>
      </form>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className="w-full"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              Upgrade to {planName ?? planId}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your subscription will switch immediately. Stripe prorates the
            price difference for the rest of this billing period — you may be
            charged right away.
          </p>
          <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <form action={action}>
              <Button type="submit" variant="default">
                <PendingLabel idle="Confirm upgrade" pending="Updating…" />
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
