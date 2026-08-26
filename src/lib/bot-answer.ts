import type { SupabaseClient } from "@supabase/supabase-js";

import { createChatCompletion } from "@/lib/openrouter";
import { buildContextBlock, retrieveRelevantChunks } from "@/lib/rag";

export type BotAnswerResult = {
  answer: string;
  citationChunkIds: string[];
};

/** Shared RAG answer path for in-app chat and the embed widget. */
export async function answerBotQuestion(
  supabase: SupabaseClient,
  bot: { id: string; system_prompt: string },
  userMessage: string,
): Promise<BotAnswerResult> {
  const chunks = await retrieveRelevantChunks(supabase, bot.id, userMessage);
  const context = buildContextBlock(chunks);

  const answer = await createChatCompletion([
    {
      role: "system",
      content: `${bot.system_prompt}

Use only the context below to answer. If the answer is not in the context, say you do not know.

Context:
${context}`,
    },
    { role: "user", content: userMessage },
  ]);

  return {
    answer,
    citationChunkIds: chunks.map((chunk) => chunk.id),
  };
}
