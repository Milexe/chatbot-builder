"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  clearConversation,
  sendChatMessage,
  type ChatActionState,
} from "@/app/dashboard/bots/[botId]/chat-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ChatMessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

const initialState: ChatActionState = { ok: false, message: "" };

export function ChatPanel({
  botId,
  conversationId,
  welcomeMessage,
  messages,
  messagesUsed,
  messagesLimit,
  readyDocumentCount,
}: {
  botId: string;
  conversationId: string | null;
  welcomeMessage: string;
  messages: ChatMessageView[];
  messagesUsed: number;
  messagesLimit: number;
  readyDocumentCount: number;
}) {
  const boundSend = sendChatMessage.bind(null, botId, conversationId);
  const [state, formAction, pending] = useActionState(boundSend, initialState);
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state, messages.length]);

  const atLimit = messagesUsed >= messagesLimit;

  return (
    <div className="flex h-[min(32rem,70vh)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {messagesUsed}/{messagesLimit} messages this month
          {readyDocumentCount === 0
            ? " · upload a ready document for grounded answers"
            : ` · ${readyDocumentCount} ready doc${readyDocumentCount === 1 ? "" : "s"}`}
        </p>
        {conversationId ? (
          <form action={clearConversation.bind(null, botId, conversationId)}>
            <Button type="submit" variant="outline" size="sm">
              New chat
            </Button>
          </form>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border p-4">
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          {welcomeMessage}
        </div>
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "mr-8 rounded-lg bg-muted px-3 py-2 text-sm"
            }
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {pending ? (
          <p className="text-sm text-muted-foreground">Thinking…</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {state.message && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {atLimit ? (
        <p className="text-sm text-muted-foreground">
          Monthly message limit reached for this plan.
        </p>
      ) : (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <Textarea
            name="content"
            placeholder="Ask about your documents…"
            required
            maxLength={4000}
            rows={2}
            disabled={pending}
            className="min-h-[2.75rem] flex-1 resize-none"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send"}
          </Button>
        </form>
      )}
    </div>
  );
}
