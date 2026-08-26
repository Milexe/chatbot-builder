const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";

function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }
  return key;
}

function getEmbeddingModel(): string {
  return process.env.OPENROUTER_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

/** Create embedding vectors for one or more text inputs (same model for all). */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Chatbot Builder",
    },
    body: JSON.stringify({
      model: getEmbeddingModel(),
      input: texts,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenRouter embeddings failed (${response.status}): ${body.slice(0, 400)}`,
    );
  }

  const json = (await response.json()) as {
    data?: { embedding: number[]; index: number }[];
  };

  if (!json.data || json.data.length !== texts.length) {
    throw new Error("OpenRouter returned an unexpected embeddings payload.");
  }

  return [...json.data]
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
}
