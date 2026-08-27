"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcwIcon, SendIcon } from "lucide-react";

import {
  clearConversation,
  sendChatMessage,
  type ChatActionState,
} from "@/app/dashboard/bots/[botId]/chat-actions";
import { BotUsageMeta } from "@/components/bot-usage-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatSurfaceFromPrimary } from "@/lib/bot-defaults";
import { cn } from "@/lib/utils";

type ChatMessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

const initialState: ChatActionState = { ok: false, message: "" };

/** In-app chat — same bubble language as the landing hero + embed widget. */
export function ChatPanel({
  botId,
  conversationId,
  botName,
  welcomeMessage,
  primaryColor,
  messages,
  messagesUsed,
  messagesLimit,
  documentCount,
  documentsLimit,
  isLive,
}: {
  botId: string;
  conversationId: string | null;
  botName: string;
  welcomeMessage: string;
  primaryColor: string;
  messages: ChatMessageView[];
  messagesUsed: number;
  messagesLimit: number;
  documentCount: number;
  documentsLimit: number;
  isLive: boolean;
}) {
  const router = useRouter();
  const boundSend = sendChatMessage.bind(null, botId, conversationId);
  const [state, formAction, pending] = useActionState(boundSend, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [resetting, startReset] = useTransition();
  const [optimisticUser, setOptimisticUser] = useState<string | null>(null);
  // Hide bubbles for the conversation we just cleared until refresh lands.
  const [clearedConversationId, setClearedConversationId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state, messages.length]);

  const atLimit = messagesUsed >= messagesLimit;
  const optimisticEmpty =
    clearedConversationId !== null && clearedConversationId === conversationId;
  const visibleMessages = optimisticEmpty ? [] : messages;

  const optimisticSynced =
    optimisticUser !== null &&
    messages.some(
      (message) =>
        message.role === "user" && message.content === optimisticUser,
    );
  const sendFailed = !pending && Boolean(state.message) && !state.ok;
  const showOptimisticUser =
    optimisticUser !== null && !optimisticSynced && !sendFailed;

  function submitAction(formData: FormData) {
    const content = String(formData.get("content") ?? "").trim();
    if (content) {
      setOptimisticUser(content);
      setClearedConversationId(null);
      formRef.current?.reset();
    }
    formAction(formData);
  }

  function resetChat() {
    if (!conversationId || resetting) return;
    setClearedConversationId(conversationId);
    startReset(() => {
      void clearConversation(botId, conversationId)
        .then(() => {
          router.refresh();
        })
        .catch(() => {
          setClearedConversationId(null);
        });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BotUsageMeta
          messagesUsed={messagesUsed}
          messagesLimit={messagesLimit}
          documentCount={documentCount}
          documentsLimit={documentsLimit}
          isLive={isLive}
        />
        {conversationId ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={resetting || pending}
            onClick={resetChat}
          >
            <RotateCcwIcon />
            <span className="sr-only">
              {resetting ? "Resetting chat" : "Reset chat"}
            </span>
          </Button>
        ) : null}
      </div>

      <div
        className="flex h-[min(32rem,70vh)] flex-col overflow-hidden rounded-2xl shadow-sm"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex shrink-0 items-center px-4 py-3 text-primary-foreground">
          <span className="font-heading text-sm font-semibold tracking-tight">
            {botName}
          </span>
        </div>

        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
          style={{ backgroundColor: chatSurfaceFromPrimary(primaryColor) }}
        >
          <p className="max-w-[90%] rounded-2xl rounded-tl-md border border-border/70 bg-card px-3 py-2 text-sm leading-snug whitespace-pre-wrap">
            {welcomeMessage}
          </p>
          {visibleMessages.map((message) => (
            <p
              key={message.id}
              className={cn(
                "px-3 py-2 text-sm leading-snug whitespace-pre-wrap",
                message.role === "user"
                  ? "ml-auto max-w-[88%] rounded-2xl rounded-tr-md text-primary-foreground"
                  : "max-w-[90%] rounded-2xl rounded-tl-md border border-border/70 bg-card",
              )}
              style={
                message.role === "user"
                  ? { backgroundColor: primaryColor }
                  : undefined
              }
            >
              {message.content}
            </p>
          ))}
          {showOptimisticUser ? (
            <p
              className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md px-3 py-2 text-sm leading-snug whitespace-pre-wrap text-primary-foreground"
              style={{ backgroundColor: primaryColor }}
            >
              {optimisticUser}
            </p>
          ) : null}
          {pending ? (
            <p className="text-sm text-muted-foreground">Thinking…</p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border/70 bg-card px-3 py-3">
          {state.message && !state.ok ? (
            <p className="mb-2 text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
          {atLimit ? (
            <p className="text-sm text-muted-foreground">
              Monthly message limit reached.
            </p>
          ) : (
            <form
              ref={formRef}
              action={submitAction}
              className="flex items-center gap-2"
            >
              <Input
                name="content"
                placeholder="Ask a question…"
                required
                maxLength={4000}
                disabled={pending}
                autoComplete="off"
                className="h-11 flex-1 rounded-xl"
              />
              <Button
                type="submit"
                disabled={pending}
                style={{ backgroundColor: primaryColor }}
                className="size-11 shrink-0 rounded-xl px-0 text-white hover:opacity-90 [&_svg]:size-5"
              >
                <SendIcon className="size-5" />
                <span className="sr-only">
                  {pending ? "Sending" : "Send"}
                </span>
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
