import type { SupabaseClient } from "@supabase/supabase-js";

import {
  streamChatCompletion,
  type ChatMessage,
} from "@/lib/openrouter";
import { buildContextBlock, retrieveRelevantChunks } from "@/lib/rag";

export type BotAnswerResult = {
  answer: string;
  citationChunkIds: string[];
};

function buildRagMessages(
  systemPrompt: string,
  context: string,
  userMessage: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `${systemPrompt}

Use only the context below to answer. If the answer is not in the context, say so briefly and warmly — you are not sure from the available docs — and, when helpful, suggest a next step (e.g. rephrase, check related topics in the docs, or contact support). Do not invent facts.

Context:
${context}`,
    },
    { role: "user", content: userMessage },
  ];
}

/**
 * Stream a RAG answer. Calls `onReady` after retrieval, then `onDelta` per token.
 */
export async function streamBotAnswer(
  supabase: SupabaseClient,
  bot: { id: string; system_prompt: string },
  userMessage: string,
  handlers: {
    onReady?: (citationChunkIds: string[]) => void;
    onDelta: (text: string) => void;
  },
): Promise<BotAnswerResult> {
  const chunks = await retrieveRelevantChunks(supabase, bot.id, userMessage);
  const context = buildContextBlock(chunks);
  const citationChunkIds = chunks.map((chunk) => chunk.id);
  handlers.onReady?.(citationChunkIds);

  let answer = "";
  for await (const delta of streamChatCompletion(
    buildRagMessages(bot.system_prompt, context, userMessage),
  )) {
    answer += delta;
    handlers.onDelta(delta);
  }

  const trimmed = answer.trim();
  if (!trimmed) {
    throw new Error("OpenRouter returned an empty chat stream.");
  }

  return { answer: trimmed, citationChunkIds };
}
