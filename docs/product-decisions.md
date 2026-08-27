# Product decisions (MVP)

Living document for product locks. **Numbers the app enforces live in code** — prefer editing [`src/lib/limits.ts`](../src/lib/limits.ts) and [`src/lib/pricing.ts`](../src/lib/pricing.ts), then update this file to match.

Pricing table amounts match Stripe test products (Pro $29 / Business $79 monthly).

**MVP status:** feature-complete for portfolio demo. See README Status section.

---

## Stack (locked)

- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Supabase Free: Auth, Postgres, Storage, pgvector
- OpenRouter: chat + embeddings
- Billing: **Stripe test** — Checkout + Customer Portal + webhooks (`/pricing` hub)
- Deploy: Vercel (+ GitHub Actions CI)

## Auth (locked)

- Email + password and Google OAuth
- Confirm email **OFF** for MVP (no custom SMTP on Free)

## Knowledge / indexing (shipped)

- TXT / MD / PDF (text layer only; no OCR for scanned PDFs)
- Upload via server action → Storage → background index (`after`)
- Status: `pending` → `processing` → `ready` | `failed`
- Embeddings: `OPENROUTER_EMBEDDING_MODEL` (default `openai/text-embedding-3-small`, 1536 dims)
- Chunking: ~1200 chars, ~200 overlap ([`src/lib/chunk-text.ts`](../src/lib/chunk-text.ts))
- PDF extract: [`unpdf`](https://github.com/unjs/unpdf) via [`src/lib/extract-document-text.ts`](../src/lib/extract-document-text.ts)

## In-app chat (shipped)

- RAG via `match_document_chunks` + OpenRouter chat model
- **Streaming** responses (app + embed) via shared OpenRouter SSE path
- Owner monthly message quota from plan (`profiles.messages_used_this_month`) — account-wide; clearing chats / deleting bots does not refund the counter
- Citation chunk ids stored on assistant messages; **UI citations not shipped**

## Embed widget (shipped MVP)

| Topic | Decision |
| --- | --- |
| Integration | Script tag: `<script src="…/widget.js" data-bot-id="…">` |
| Shared logic | [`src/lib/bot-answer.ts`](../src/lib/bot-answer.ts) for dashboard + embed |
| Streaming | Yes — shared OpenRouter stream for dashboard + embed |
| Owner quota | Same monthly plan pool as in-app chat |
| Visitor quota | **Per browser session** — `EMBED_SESSION_MESSAGE_LIMIT` (15) |
| Rate limit | Per IP + bot — `EMBED_RATE_LIMIT_*` (10 / 60s) |
| Allowed origins | Enforced when `bots.allowed_origins` is non-empty; empty or `*` = any site. Match uses `Origin`, else `Referer` (same-origin GET often omits Origin). One origin covers all paths on that host. |
| Branding | Shown unless plan has `removeBranding` |
| Custom colors | Flag `customColors` exists in `pricing.ts`; **not enforced** (any plan can set `primary_color`). Do not claim as a paid feature until gated. |

API:

- `GET /api/embed/[botId]/config`
- `POST /api/embed/[botId]/chat` body `{ message, sessionId }`

Script: [`public/widget.js`](../public/widget.js). Copy snippet on the bot dashboard Embed card.

Origin matching uses the browser `Origin` header, with `Referer` as fallback. Spoofable outside browsers; still stops casual copy-paste embeds.

## UI / landing (shipped)

- Landing with features, pricing, optional live demo widget
- Dashboard bots grid, create/edit dialog, pause/delete, knowledge + embed
- Design pass done (Space Grotesk, violet brand, chat chrome aligned)

---

## Billing (shipped — Stripe test)

- **Cadence:** monthly only (no annual)
- **Cancel:** at period end (`cancel_at_period_end`); paid `plan` until period ends, then webhook → `free`
- **Surfaces:**
  - Landing `#pricing` — marketing only
  - **`/pricing`** — signed-in hub (usage/limits, upgrade, manage billing)
- **Stripe:**
  - **Checkout** — Free → Pro/Business (creates Customer + Subscription)
  - **Subscription update** — Pro → Business (proration) when a sub already exists
  - **Customer Portal** — cards, cancel-at-period-end, invoices; downgrades
  - **Webhooks** — source of truth for `profiles.plan` / subscription fields (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`)
- Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`

---

## Post-MVP / nice-to-have

| Item | Notes |
| --- | --- |
| Enforce `customColors` | Free → default color only; Pro+ → picker (optional; not claimed in pricing copy) |
| Citation chips in chat UI | IDs already stored on assistant messages |
| Wildcard / subdomain origin patterns | Beyond exact origin match |
| Unit / E2E tests | CI today: lint + typecheck + build |
| Email confirmation + SMTP | Before a real public launch |
| PDF OCR | Scanned / image-only PDFs |

---

## Demo checklist (portfolio)

1. Push `master` and confirm Vercel deploy is green.
2. Set `NEXT_PUBLIC_DEMO_BOT_ID` on Vercel and redeploy.
3. Demo bot is **Live**, origins allow the Vercel host or `*`.
4. Record / present while **signed out** on the landing (demo widget hides for logged-in users).
5. Stripe **Test** mode for billing walkthrough; do not claim live payments.
