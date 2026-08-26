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

## Embed widget (shipped MVP)

| Topic | Decision |
| --- | --- |
| Integration | Script tag: `<script src="…/widget.js" data-bot-id="…">` |
| Shared logic | [`src/lib/bot-answer.ts`](../src/lib/bot-answer.ts) for dashboard + embed |
| Streaming | No (add later for app + widget together) |
| Owner quota | Same monthly plan pool as in-app chat |
| Visitor quota | **Per browser session** — `EMBED_SESSION_MESSAGE_LIMIT` (15) |
| Rate limit | Per IP + bot — `EMBED_RATE_LIMIT_*` (10 / 60s) |
| Allowed origins | Enforced when `bots.allowed_origins` is non-empty; empty or `*` = any site. Match uses `Origin`, else `Referer` (same-origin GET often omits Origin). One origin covers all paths on that host. |
| Branding | Shown unless plan has `removeBranding` |

API:

- `GET /api/embed/[botId]/config`
- `POST /api/embed/[botId]/chat` body `{ message, sessionId }`

Script: [`public/widget.js`](../public/widget.js). Copy snippet on the bot dashboard Embed card.

Origin matching uses the browser `Origin` header, with `Referer` as fallback. Spoofable outside browsers; still stops casual copy-paste embeds.

## Deferred

- PDF upload
- Stripe / real billing enforcement beyond local plan field
- Wildcard / subdomain origin patterns
- Chat streaming + optimistic user bubbles
- Citation chips in chat UI
- Unit/E2E tests
- UI polish / design pass
