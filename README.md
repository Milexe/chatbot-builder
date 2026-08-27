# Chatbot Builder

Turn company documents into a support chatbot: chat in the app, or embed a widget on your website.

## Features

- Upload knowledge (TXT / Markdown) and answer from your own docs
- In-app chat and embeddable website widget (shared RAG path)
- Plan limits (bots, messages, documents, branding)
- Stripe billing on `/pricing` (Checkout + Customer Portal, test mode)

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Supabase — Auth, Postgres, Storage, pgvector
- OpenRouter — chat and embeddings
- Stripe — Checkout, Customer Portal, webhooks

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Fill in Supabase, OpenRouter, and Stripe keys in `.env` or `.env.local`.

### Database (Supabase CLI)

Schema lives in `supabase/migrations/`. Remote project ref: `cagbrjmlcwfhlknuegwu`.

One-time link (needs [access token](https://supabase.com/dashboard/account/tokens) + DB password from project settings):

```bash
npm run db:login
npm run db:link
```

Day-to-day:

```bash
npm run db:migration:new -- add_something   # create empty migration file
# edit the SQL, then:
npm run db:push:dry                          # preview
npm run db:push                              # apply pending migrations to remote
npm run db:migration:list                    # local files vs remote history
npm run db:types                             # regenerate src/types/supabase.ts
```

Prefer CLI/`db push` (or ask the agent via Supabase MCP) over pasting into the SQL Editor, so git and the cloud stay in sync.

Docker/`supabase start` is optional for fully local Postgres; remote Free project is enough for MVP.

### Auth (MVP)

- Authentication → URL Configuration  
  - Site URL: `http://localhost:3000`  
  - Redirect URLs: `http://localhost:3000/auth/callback`
- Authentication → Providers → **Email**: enabled, **Confirm email = OFF** (MVP: signup creates a session immediately; custom email templates need SMTP / paid plan)
- Authentication → Providers → **Google** (optional): Client ID/Secret from Google Cloud. Redirect URI:

  `https://<project-ref>.supabase.co/auth/v1/callback`

Supported sign-in: email + password, Google OAuth.

## Deploy (Vercel)

1. Import the GitHub repo in [Vercel](https://vercel.com/new) (Hobby is fine for MVP).
2. Set environment variables (Production + Preview) from `.env.example`:
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL, e.g. `https://chatbot-builder.vercel.app`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`
   - optional: `OPENROUTER_CHAT_MODEL`, `OPENROUTER_EMBEDDING_MODEL`
   - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`
   - optional landing demo: `NEXT_PUBLIC_DEMO_BOT_ID` (public/live bot UUID). Without it the corner chat does not mount on production. Redeploy after adding — `NEXT_PUBLIC_*` is baked at build time.
   - do **not** set `NEXT_PUBLIC_DEMO_WIDGET_ORIGIN` to `localhost` on Production (leave unset so the Vercel host serves `/widget.js`)
3. Deploy. Root directory = repo root; framework = Next.js (auto-detected).
4. Demo bot checklist: bot is **Live** (not paused), allowlist includes your Vercel origin or `*`, and you are **signed out** on the landing (logged-in users hide the demo widget).
5. Billing: create Pro ($29/mo) and Business ($79/mo) products in Stripe **Test mode**, paste Price IDs into env, and point a webhook at `https://<your-app>/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Locally: `stripe listen --forward-to localhost:3000/api/billing/webhook`.
6. In Supabase → Authentication → URL Configuration:
   - **Site URL**: same as `NEXT_PUBLIC_APP_URL` (no trailing slash)
   - **Redirect URLs**: add `https://<your-app>.vercel.app/auth/callback` (and keep `http://localhost:3000/auth/callback` for local)
   - Google OAuth `redirectTo` is built from the request host first, then `NEXT_PUBLIC_APP_URL`
7. Google OAuth (if used): authorized redirect stays  
   `https://cagbrjmlcwfhlknuegwu.supabase.co/auth/v1/callback`  
   (Google Cloud console does not need the Vercel domain for Supabase-hosted OAuth.)

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `master`:

- `npm run lint`
- `npm run typecheck`
- `npm run build` (with placeholder public env)

Vercel handles production deploys from `master` once the project is linked.

## Plans

| | Free | Pro | Business |
|---|---|---|---|
| Bots | 1 | 3 | 10 |
| Messages / month | 50 | 2 000 | 10 000 |
| Documents | 3 × 5 MB | 30 | 100 |
| Embed branding | included | removable | removable |
| Embed domain allowlist | yes | yes | yes |

## Notes

- Prefer staying on the Supabase Free plan during development; exceeding quotas restricts the project rather than auto-charging.
- Product-side upload limits keep database and storage usage predictable.
- Free Supabase projects pause after about a week of inactivity — restore from the dashboard before demos.
- **MVP known limitation:** email confirmation is disabled (no custom SMTP on Free). Re-enable with custom SMTP before a real launch.
- Product locks and embed quota decisions: [`docs/product-decisions.md`](docs/product-decisions.md). Tunable non-plan numbers: [`src/lib/limits.ts`](src/lib/limits.ts).
