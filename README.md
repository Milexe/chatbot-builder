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

Fill in Supabase, OpenRouter, and Stripe keys in `.env` or `.env.local`. Apply the SQL migration in `supabase/migrations/` from the Supabase SQL editor.

For Auth, set in Supabase **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

Enable **Email** (password) under Auth → Providers. For local development you can turn off **Confirm email** under Auth → Providers → Email.

For **Google** OAuth: Auth → Providers → Google → enable, paste Client ID/Secret from Google Cloud Console. Authorized redirect URI in Google must be:

`https://<project-ref>.supabase.co/auth/v1/callback`

(Find `project-ref` in Project Settings → General.)

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
