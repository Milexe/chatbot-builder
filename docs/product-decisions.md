# Product decisions (MVP)

Living document for product locks. **Numbers that the app enforces live in code** — prefer editing [`src/lib/limits.ts`](../src/lib/limits.ts) and [`src/lib/pricing.ts`](../src/lib/pricing.ts), then update this file to match.

Pricing table amounts are still placeholders until Stripe.

---

## Stack (locked)

- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Supabase Free: Auth, Postgres, Storage, pgvector
- OpenRouter: chat + embeddings
- Stripe test: later
- Deploy: Vercel Hobby later

## Auth (locked)

- Email + password and Google OAuth
- Confirm email **OFF** for MVP (no custom SMTP on Free)

## Knowledge / indexing (shipped)

- TXT / MD only (PDF later)
- Upload via server action → Storage → background index (`after`)
- Status: `pending` → `processing` → `ready` | `failed`
- Embeddings: `OPENROUTER_EMBEDDING_MODEL` (default `openai/text-embedding-3-small`, 1536 dims)
- Chunking: ~1200 chars, ~200 overlap ([`src/lib/chunk-text.ts`](../src/lib/chunk-text.ts))

## In-app chat (shipped)

- RAG via `match_document_chunks` + OpenRouter chat model
- Non-streaming responses for now
- Owner monthly message quota from plan (`profiles.messages_used_this_month`)
- Citation chunk ids stored on assistant messages; UI citations later

## Embed widget (next — decisions locked, not shipped yet)

| Topic | Decision |
| --- | --- |
| Integration | Script tag: `<script src="…/widget.js" data-bot-id="…">` (not iframe-first) |
| Shared logic | One server RAG helper for dashboard chat + embed |
| Streaming | No (add later for app + widget together) |
| Owner quota | Same monthly plan pool as in-app chat |
| Visitor quota | **Per browser session** (not calendar day) — see `EMBED_SESSION_MESSAGE_LIMIT` |
| Rate limit | Per IP + bot, short window — see `EMBED_RATE_LIMIT_*` |
| Allowed origins | Not enforced in first embed MVP |
| Branding | Free plan keeps Chatbot Builder branding (when widget ships) |

### Visitor session (MVP)

- Widget generates/stores a session id (e.g. `sessionStorage`)
- Cap **user messages** in that session per bot
- Over limit → friendly block in the widget (no OpenRouter call)
- Closing the tab starts a new session (acceptable for MVP)

### Rate limit (MVP)

- Protects public endpoints from burst abuse
- Storage: Postgres (or equivalent) — not Redis for MVP
- Over limit → HTTP 429 / widget message

Tune values in [`src/lib/limits.ts`](../src/lib/limits.ts).

## Deferred

- PDF upload
- Stripe / real billing enforcement beyond local plan field
- Embed allowed_origins UI + enforcement
- Chat streaming + optimistic user bubbles
- Citation chips in chat UI
- CI: `lint` + `tsc` (+ tests) on deploy
- Unit/E2E tests
