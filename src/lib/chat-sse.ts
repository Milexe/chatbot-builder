export type ChatSseEvent =
  | {
      type: "meta";
      conversationId: string;
      citationChunkIds: string[];
    }
  | { type: "delta"; text: string }
  | {
      type: "done";
      answer: string;
      session?: { id: string; messageCount: number; limit: number };
    }
  | { type: "error"; message: string };

const encoder = new TextEncoder();

export function encodeSseEvent(event: ChatSseEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** Build a text/event-stream Response from an async SSE producer. */
export function createChatSseResponse(
  run: (send: (event: ChatSseEvent) => void) => Promise<void>,
  init?: { headers?: HeadersInit },
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatSseEvent) => {
        controller.enqueue(encodeSseEvent(event));
      };

      try {
        await run(send);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Chat stream failed.";
        try {
          send({ type: "error", message });
        } catch {
          // Controller may already be closed.
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...(init?.headers ?? {}),
    },
  });
}

/** Parse one SSE `data:` JSON payload from a chat stream. */
export function parseChatSseData(payload: string): ChatSseEvent | null {
  try {
    return JSON.parse(payload) as ChatSseEvent;
  } catch {
    return null;
  }
}
