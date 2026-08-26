"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deleteDocument,
  reindexDocument,
  uploadDocument,
  type DocumentActionState,
} from "@/app/dashboard/bots/[botId]/document-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DocumentRow, DocumentStatus } from "@/types/database";

const initialState: DocumentActionState = { ok: false, message: "" };

function formatBytes(size: number | null): string {
  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function canRetry(status: DocumentStatus): boolean {
  return status === "pending" || status === "failed";
}

function isBusyStatus(status: DocumentStatus): boolean {
  return status === "pending" || status === "processing";
}

export function DocumentsPanel({
  botId,
  documents,
  documentsUsed,
  documentsLimit,
  maxFileMb,
  canUpload,
}: {
  botId: string;
  documents: DocumentRow[];
  documentsUsed: number;
  documentsLimit: number;
  maxFileMb: number;
  canUpload: boolean;
}) {
  const router = useRouter();
  const boundUpload = uploadDocument.bind(null, botId);
  const [state, formAction, pending] = useActionState(
    boundUpload,
    initialState,
  );

  const hasBusyDocs = documents.some((doc) => isBusyStatus(doc.status));

  useEffect(() => {
    if (!hasBusyDocs) return;
    const timer = setInterval(() => {
      router.refresh();
    }, 2000);
    return () => clearInterval(timer);
  }, [hasBusyDocs, router]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
        <p className="text-sm text-muted-foreground">
          {documentsUsed}/{documentsLimit} files on your plan · TXT or Markdown ·
          max {maxFileMb} MB · indexing runs after upload
        </p>
      </div>

      {canUpload ? (
        <form
          action={formAction}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="grid flex-1 gap-2">
            <Label htmlFor="file">Upload file</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              required
              disabled={pending}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Document limit reached for this plan.
        </p>
      )}

      {state.message ? (
        <p
          className={
            state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <ul className="divide-y rounded-lg border">
        {documents.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            No documents yet. Upload a FAQ or policy as .txt or .md.
          </li>
        ) : (
          documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(doc.byte_size)}
                  {doc.status === "failed" && doc.error_message
                    ? ` · ${doc.error_message}`
                    : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{doc.status}</Badge>
                {canRetry(doc.status) ? (
                  <form action={reindexDocument.bind(null, botId, doc.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Retry
                    </Button>
                  </form>
                ) : null}
                <form action={deleteDocument.bind(null, botId, doc.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
