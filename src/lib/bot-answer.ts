import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createChatCompletion,
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

Use only the context below to answer. If the answer is not in the context, say you do not know.

Context:
${context}`,
    },
    { role: "user", content: userMessage },
  ];
}

/** Shared RAG answer path for in-app chat and the embed widget. */
export async function answerBotQuestion(
  supabase: SupabaseClient,
  bot: { id: string; system_prompt: string },
  userMessage: string,
): Promise<BotAnswerResult> {
  const chunks = await retrieveRelevantChunks(supabase, bot.id, userMessage);
  const context = buildContextBlock(chunks);
  const answer = await createChatCompletion(
    buildRagMessages(bot.system_prompt, context, userMessage),
  );

  return {
    answer,
    citationChunkIds: chunks.map((chunk) => chunk.id),
  };
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
