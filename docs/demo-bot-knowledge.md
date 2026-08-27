# Chatbot Builder — product knowledge base

This document describes **Chatbot Builder**: a web app that turns company documents into a support chatbot. Use it as the knowledge source for the live demo bot on the marketing landing page.

If a visitor asks something that is not covered here, stay friendly: admit you do not have that in the product docs, offer a short helpful nudge (try another question about features, pricing, embed, or PDFs — or sign up to explore the dashboard), and never invent product claims.

---

## What is Chatbot Builder?

Chatbot Builder is a SaaS-style product (portfolio MVP) that helps teams answer the same customer questions every day without building a custom AI stack from scratch.

In short:

1. You create a chatbot in the dashboard.
2. You upload knowledge documents (TXT, Markdown, or PDF).
3. The app indexes those documents (chunk + embed) so answers come from your content.
4. You test the bot in the in-app chat preview.
5. You embed a widget on your website with one script tag.

The product slogan on the landing page is: **“Your docs become answers on the website.”**

Chatbot Builder is designed for service businesses, support teams, and founders who want a document-grounded assistant on their site — not a general unrestricted ChatGPT clone.

---

## Who is it for?

- Small businesses that repeat the same FAQ answers in chat or email.
- Teams that already have help docs, policies, or onboarding guides in TXT, Markdown, or PDF.
- Portfolio / demo audiences exploring a full-stack RAG + billing product.

It is **not** meant for:

- Training a custom model on private proprietary weights.
- OCR-heavy scanned paperwork (scanned PDFs without a text layer are not supported).
- Enterprise SSO, audit logs, or multi-seat workspaces (not in this MVP).

---

## Core product loop (how it works)

### Step 1 — Sign up and create a bot

- Sign in with **email + password** or **Google OAuth**.
- Open the dashboard and create a bot (name, welcome message, system prompt, primary color, allowed embed origins).
- Each bot can be **Live** (public embed works) or **Paused** (embed is disabled / hidden).

### Step 2 — Upload knowledge

- On the bot’s **Knowledge** card, upload files.
- Accepted formats: **`.txt`**, **`.md` / `.markdown`**, **`.pdf`**.
- Max size per file: **5 MB** (all plans).
- Documents are stored, then indexed in the background.
- Status flow: `pending` → `processing` → `ready` or `failed`.
- You can delete documents or retry failed ones.

### Step 3 — Chat in the app

- Use the dashboard **Chat** preview to ask questions against the bot’s knowledge.
- Answers are **streamed** token by token.
- The bot is instructed to answer **from the uploaded context**. If the answer is not in the knowledge base, it should say so politely and suggest a next step — without inventing facts.

### Step 4 — Embed on a website

- Copy the embed snippet from the bot’s **Embed** card.
- Typical integration:

```html
<script
  src="https://YOUR_APP_HOST/widget.js"
  data-bot-id="YOUR_BOT_UUID"
  async
></script>
```

- The widget loads bot config, shows a floating chat launcher, and streams answers.
- On Free plan, the widget shows **“Powered by Chatbot Builder”** branding.
- On Pro and Business, embed branding can be removed.

---

## Features (what ships today)

### Knowledge and RAG

- Upload **TXT / Markdown / PDF**.
- PDF support extracts the **text layer only** (no OCR). Image-only or scanned PDFs fail with a clear error.
- Text is split into overlapping chunks (about **1200 characters** with about **200 characters** overlap).
- Embeddings are created via OpenRouter; vectors live in Postgres with **pgvector**.
- At question time, the app retrieves the most relevant chunks and builds a grounded prompt for the chat model.

### Chat

- In-app streaming chat for owners.
- Embed widget streaming chat for website visitors.
- Shared answer pipeline for dashboard and embed (same retrieval + model path).
- Conversation history in the app; visitors can reset / use a local session in the widget.

### Bots and dashboard

- Create, edit, pause/resume, and delete bots.
- Per-bot document list with status badges.
- Usage summary on the dashboard (bots / messages / docs against plan limits).
- Bot cards show per-bot message and document counts for the current period (saved messages), while the header message counter is the **account billing quota**.

### Billing and plans

- Free, Pro ($29/mo), and Business ($79/mo) — **monthly** billing.
- Signed-in billing hub at **`/pricing`**: see usage, upgrade, manage billing.
- Stripe **Checkout** for Free → paid.
- Stripe **Customer Portal** for cards, invoices, and cancel-at-period-end.
- Webhooks keep the account plan in sync.
- This MVP uses Stripe **test mode** for portfolio / demo purposes (no claim of live production payments unless you enable live Stripe keys yourself).

### Landing and demo

- Marketing landing with pricing and a three-step explanation.
- Optional **live demo widget** in the corner for signed-out visitors (when a demo bot ID is configured).
- If you are signed in, the landing demo widget is typically hidden so it does not collide with your account session UX.

---

## Pricing plans (exact limits)

Numbers below are what the product enforces.

### Free — $0 / month

- **1** chatbot
- **100** messages / month (account-wide owner quota)
- **Up to 3** documents, **5 MB** each
- In-app chat + embed widget
- Chatbot Builder branding on the embed
- Domain allowlist for embeds is available

### Pro — $29 / month

- **3** chatbots
- **2,000** messages / month
- **Up to 30** documents, **5 MB** each
- No Chatbot Builder branding on the embed
- Domain allowlist for embeds

### Business — $79 / month

- **10** chatbots
- **10,000** messages / month
- **Up to 100** documents, **5 MB** each
- No Chatbot Builder branding on the embed
- Domain allowlist for embeds

### How message quotas work

- The monthly **Messages** counter is **account-wide** for the bot owner (plan pool shared across bots).
- Dashboard preview chats and embed chats both consume the owner’s monthly message quota.
- Clearing a conversation or deleting a bot **does not refund** used messages. The header counter can be higher than the sum of per-bot saved message counts if chats were reset or bots deleted.
- When the monthly limit is reached, new user messages are blocked until the period resets (UTC month) or the plan is upgraded.

### Live bot caps

- Plans also limit how many bots can be **Live** at once (aligned with the bots limit).
- If you downgrade or exceed the live cap, excess bots may be paused automatically; you can resume up to the plan’s live capacity.

---

## Embed widget details

### Integration

- One script tag with `data-bot-id`.
- The script attaches a floating launcher and chat panel (Shadow DOM) so it does not fight host-page CSS as much.
- Visitors send messages; answers stream into the panel.

### Security and limits for visitors

- **Allowed origins:** if the bot has an allowlist, the embed only works from those origins. Empty allowlist or `*` means any site (useful for demos; tighten for production).
- **Per-session visitor limit:** about **15** user messages per browser session per bot (separate from the owner’s monthly plan quota, but owner quota still applies to answering).
- **Rate limit:** about **10** requests per IP per bot per **60 seconds** to reduce abuse.

### Branding

- Free: shows powered-by branding.
- Pro / Business: branding can be removed.

### Bot must be Live

- Paused bots do not serve the public widget (config fails / widget hides).

---

## Document formats and indexing

### Supported

| Format | Notes |
| --- | --- |
| `.txt` | Plain text |
| `.md` / `.markdown` | Markdown treated as text |
| `.pdf` | Text layer extracted; same indexing pipeline as text |

### Not supported (MVP)

- Scanned PDFs / image-only PDFs (no OCR)
- Word `.docx`, spreadsheets, HTML archives, images as knowledge
- Files larger than **5 MB**

### Indexing outcomes

- **ready** — chunks embedded; chat can retrieve them
- **failed** — see the error on the document row (empty PDF text, download issues, embedding failures, etc.)
- You can delete and re-upload, or retry when the UI offers it

---

## Technology stack (for curious visitors)

Chatbot Builder is built with a modern full-stack web stack:

- **Next.js** (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Supabase** — Auth, Postgres, Storage, pgvector
- **OpenRouter** — chat model + embeddings
- **Stripe** — subscriptions (test mode in this MVP)
- **Vercel** — hosting; **GitHub Actions** — CI (lint, typecheck, build)

This is useful if someone asks “what is it built with?” or “is this a real product stack?”

---

## Account and authentication

- Email + password signup/login
- Google OAuth (when configured)
- For this MVP, **email confirmation is off** (no custom SMTP on the free Supabase tier). Sessions can start immediately after signup.
- After login, users land in the dashboard to manage bots, knowledge, chat, embed, and billing.

---

## Billing FAQ

**How do I upgrade?**  
Sign in, open **/pricing**, choose Pro or Business. New paid subscriptions go through Stripe Checkout. If you already have a subscription, upgrades can prorate.

**How do I cancel?**  
Use **Manage billing** (Stripe Customer Portal). Cancellation is typically **at period end** — you keep paid plan benefits until the period ends, then return to Free.

**Is billing real money in this demo?**  
The portfolio MVP is wired for **Stripe test mode**. Use test cards in Stripe test mode. Do not assume live charges unless live Stripe keys are configured.

**Where is pricing on the marketing site?**  
Landing page section **#pricing**, plus the signed-in **/pricing** hub for upgrades and usage.

---

## Honest limitations (say these clearly if asked)

1. **PDF = text layer only.** Scanned documents need a text PDF or a TXT/MD export first.
2. **No citation chips in the UI yet.** The system retrieves document chunks internally; users do not see source chips in chat today.
3. **Custom brand colors** can be set on bots; paid-only color gating is not strictly enforced in this MVP.
4. **No OCR, no DOCX, no image knowledge.**
5. **Email verification** is disabled for MVP convenience.
6. **Not a general web-search assistant.** Answers should come from uploaded knowledge.
7. Embed origin allowlisting stops casual copy-paste misuse; it is not a cryptographic security boundary (browser Origin can be spoofed outside real browsers).

---

## Suggested answers to common demo questions

### “What does this product do?”

Chatbot Builder turns your documents into a website chatbot. Upload TXT, Markdown, or PDF knowledge, test answers in the dashboard, then embed a streaming chat widget with one script tag. Answers are grounded in your docs via retrieval-augmented generation (RAG).

### “How is this different from ChatGPT?”

ChatGPT is a general model. Chatbot Builder is a product around **your documents**: upload, index, quota plans, dashboard, and an embeddable widget meant for customer-facing FAQs on your site. The assistant is prompted to answer from your knowledge base, not from the open web.

### “How do I put it on my website?”

Create a Live bot, upload knowledge, copy the embed script from the Embed card, paste it into your site, and make sure your site origin is allowed (or use `*` while testing). Visitors will see the floating chat button.

### “What file types can I upload?”

TXT, Markdown, and PDF (with extractable text), up to 5 MB each. Document counts depend on your plan (3 / 30 / 100).

### “Does streaming work?”

Yes. Both the in-app preview and the website widget stream assistant replies as tokens arrive.

### “What are the plans?”

Free ($0): 1 bot, 100 messages/month, 3 documents.  
Pro ($29): 3 bots, 2,000 messages/month, 30 documents, no embed branding.  
Business ($79): 10 bots, 10,000 messages/month, 100 documents, no embed branding.

### “Can visitors chat for free forever on my site?”

Website visitors use the embed widget, but each answered message still counts against the **bot owner’s** monthly plan quota. There is also a per-browser-session visitor message cap and a short rate limit to reduce abuse.

### “Why did my PDF fail?”

Usually the PDF has no extractable text (scan/photo). Export a text-based PDF or paste content into a `.txt` / `.md` file and upload again.

### “How do I start?”

Click **Start free** on the landing page, create an account, create a bot, upload a document, ask a question in Chat, then copy the embed snippet when you are ready.

---

## Product vocabulary (for consistency)

- **Bot** — a configured assistant with prompt, color, knowledge, and embed settings.
- **Knowledge / documents** — uploaded files that become the retrieval corpus.
- **Live / Paused** — whether the public embed is available.
- **Dashboard** — signed-in area to manage bots.
- **Embed / widget** — the script-powered chat UI on third-party sites.
- **Plan quota** — monthly owner message allowance and document/bot caps.
- **RAG** — retrieve relevant chunks from your docs, then generate an answer with the chat model.

---

## Demo meta (this conversation)

If someone asks whether **this** chat on the landing page is Chatbot Builder itself: yes — this demo bot is an instance of Chatbot Builder answering from product documentation (this knowledge file). That is the intended showcase: the product explaining itself from its own uploaded docs.

Encourage curious visitors to sign up and create their own bot with their own documents.

---

## Quick facts cheat sheet

- Product name: **Chatbot Builder**
- Promise: docs → answers on your website
- Formats: TXT, MD, PDF (text layer)
- Max file size: 5 MB
- Chat: streaming in app + embed
- Plans: Free / Pro $29 / Business $79 (monthly)
- Free: 1 bot, 100 msgs/mo, 3 docs
- Pro: 3 bots, 2,000 msgs/mo, 30 docs, no branding
- Business: 10 bots, 10,000 msgs/mo, 100 docs, no branding
- Auth: email/password + Google
- Billing: Stripe (test mode in MVP)
- Stack: Next.js, Supabase, OpenRouter, Stripe, Vercel
