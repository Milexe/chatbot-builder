"use client";

import { useActionState, useId, useState, type ReactNode } from "react";

import {
  createBot,
  updateBot,
  type BotActionState,
} from "@/app/dashboard/bots/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_BOT_COLOR,
  DEFAULT_BOT_NAME,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_WELCOME_MESSAGE,
} from "@/lib/bot-defaults";
import type { BotRow } from "@/types/database";

const initialState: BotActionState = { ok: false, message: "" };

type BotFormDialogProps = {
  mode: "create" | "edit";
  bot?: BotRow;
  trigger: ReactNode;
};

/**
 * Create/edit bot dialog.
 * Form unmounts when closed so useActionState resets without epoch hacks.
 */
export function BotFormDialog({ mode, bot, trigger }: BotFormDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton={false}
        render={<span className="contents" />}
      >
        {trigger}
      </DialogTrigger>
      <DialogContent
        className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg"
        showCloseButton
      >
        {open ? (
          <BotFormFields
            mode={mode}
            bot={bot}
            onSuccess={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BotFormFields({
  mode,
  bot,
  onSuccess,
}: {
  mode: "create" | "edit";
  bot?: BotRow;
  onSuccess: () => void;
}) {
  const id = useId();
  const serverAction =
    mode === "create" ? createBot : updateBot.bind(null, bot!.id);

  const [state, formAction, pending] = useActionState(
    async (prev: BotActionState, formData: FormData) => {
      const next = await serverAction(prev, formData);
      if (mode === "edit" && next.ok) {
        onSuccess();
      }
      return next;
    },
    initialState,
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "New bot" : "Edit bot"}</DialogTitle>
      </DialogHeader>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={mode === "edit" ? (bot?.name ?? "") : ""}
            placeholder={DEFAULT_BOT_NAME}
            maxLength={80}
            disabled={pending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-welcome`}>Welcome</Label>
          <Textarea
            id={`${id}-welcome`}
            name="welcome_message"
            defaultValue={mode === "edit" ? (bot?.welcome_message ?? "") : ""}
            placeholder={DEFAULT_WELCOME_MESSAGE}
            maxLength={500}
            rows={2}
            disabled={pending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-system`}>System prompt</Label>
          <Textarea
            id={`${id}-system`}
            name="system_prompt"
            defaultValue={mode === "edit" ? (bot?.system_prompt ?? "") : ""}
            placeholder={DEFAULT_SYSTEM_PROMPT}
            maxLength={4000}
            rows={4}
            disabled={pending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-color`}>Color</Label>
          <div className="flex items-center gap-3 rounded-xl border border-input bg-background p-2">
            <input
              id={`${id}-color`}
              name="primary_color"
              type="color"
              defaultValue={
                mode === "edit"
                  ? (bot?.primary_color ?? DEFAULT_BOT_COLOR)
                  : DEFAULT_BOT_COLOR
              }
              disabled={pending}
              className="h-10 w-full cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-0"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-origins`}>Origins</Label>
          <Textarea
            id={`${id}-origins`}
            name="allowed_origins"
            defaultValue={
              mode === "edit" ? (bot?.allowed_origins.join("\n") ?? "") : ""
            }
            placeholder="* or https://example.com"
            rows={2}
            disabled={pending}
          />
        </div>
        {state.message && !state.ok ? (
          <p className="text-sm text-destructive" role="status">
            {state.message}
          </p>
        ) : null}
        <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
          <Button type="submit" disabled={pending}>
            {pending
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
                ? "Create"
                : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
