"use client";

import { useActionState } from "react";

import {
  createBot,
  type BotActionState,
} from "@/app/dashboard/bots/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: BotActionState = { ok: false, message: "" };

export function CreateBotForm() {
  const [state, formAction, pending] = useActionState(createBot, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Support bot"
          required
          maxLength={80}
          disabled={pending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="welcome_message">Welcome message</Label>
        <Textarea
          id="welcome_message"
          name="welcome_message"
          placeholder="Hi! Ask me anything about our docs."
          maxLength={500}
          disabled={pending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="primary_color">Accent color</Label>
        <Input
          id="primary_color"
          name="primary_color"
          type="color"
          defaultValue="#111827"
          disabled={pending}
          className="h-10 w-20 cursor-pointer p-1"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create bot"}
      </Button>
      {state.message ? (
        <p className="text-sm text-destructive" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
