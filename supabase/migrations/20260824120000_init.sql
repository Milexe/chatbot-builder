-- Initial schema: profiles, bots, documents, chunks (pgvector), chat history.
-- Apply via Supabase SQL Editor or `supabase db push`.

create extension if not exists vector;

-- Profiles mirror auth.users; plan gates live here.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  stripe_customer_id text unique,
  messages_used_this_month integer not null default 0,
  messages_period_start date not null default (timezone('utc', now())::date),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null,
  system_prompt text not null default 'You are a helpful assistant. Answer only from the provided context. If the answer is not in the context, say you do not know.',
  welcome_message text not null default 'Hi! Ask me anything about our docs.',
  primary_color text not null default '#111827',
  allowed_origins text[] not null default '{}',
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, slug)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  storage_path text,
  mime_type text,
  byte_size integer,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- text-embedding-3-small → 1536 dims
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  bot_id uuid not null references public.bots (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  token_count integer,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_id, chunk_index)
);

create index if not exists document_chunks_bot_id_idx
  on public.document_chunks (bot_id);

-- HNSW works on empty tables; IVFFlat needs existing rows to build.
create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots (id) on delete cascade,
  owner_id uuid references public.profiles (id) on delete set null,
  source text not null default 'app' check (source in ('app', 'embed')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citation_chunk_ids uuid[] default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Similarity search for RAG
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_bot_id uuid,
  match_count integer default 6,
  match_threshold float default 0.7
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.bot_id = match_bot_id
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) >= match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.profiles enable row level security;
alter table public.bots enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Profiles (insert is a fallback if the signup trigger did not run)
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id and plan = 'free');

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Bots
create policy "bots_select_own"
  on public.bots for select
  using (auth.uid() = owner_id);

create policy "bots_insert_own"
  on public.bots for insert
  with check (auth.uid() = owner_id);

create policy "bots_update_own"
  on public.bots for update
  using (auth.uid() = owner_id);

create policy "bots_delete_own"
  on public.bots for delete
  using (auth.uid() = owner_id);

-- Public read for embed (is_public bots only — used carefully via RPC/API)
create policy "bots_select_public"
  on public.bots for select
  using (is_public = true);

-- Documents
create policy "documents_select_own"
  on public.documents for select
  using (auth.uid() = owner_id);

create policy "documents_insert_own"
  on public.documents for insert
  with check (auth.uid() = owner_id);

create policy "documents_update_own"
  on public.documents for update
  using (auth.uid() = owner_id);

create policy "documents_delete_own"
  on public.documents for delete
  using (auth.uid() = owner_id);

-- Chunks: owner via bot
create policy "chunks_select_own"
  on public.document_chunks for select
  using (
    exists (
      select 1 from public.bots b
      where b.id = bot_id and b.owner_id = auth.uid()
    )
  );

create policy "chunks_insert_own"
  on public.document_chunks for insert
  with check (
    exists (
      select 1 from public.bots b
      where b.id = bot_id and b.owner_id = auth.uid()
    )
  );

create policy "chunks_delete_own"
  on public.document_chunks for delete
  using (
    exists (
      select 1 from public.bots b
      where b.id = bot_id and b.owner_id = auth.uid()
    )
  );

-- Conversations / messages: owner for app; service role for embed writes
create policy "conversations_select_own"
  on public.conversations for select
  using (auth.uid() = owner_id);

create policy "conversations_insert_own"
  on public.conversations for insert
  with check (auth.uid() = owner_id);

create policy "messages_select_own"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.owner_id = auth.uid()
    )
  );

create policy "messages_insert_own"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.owner_id = auth.uid()
    )
  );

-- Tables created via SQL do not get API grants automatically.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.bots to anon;
grant usage, select on all sequences in schema public to authenticated;

-- Storage bucket for uploads (create via dashboard or:)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "documents_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "documents_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
