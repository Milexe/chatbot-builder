import type { SupabaseClient } from "@supabase/supabase-js";

import { chunkText, estimateTokenCount } from "@/lib/chunk-text";
import { DOCUMENTS_BUCKET } from "@/lib/documents";
import { createEmbeddings } from "@/lib/openrouter";

const EMBEDDING_BATCH_SIZE = 32;

export type IndexDocumentResult = {
  ok: boolean;
  message: string;
  status: "ready" | "failed" | "processing" | "pending";
};

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

async function setDocumentStatus(
  supabase: SupabaseClient,
  documentId: string,
  ownerId: string,
  status: "processing" | "ready" | "failed" | "pending",
  errorMessage: string | null = null,
) {
  await supabase
    .from("documents")
    .update({
      status,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("owner_id", ownerId);
}

/**
 * Download a stored TXT/MD document, chunk + embed, write document_chunks.
 * Safe to retry: replaces existing chunks for the document.
 */
export async function indexDocument(
  supabase: SupabaseClient,
  documentId: string,
  ownerId: string,
): Promise<IndexDocumentResult> {
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, bot_id, owner_id, storage_path, file_name, status")
    .eq("id", documentId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (docError) {
    return { ok: false, message: docError.message, status: "failed" };
  }
  if (!doc) {
    return { ok: false, message: "Document not found.", status: "failed" };
  }
  if (!doc.storage_path) {
    await setDocumentStatus(
      supabase,
      documentId,
      ownerId,
      "failed",
      "Missing storage path.",
    );
    return {
      ok: false,
      message: "Document has no storage path.",
      status: "failed",
    };
  }

  await setDocumentStatus(supabase, documentId, ownerId, "processing", null);

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(doc.storage_path);

    if (downloadError || !file) {
      throw new Error(
        downloadError?.message || "Could not download document from Storage.",
      );
    }

    const text = (await file.text()).trim();
    if (!text) {
      throw new Error("Document is empty.");
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error("No indexable text after chunking.");
    }

    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const vectors = await createEmbeddings(batch);
      embeddings.push(...vectors);
    }

    if (embeddings.length !== chunks.length) {
      throw new Error("Embedding count did not match chunk count.");
    }

    const { error: deleteError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const rows = chunks.map((content, chunkIndex) => ({
      document_id: documentId,
      bot_id: doc.bot_id,
      chunk_index: chunkIndex,
      content,
      embedding: toVectorLiteral(embeddings[chunkIndex]),
      token_count: estimateTokenCount(content),
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(rows);

    if (insertError) {
      throw new Error(insertError.message);
    }

    await setDocumentStatus(supabase, documentId, ownerId, "ready", null);
    return {
      ok: true,
      message: `Indexed ${chunks.length} chunk${chunks.length === 1 ? "" : "s"}.`,
      status: "ready",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Indexing failed unexpectedly.";
    await setDocumentStatus(supabase, documentId, ownerId, "failed", message);
    return { ok: false, message, status: "failed" };
  }
}
