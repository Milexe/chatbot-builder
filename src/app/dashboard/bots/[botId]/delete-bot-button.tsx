"use client";

import { Trash2Icon } from "lucide-react";

import { deleteBot } from "@/app/dashboard/bots/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";

export function DeleteBotButton({
  botId,
  botName,
}: {
  botId: string;
  botName: string;
}) {
  return (
    <ConfirmDeleteButton
      title="Delete bot?"
      description={`Delete “${botName}” and its documents?`}
      label="Delete bot"
      onConfirm={() => deleteBot(botId)}
      trigger={
        <Button type="button" variant="destructive" size="icon-sm">
          <Trash2Icon />
          <span className="sr-only">Delete</span>
        </Button>
      }
    />
  );
}
