const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 200;

/** Split plain text into overlapping windows for embedding. */
export function chunkText(
  content: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): string[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (chunkSize <= overlap) {
    throw new Error("chunkSize must be greater than overlap");
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const piece = normalized.slice(start, end).trim();
    if (piece) {
      chunks.push(piece);
    }
    if (end >= normalized.length) break;
    start = end - overlap;
  }

  return chunks;
}

/** Rough token estimate for storage metadata (not billed). */
export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
