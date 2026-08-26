"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { RotateCcwIcon, Trash2Icon } from "lucide-react";

import {
  deleteDocument,
  reindexDocument,
  uploadDocument,
  type DocumentActionState,
} from "@/app/dashboard/bots/[botId]/document-actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DocumentRow, DocumentStatus } from "@/types/database";

const initialState: DocumentActionState = { ok: false, message: "" };

type DocumentListItem = Pick<
  DocumentRow,
  "id" | "file_name" | "byte_size" | "status" | "error_message"
>;

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
  documents: DocumentListItem[];
  documentsUsed: number;
  documentsLimit: number;
  maxFileMb: number;
  canUpload: boolean;
}) {
  const router = useRouter();
  const remaining = Math.max(0, documentsLimit - documentsUsed);
  const boundUpload = uploadDocument.bind(null, botId);
  const [state, formAction, pending] = useActionState(
    boundUpload,
    initialState,
  );
  const [clientError, setClientError] = useState("");
  const [isDeleting, startDelete] = useTransition();
  const [fileNames, setFileNames] = useState<string[]>([]);

  const hasBusyDocs = documents.some((doc) => isBusyStatus(doc.status));

  useEffect(() => {
    if (!hasBusyDocs) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      router.refresh();
    }, 2000);
    return () => clearInterval(timer);
  }, [hasBusyDocs, router]);

  const fileSummary =
    fileNames.length === 0
      ? "No file selected"
      : fileNames.length === 1
        ? fileNames[0]
        : `${fileNames.length} files selected`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {documentsUsed}/{documentsLimit} · .txt / .md · max {maxFileMb} MB
      </p>

      {canUpload ? (
        <form
          action={formAction}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            setClientError("");
            const input = event.currentTarget.elements.namedItem(
              "file",
            ) as HTMLInputElement | null;
            const count = input?.files?.length ?? 0;
            if (count > remaining) {
              event.preventDefault();
              setClientError(
                `Only ${remaining} more file${remaining === 1 ? "" : "s"} allowed.`,
              );
            }
          }}
        >
          <div className="grid flex-1 gap-2">
            <Label htmlFor="file">Upload</Label>
            <label
              htmlFor="file"
              className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg border border-input bg-transparent px-2.5 text-sm font-sans transition-colors has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            >
              <span className="shrink-0 font-medium text-foreground">
                Choose files
              </span>
              <span className="min-w-0 truncate text-muted-foreground">
                {fileSummary}
              </span>
              <input
                id="file"
                name="file"
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                multiple
                required
                disabled={pending || remaining <= 0}
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  setFileNames(files.map((file) => file.name));
                }}
              />
            </label>
          </div>
          <Button type="submit" disabled={pending || remaining <= 0}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Document limit reached.</p>
      )}

      {clientError || state.message ? (
        <p
          className={
            clientError || !state.ok
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
          role="status"
        >
          {clientError || state.message}
        </p>
      ) : null}

      <ul className="divide-y rounded-lg border">
        {documents.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            No documents yet.
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
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary">{doc.status}</Badge>
                {canRetry(doc.status) ? (
                  <form action={reindexDocument.bind(null, botId, doc.id)}>
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Retry"
                    >
                      <RotateCcwIcon />
                    </Button>
                  </form>
                ) : null}
                <ConfirmDeleteButton
                  title="Delete document?"
                  description={`Remove “${doc.file_name}”?`}
                  pending={isDeleting}
                  onConfirm={() =>
                    new Promise<void>((resolve) => {
                      startDelete(async () => {
                        await deleteDocument(botId, doc.id);
                        router.refresh();
                        resolve();
                      });
                    })
                  }
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Delete"
                    >
                      <Trash2Icon />
                    </Button>
                  }
                />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
