import type { SupabaseClient } from "@supabase/supabase-js";

import { RAG_MATCH_COUNT, RAG_MATCH_THRESHOLD } from "@/lib/limits";
import { createEmbeddings } from "@/lib/openrouter";

export type RetrievedChunk = {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  similarity: number;
};

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** Embed a query and retrieve similar document chunks for a bot. */
export async function retrieveRelevantChunks(
  supabase: SupabaseClient,
  botId: string,
  query: string,
  matchCount = RAG_MATCH_COUNT,
  matchThreshold = RAG_MATCH_THRESHOLD,
): Promise<RetrievedChunk[]> {
  const [embedding] = await createEmbeddings([query]);
  if (!embedding) {
    return [];
  }

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: toVectorLiteral(embedding),
    match_bot_id: botId,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RetrievedChunk[];
}

export function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant documents were found in the knowledge base.";
  }

  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] (similarity ${chunk.similarity.toFixed(2)})\n${chunk.content}`,
    )
    .join("\n\n");
}
