<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Project pointers (keep outside the Next block above) -->

# Chatbot Builder — agent notes

- Product locks + MVP backlog: `docs/product-decisions.md`
- Plan gates: `src/lib/pricing.ts`; non-plan caps: `src/lib/limits.ts`
- Shared RAG answer path: `src/lib/bot-answer.ts` (dashboard + embed)
- Embed script: `public/widget.js` — local landing demo always uses request host
- Do not invent PDF/streaming/UI citations until listed as shipped in product-decisions
- Prefer minimal diffs; match existing patterns; no drive-by refactors
