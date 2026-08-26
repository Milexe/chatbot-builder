"use client";

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDeleteButtonProps = {
  label?: string;
  title?: string;
  description?: string;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  trigger: ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;
};

/** Icon/action trigger that asks before running a destructive action. */
export function ConfirmDeleteButton({
  label = "Delete",
  title = "Delete?",
  description = "This cannot be undone.",
  pending = false,
  onConfirm,
  trigger,
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const triggerNode = isValidElement(trigger)
    ? cloneElement(trigger, {
        onClick: (event: React.MouseEvent) => {
          trigger.props.onClick?.(event);
          setOpen(true);
        },
      })
    : trigger;

  return (
    <>
      {triggerNode}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{description}</p>
          <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              disabled={busy || pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || pending}
              onClick={() => void confirm()}
            >
              {busy || pending ? "Deleting…" : label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
