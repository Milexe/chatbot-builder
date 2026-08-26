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

/** Default RAG retrieval size (also used by in-app chat). */
export const RAG_MATCH_COUNT = 6;

/** Minimum cosine similarity for retrieved chunks. */
export const RAG_MATCH_THRESHOLD = 0.5;
