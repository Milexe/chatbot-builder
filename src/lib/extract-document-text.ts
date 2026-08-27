import { getDocumentExtension } from "@/lib/documents";

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText } = await import("unpdf");
  const { text } = await extractText(bytes, { mergePages: true });
  return text.trim();
}

/**
 * Turn stored document bytes into plain text for chunking.
 * PDF: text layer only (no OCR). Empty / scanned PDFs throw.
 */
export async function extractDocumentText({
  bytes,
  fileName,
  mimeType,
}: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string | null;
}): Promise<string> {
  const extension = getDocumentExtension(fileName);
  const isPdf =
    extension === ".pdf" || mimeType === "application/pdf";

  if (isPdf) {
    const text = await extractPdfText(bytes);
    if (!text) {
      throw new Error(
        "No extractable text in this PDF (scanned or image-only files are not supported).",
      );
    }
    return text;
  }

  const text = new TextDecoder("utf-8").decode(bytes).trim();
  if (!text) {
    throw new Error("Document is empty.");
  }
  return text;
}
