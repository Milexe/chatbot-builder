export const DOCUMENTS_BUCKET = "documents";

export const ALLOWED_DOCUMENT_EXTENSIONS = [".txt", ".md", ".markdown"] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

export function getDocumentExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function isAllowedDocumentFile(fileName: string, mimeType: string): boolean {
  const extension = getDocumentExtension(fileName);
  const allowedExtension = (
    ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]
  ).includes(extension);

  if (!allowedExtension) return false;
  if (!mimeType || mimeType === "application/octet-stream") return true;
  return ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType);
}
