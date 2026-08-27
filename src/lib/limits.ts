/**
 * Tunable product limits that are not per-plan.
 * Plan gates (bots, docs, monthly messages) live in `pricing.ts`.
 * Narrative / rationale: `docs/product-decisions.md`.
 */

/** Max user messages a website visitor may send per widget session (per bot). */
export const EMBED_SESSION_MESSAGE_LIMIT = 15;

/** Sliding window for public embed API abuse protection. */
export const EMBED_RATE_LIMIT_WINDOW_MS = 60_000;

/** Max chat requests per IP per bot inside the rate-limit window. */
export const EMBED_RATE_LIMIT_MAX_REQUESTS = 10;

/** Max characters for a single user chat message (app + embed). */
export const CHAT_MESSAGE_MAX_CHARS = 4000;

/** Bot settings field caps (create/edit form + server parse). */
export const BOT_NAME_MAX_CHARS = 80;
export const BOT_WELCOME_MAX_CHARS = 500;
export const BOT_SYSTEM_PROMPT_MAX_CHARS = 4000;

/** Max entries in bots.allowed_origins. */
export const BOT_ALLOWED_ORIGINS_MAX = 20;

/** Default RAG retrieval size (also used by in-app chat). */
export const RAG_MATCH_COUNT = 6;

/** Minimum cosine similarity for retrieved chunks. */
export const RAG_MATCH_THRESHOLD = 0.35;
