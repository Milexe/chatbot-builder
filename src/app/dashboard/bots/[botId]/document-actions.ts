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

async function uploadOneFile({
  supabase,
  userId,
  botId,
  file,
  maxBytes,
  maxFileMb,
  planName,
}: {
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"];
  userId: string;
  botId: string;
  file: File;
  maxBytes: number;
  maxFileMb: number;
  planName: string;
}): Promise<{ ok: true; documentId: string } | { ok: false; message: string }> {
  if (file.size === 0) {
    return { ok: false, message: `${file.name}: empty file.` };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `${file.name}: too large (max ${maxFileMb} MB on ${planName}).`,
    };
  }
  if (!isAllowedDocumentFile(file.name, file.type)) {
    return {
      ok: false,
      message: `${file.name}: only .txt / .md / .pdf supported.`,
    };
  }

  const documentId = randomUUID();
  const extension = getDocumentExtension(file.name) || ".txt";
  const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
  const storagePath = `${userId}/${botId}/${documentId}${extension}`;

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
      message: `${file.name}: upload failed (${uploadError.message}).`,
    };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    bot_id: botId,
    owner_id: userId,
    file_name: safeName,
    storage_path: storagePath,
    mime_type: file.type || "text/plain",
    byte_size: file.size,
    status: "pending",
  });

  if (insertError) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return { ok: false, message: `${file.name}: ${insertError.message}` };
  }

  await supabase
    .from("documents")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("owner_id", userId);

  return { ok: true, documentId };
}

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

  const used = count ?? 0;
  const remaining = plan.limits.documents - used;
  if (remaining <= 0) {
    return {
      ok: false,
      message: `Your ${plan.name} plan allows ${plan.limits.documents} documents.`,
    };
  }

  const rawFiles = formData.getAll("file");
  const files = rawFiles.filter((entry): entry is File => {
    return entry instanceof File && Boolean(entry.name);
  });

  if (files.length === 0) {
    return { ok: false, message: "Choose at least one TXT, Markdown, or PDF file." };
  }
  if (files.length > remaining) {
    return {
      ok: false,
      message: `You can upload ${remaining} more file${remaining === 1 ? "" : "s"} on ${plan.name} (${used}/${plan.limits.documents}).`,
    };
  }

  const maxBytes = plan.limits.maxFileMb * 1024 * 1024;
  const uploadedIds: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = await uploadOneFile({
      supabase,
      userId: user.id,
      botId,
      file,
      maxBytes,
      maxFileMb: plan.limits.maxFileMb,
      planName: plan.name,
    });
    if (result.ok) {
      uploadedIds.push(result.documentId);
    } else {
      errors.push(result.message);
    }
  }

  const path = `/dashboard/bots/${botId}`;
  const ownerId = user.id;

  if (uploadedIds.length === 0) {
    return { ok: false, message: errors.join(" ") || "Upload failed." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    for (const documentId of uploadedIds) {
      await indexDocument(supabase, documentId, ownerId);
    }
    revalidatePath(path);
    return {
      ok: errors.length === 0,
      message:
        errors.length === 0
          ? `Uploaded ${uploadedIds.length} file${uploadedIds.length === 1 ? "" : "s"}.`
          : `Uploaded ${uploadedIds.length}, with errors: ${errors.join(" ")}`,
    };
  }

  after(async () => {
    try {
      const admin = createServiceClient();
      for (const documentId of uploadedIds) {
        await indexDocument(admin, documentId, ownerId);
      }
    } finally {
      revalidatePath(path);
    }
  });

  revalidatePath(path);
  return {
    ok: errors.length === 0,
    message:
      errors.length === 0
        ? `Uploaded ${uploadedIds.length}. Indexing…`
        : `Uploaded ${uploadedIds.length}, with errors: ${errors.join(" ")}`,
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
