-- Owners need DELETE so "New chat" can remove conversations.
-- Cascade deletes on messages also require a messages DELETE policy under RLS.

create policy "conversations_delete_own"
  on public.conversations for delete
  using (auth.uid() = owner_id);

create policy "messages_delete_own"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.owner_id = auth.uid()
    )
  );
