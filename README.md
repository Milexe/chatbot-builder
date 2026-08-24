# Chatbot Builder

Turn company documents into a support chatbot: chat in the app, or embed a widget on your website.

## Features

- Upload knowledge (PDF, TXT, Markdown) and answer from your own docs
- In-app chat with citations from retrieved chunks
- Embeddable website widget
- Plan limits (bots, messages, documents, branding)

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Supabase — Auth, Postgres, Storage, pgvector
- OpenRouter — chat and embeddings
- Stripe — Checkout (test mode for development)

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Fill in Supabase, OpenRouter, and Stripe keys in `.env.local`. Apply the SQL migration in `supabase/migrations/` from the Supabase SQL editor (or via the Supabase CLI).

## Plans

| | Free | Pro | Business |
|---|---|---|---|
| Bots | 1 | 3 | 10 |
| Messages / month | 50 | 2 000 | 10 000 |
| Documents | 3 × 5 MB | 30 | 100 |
| Embed branding | included | removable | removable + allowed domains |

## Notes

- Prefer staying on the Supabase Free plan during development; exceeding quotas restricts the project rather than auto-charging.
- Product-side upload limits keep database and storage usage predictable.
- Free Supabase projects pause after about a week of inactivity — restore from the dashboard before demos.
