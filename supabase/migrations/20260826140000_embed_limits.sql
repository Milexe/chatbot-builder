-- Embed abuse controls: rate buckets + per-visitor session counters.
-- Written only via service role from public embed API.

create table if not exists public.embed_rate_buckets (
  bucket_key text primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.embed_sessions (
  id uuid primary key,
  bot_id uuid not null references public.bots (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  message_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now())
);

create index if not exists embed_sessions_bot_id_idx
  on public.embed_sessions (bot_id);

alter table public.embed_rate_buckets enable row level security;
alter table public.embed_sessions enable row level security;

-- No anon/authenticated policies: access is service-role only.
