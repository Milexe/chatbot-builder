import { SendIcon } from "lucide-react";

import { DEFAULT_BOT_COLOR, chatSurfaceFromPrimary } from "@/lib/bot-defaults";

const DEMO_MESSAGES: { role: "bot" | "user"; text: string }[] = [
  // Answers the last user line so the duplicated loop feels continuous.
  {
    role: "bot",
    text: "14 Market Street, suite 2 — street parking on the east side.",
  },
  { role: "user", text: "Do you take weekend appointments?" },
  { role: "bot", text: "Yes — Saturday 10:00–14:00. Sunday is closed." },
  { role: "user", text: "How much is a first visit?" },
  {
    role: "bot",
    text: "First consultation is $80. Follow-ups are $55.",
  },
  { role: "user", text: "What should I bring?" },
  {
    role: "bot",
    text: "ID, insurance card, and any prior lab results.",
  },
  { role: "user", text: "Can I cancel same day?" },
  {
    role: "bot",
    text: "Free cancellation until 2 hours before the visit.",
  },
  { role: "user", text: "Where are you located?" },
];

function MessageBubble({
  role,
  text,
}: {
  role: "bot" | "user";
  text: string;
}) {
  const isUser = role === "user";
  return (
    <p
      className={
        isUser
          ? "ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-sm leading-snug text-primary-foreground"
          : "max-w-[90%] rounded-2xl rounded-tl-md border border-border/70 bg-card px-3 py-2 text-sm leading-snug"
      }
    >
      {text}
    </p>
  );
}

/** One loop unit: messages + trailing gap-3 so the next copy sits flush. */
function MessageStack({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) {
  return (
    <div className="px-4" aria-hidden={ariaHidden || undefined}>
      <div className="flex flex-col gap-3">
        {DEMO_MESSAGES.map((message, index) => (
          <MessageBubble
            key={`${message.role}-${index}`}
            role={message.role}
            text={message.text}
          />
        ))}
      </div>
      <div className="h-3" aria-hidden />
    </div>
  );
}

/** Fixed chat frame; duplicated message list scrolls in a seamless loop. */
export function HeroChatPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm select-none lg:mx-0 lg:justify-self-end">
      <div
        aria-hidden
        className="absolute -inset-3 rounded-[1.75rem] bg-primary/15 blur-2xl"
      />
      <div className="relative flex h-[22rem] select-none flex-col overflow-hidden rounded-2xl bg-primary shadow-sm sm:h-[24rem]">
        <div className="flex shrink-0 items-center justify-between px-4 py-3 text-primary-foreground">
          <span className="font-heading text-sm font-semibold tracking-tight">
            Front desk
          </span>
        </div>
        <div
          className="relative min-h-0 flex-1 overflow-hidden py-4"
          style={{
            backgroundColor: chatSurfaceFromPrimary(DEFAULT_BOT_COLOR),
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-white/90 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-white/90 to-transparent"
          />
          <div className="animate-cbb-scroll-messages will-change-transform">
            <MessageStack />
            <MessageStack aria-hidden />
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none shrink-0 border-t border-border/70 bg-card px-3 py-3"
        >
          <div className="flex items-center gap-2 opacity-55">
            <div className="flex h-11 flex-1 items-center rounded-xl border border-border/60 bg-background px-3 text-xs text-muted-foreground/45">
              Ask about hours, pricing, documents…
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/55 text-primary-foreground">
              <SendIcon className="size-5 opacity-80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
