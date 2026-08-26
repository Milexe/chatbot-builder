"use client";

import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "chatbot-builder:open";

/** Opens the embed widget panel when the demo bot script is mounted. */
export function OpenDemoChatButton({
  className,
  children = "Try it live",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ size: "lg", variant: "outline" }),
        className,
      )}
      onClick={() => {
        window.dispatchEvent(new CustomEvent(OPEN_EVENT));
      }}
    >
      {children}
    </button>
  );
}
