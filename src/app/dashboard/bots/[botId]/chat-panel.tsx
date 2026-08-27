"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcwIcon, SendIcon } from "lucide-react";

import { clearConversation } from "@/app/dashboard/bots/[botId]/chat-actions";
import { BotUsageMeta } from "@/components/bot-usage-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseChatSseData, type ChatSseEvent } from "@/lib/chat-sse";
import { chatSurfaceFromPrimary } from "@/lib/bot-defaults";
import { cn } from "@/lib/utils";

type ChatMessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

async function readChatSse(
  response: Response,
  onEvent: (event: ChatSseEvent) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error("Empty response stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((part) => part.trim())
        .find((part) => part.startsWith("data:"));
      if (!line) continue;
      const event = parseChatSseData(line.slice(5).trim());
      if (event) onEvent(event);
    }
  }
}

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
  isLive: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [resetting, startReset] = useTransition();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticUser, setOptimisticUser] = useState<string | null>(null);
  const [streamingAssistant, setStreamingAssistant] = useState<string | null>(
    null,
  );
  /** Set from stream meta when a new conversation is created mid-send. */
  const [streamConversationId, setStreamConversationId] = useState<
    string | null
  >(null);
  // Hide bubbles for the conversation we just cleared until refresh lands.
  const [clearedConversationId, setClearedConversationId] = useState<
    string | null
  >(null);

  const activeConversationId = streamConversationId ?? conversationId;
  const atLimit = messagesUsed >= messagesLimit;
  const optimisticEmpty =
    clearedConversationId !== null &&
    clearedConversationId === activeConversationId;
  const visibleMessages = optimisticEmpty ? [] : messages;

  const optimisticSynced =
    optimisticUser !== null &&
    messages.some(
      (message) =>
        message.role === "user" && message.content === optimisticUser,
    );
  const showOptimisticUser =
    optimisticUser !== null && !optimisticSynced && !error;

  async function sendMessage(content: string) {
    setPending(true);
    setError(null);
    setOptimisticUser(content);
    setStreamingAssistant("");
    setClearedConversationId(null);
    formRef.current?.reset();

    try {
      const response = await fetch(`/api/bots/${botId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationId: activeConversationId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Chat request failed.");
      }

      let sawError: string | null = null;

      await readChatSse(response, (event) => {
        if (event.type === "meta") {
          setStreamConversationId(event.conversationId);
          return;
        }
        if (event.type === "delta") {
          setStreamingAssistant((prev) => (prev ?? "") + event.text);
          return;
        }
        if (event.type === "error") {
          sawError = event.message;
          setError(event.message);
          return;
        }
        if (event.type === "done") {
          setStreamingAssistant(event.answer);
        }
      });

      if (sawError) {
        setStreamingAssistant(null);
      } else {
        setOptimisticUser(null);
        setStreamingAssistant(null);
        router.refresh();
      }
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Chat request failed.";
      setError(message);
      setStreamingAssistant(null);
      setOptimisticUser(null);
      if (inputRef.current) {
        inputRef.current.value = content;
      }
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || atLimit) return;
    const formData = new FormData(event.currentTarget);
    const content = String(formData.get("content") ?? "").trim();
    if (!content) return;
    void sendMessage(content);
  }

  function resetChat() {
    if (!activeConversationId || resetting || pending) return;
    setClearedConversationId(activeConversationId);
    setOptimisticUser(null);
    setStreamingAssistant(null);
    setError(null);
    startReset(() => {
      void clearConversation(botId, activeConversationId)
        .then(() => {
          setStreamConversationId(null);
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
          isLive={isLive}
        />
        {activeConversationId ? (
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
          {streamingAssistant !== null ? (
            <p className="max-w-[90%] rounded-2xl rounded-tl-md border border-border/70 bg-card px-3 py-2 text-sm leading-snug whitespace-pre-wrap">
              {streamingAssistant || (pending ? "…" : "")}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border/70 bg-card px-3 py-3">
          {error ? (
            <p className="mb-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {atLimit ? (
            <p className="text-sm text-muted-foreground">
              Monthly message limit reached.
            </p>
          ) : (
            <form
              ref={formRef}
              onSubmit={onSubmit}
              className="flex items-center gap-2"
            >
              <Input
                ref={inputRef}
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
