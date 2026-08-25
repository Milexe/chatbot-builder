-- Fix: tables created via raw SQL had no API grants; profiles had no INSERT policy.
-- Without this, Google (and other) logins fail when requiring a profile row.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.bots to anon;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id and plan = 'free');
