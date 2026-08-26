const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";
const DEFAULT_CHAT_MODEL = "openai/gpt-4o-mini";

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

function getChatModel(): string {
  return process.env.OPENROUTER_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}

function openRouterHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Chatbot Builder",
  };
}

/** Create embedding vectors for one or more text inputs (same model for all). */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: "POST",
    headers: openRouterHeaders(),
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

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Non-streaming chat completion via OpenRouter. */
export async function createChatCompletion(
  messages: ChatMessage[],
): Promise<string> {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: getChatModel(),
      messages,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenRouter chat failed (${response.status}): ${body.slice(0, 400)}`,
    );
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenRouter returned an empty chat response.");
  }

  return content;
}
