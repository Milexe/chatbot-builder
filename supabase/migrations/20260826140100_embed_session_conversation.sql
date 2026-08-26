-- Link each embed visitor session to a single conversation thread.
alter table public.embed_sessions
  add column if not exists conversation_id uuid references public.conversations (id) on delete set null;
