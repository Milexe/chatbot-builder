/** Same Messages · Docs · Live/Paused line used on bot cards and chat preview. */
export function BotUsageMeta({
  messagesUsed,
  messagesLimit,
  documentCount,
  documentsLimit,
  isLive,
}: {
  messagesUsed: number;
  messagesLimit: number;
  documentCount: number;
  documentsLimit: number;
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
      <span>
        Docs {documentCount}/{documentsLimit}
      </span>
      <span
        className="size-1 shrink-0 rounded-full bg-muted-foreground/45"
        aria-hidden
      />
      <span>{isLive ? "Live" : "Paused"}</span>
    </p>
  );
}
