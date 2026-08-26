"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import {
  DOCUMENTS_BUCKET,
  getDocumentExtension,
  isAllowedDocumentFile,
} from "@/lib/documents";
import { indexDocument } from "@/lib/indexing";
import { createServiceClient } from "@/lib/supabase/admin";

export type DocumentActionState = {
  ok: boolean;
  message: string;
};

export async function uploadDocument(
  botId: string,
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const { supabase, user } = await requireUser();
  const { plan } = await requireProfilePlan(supabase, user.id);

  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", botId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!bot) {
    return { ok: false, message: "Bot not found." };
  }

  const { count, error: countError } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) {
    return { ok: false, message: countError.message };
  }
  if ((count ?? 0) >= plan.limits.documents) {
    return {
      ok: false,
      message: `Your ${plan.name} plan allows ${plan.limits.documents} documents.`,
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a TXT or Markdown file." };
  }

  const maxBytes = plan.limits.maxFileMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `File is too large. Max ${plan.limits.maxFileMb} MB on ${plan.name}.`,
    };
  }

  if (!isAllowedDocumentFile(file.name, file.type)) {
    return {
      ok: false,
      message: "Only .txt, .md, and .markdown files are supported for now.",
    };
  }

  const documentId = randomUUID();
  const extension = getDocumentExtension(file.name) || ".txt";
  const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
  const storagePath = `${user.id}/${botId}/${documentId}${extension}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || "text/plain",
      upsert: false,
    });

  if (uploadError) {
    return {
      ok: false,
      message: `Upload failed: ${uploadError.message}. Ensure the documents Storage bucket exists.`,
    };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    bot_id: botId,
    owner_id: user.id,
    file_name: safeName,
    storage_path: storagePath,
    mime_type: file.type || "text/plain",
    byte_size: file.size,
    status: "pending",
  });

  if (insertError) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return { ok: false, message: insertError.message };
  }

  // Mark processing before the response so the list does not flash as pending.
  await supabase
    .from("documents")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("owner_id", user.id);

  const ownerId = user.id;
  const path = `/dashboard/bots/${botId}`;

  // Prefer background indexing so the upload form is not stuck on pending for ~8s+.
  // Fall back to sync if the service role key is missing (local misconfig).
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const indexed = await indexDocument(supabase, documentId, ownerId);
    revalidatePath(path);
    if (!indexed.ok) {
      return {
        ok: false,
        message: `Uploaded, but indexing failed: ${indexed.message}`,
      };
    }
    return {
      ok: true,
      message: `Uploaded and indexed. ${indexed.message}`,
    };
  }

  after(async () => {
    try {
      const admin = createServiceClient();
      await indexDocument(admin, documentId, ownerId);
    } finally {
      revalidatePath(path);
    }
  });

  revalidatePath(path);
  return {
    ok: true,
    message: "Uploaded. Indexing in the background…",
  };
}

export async function reindexDocument(botId: string, documentId: string) {
  const { supabase, user } = await requireUser();

  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("bot_id", botId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!doc) {
    return;
  }

  await supabase
    .from("documents")
    .update({
      status: "processing",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("owner_id", user.id);

  const ownerId = user.id;
  const path = `/dashboard/bots/${botId}`;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await indexDocument(supabase, documentId, ownerId);
    revalidatePath(path);
    return;
  }

  after(async () => {
    try {
      const admin = createServiceClient();
      await indexDocument(admin, documentId, ownerId);
    } finally {
      revalidatePath(path);
    }
  });

  revalidatePath(path);
}

export async function deleteDocument(botId: string, documentId: string) {
  const { supabase, user } = await requireUser();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("bot_id", botId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!doc) {
    return;
  }

  if (doc.storage_path) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
  }

  await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("owner_id", user.id);

  revalidatePath(`/dashboard/bots/${botId}`);
}
