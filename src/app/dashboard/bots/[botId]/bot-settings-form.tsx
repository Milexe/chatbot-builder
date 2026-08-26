"use client";

import { useActionState } from "react";

import {
  updateBot,
  type BotActionState,
} from "@/app/dashboard/bots/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BotRow } from "@/types/database";

const initialState: BotActionState = { ok: false, message: "" };

export function BotSettingsForm({ bot }: { bot: BotRow }) {
  const boundUpdate = updateBot.bind(null, bot.id);
  const [state, formAction, pending] = useActionState(
    boundUpdate,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={bot.name}
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
          defaultValue={bot.welcome_message}
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
          defaultValue={bot.primary_color}
          disabled={pending}
          className="h-10 w-20 cursor-pointer p-1"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="allowed_origins">Allowed embed origins</Label>
        <Textarea
          id="allowed_origins"
          name="allowed_origins"
          defaultValue={bot.allowed_origins.join("\n")}
          placeholder={"*\nhttps://example.com\nhttp://localhost:3000"}
          rows={4}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          One origin per line (scheme + host, optional port). Covers all pages on
          that host. Use <code className="text-[0.7rem]">*</code> or leave empty
          to allow any website. Local smoke test:{" "}
          <code className="text-[0.7rem]">http://localhost:3000</code>.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
      {state.message ? (
        <p
          className={
            state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
