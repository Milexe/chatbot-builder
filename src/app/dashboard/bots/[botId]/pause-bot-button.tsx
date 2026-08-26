"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PauseIcon, PlayIcon } from "lucide-react";

import { setBotPaused } from "@/app/dashboard/bots/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function preserveScroll(run: () => void | Promise<void>) {
  const y = window.scrollY;
  return Promise.resolve(run()).finally(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
    });
  });
}

export function PauseBotButton({
  botId,
  isLive,
}: {
  botId: string;
  isLive: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runPause(paused: boolean) {
    startTransition(() => {
      void preserveScroll(async () => {
        await setBotPaused(botId, paused);
        router.refresh();
        setOpen(false);
      });
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => {
          if (isLive) {
            setOpen(true);
            return;
          }
          runPause(false);
        }}
      >
        {isLive ? <PauseIcon /> : <PlayIcon />}
        <span className="sr-only">{isLive ? "Pause" : "Resume"}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Pause this bot?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The embed widget will disappear on all sites until you resume. In-app
            chat and settings stay available.
          </p>
          <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => runPause(true)}
            >
              {pending ? "Pausing…" : "Pause bot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
