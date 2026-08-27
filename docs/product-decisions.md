# Product decisions (MVP)

Living document for product locks. **Numbers that the app enforces live in code** — prefer editing [`src/lib/limits.ts`](../src/lib/limits.ts) and [`src/lib/pricing.ts`](../src/lib/pricing.ts), then update this file to match.

Pricing table amounts match Stripe test products (Pro $29 / Business $79 monthly).

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

- TXT / MD only (**PDF** → MVP finish backlog)
- Upload via server action → Storage → background index (`after`)
- Status: `pending` → `processing` → `ready` | `failed`
- Embeddings: `OPENROUTER_EMBEDDING_MODEL` (default `openai/text-embedding-3-small`, 1536 dims)
- Chunking: ~1200 chars, ~200 overlap ([`src/lib/chunk-text.ts`](../src/lib/chunk-text.ts))

## In-app chat (shipped)

- RAG via `match_document_chunks` + OpenRouter chat model
- Non-streaming responses for now (**streaming** → MVP finish backlog, app + widget together)
- Owner monthly message quota from plan (`profiles.messages_used_this_month`)
- Citation chunk ids stored on assistant messages; UI citations later

## Embed widget (shipped MVP)

| Topic | Decision |
| --- | --- |
| Integration | Script tag: `<script src="…/widget.js" data-bot-id="…">` |
| Shared logic | [`src/lib/bot-answer.ts`](../src/lib/bot-answer.ts) for dashboard + embed |
| Streaming | No yet (same backlog item as in-app) |
| Owner quota | Same monthly plan pool as in-app chat |
| Visitor quota | **Per browser session** — `EMBED_SESSION_MESSAGE_LIMIT` (15) |
| Rate limit | Per IP + bot — `EMBED_RATE_LIMIT_*` (10 / 60s) |
| Allowed origins | Enforced when `bots.allowed_origins` is non-empty; empty or `*` = any site. Match uses `Origin`, else `Referer` (same-origin GET often omits Origin). One origin covers all paths on that host. |
| Branding | Shown unless plan has `removeBranding` |
| Custom colors | Plan flag `customColors` exists; **not enforced yet** (Free can still set `primary_color`) |

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

## MVP finish backlog

| # | Item | Why it belongs |
| --- | --- | --- |
| 1 | **README truth-up** | Drop/claim only what ships (no PDF/citations until real) |
| 2 | **Enforce `customColors`** | Free → default color only; Pro+ → picker + persist; matches pricing copy |
| 3 | **Chat streaming** | Embed + in-app via shared OpenRouter stream; better demo feel |
| 4 | **PDF upload + extract** | Marketing promise; TXT/MD already prove RAG |

### Acceptance sketches

- **Billing (Stripe):** `/pricing` Upgrade opens Checkout (or prorates existing sub); Portal schedules cancel-at-period-end; webhook keeps `profiles.plan` in sync; deleted sub → Free.
- **README:** Features list matches code; no “PDF” / “citations in UI” until shipped.
- **Custom colors:** Server rejects non-default `primary_color` on Free; UI disables or hides picker.
- **Streaming:** Tokens appear in widget (and app chat) without waiting for full JSON; quotas still applied; assistant row saved after stream completes.
- **PDF:** `.pdf` accepted, text extracted, same indexing pipeline as TXT/MD.

---

## Later (post-MVP / nice-to-have)

- Wildcard / subdomain origin patterns
- Citation chips in chat UI
- Unit / E2E tests
- Re-enable email confirmation + SMTP before a real public launch
