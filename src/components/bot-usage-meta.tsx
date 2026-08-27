/** Compact usage line for bot cards (counts only — limits live in the page header). */
export function BotCardMeta({
  messagesUsed,
  documentCount,
  isLive,
}: {
  messagesUsed: number;
  documentCount: number;
  isLive: boolean;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>Messages {messagesUsed}</span>
      <span
        className="size-1 shrink-0 rounded-full bg-muted-foreground/45"
        aria-hidden
      />
      <span>Docs {documentCount}</span>
      <span
        className="size-1 shrink-0 rounded-full bg-muted-foreground/45"
        aria-hidden
      />
      <span>{isLive ? "Live" : "Paused"}</span>
    </p>
  );
}

/** Chat preview meta — monthly message quota + docs on this bot. */
export function BotUsageMeta({
  messagesUsed,
  messagesLimit,
  documentCount,
  isLive,
}: {
  messagesUsed: number;
  messagesLimit: number;
  documentCount: number;
  isLive: boolean;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        Messages {messagesUsed}/{messagesLimit}
      </span>
      <span
        className="size-1 shrink-0 rounded-full bg-muted-foreground/45"
        aria-hidden
      />
      <span>Docs {documentCount}</span>
      <span
        className="size-1 shrink-0 rounded-full bg-muted-foreground/45"
        aria-hidden
      />
      <span>{isLive ? "Live" : "Paused"}</span>
    </p>
  );
}
