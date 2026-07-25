-- =============================================================================
-- Dublin Lions BC — Per-row chat_messages table (scales to hundreds of users)
--
-- Run this ONCE in the Supabase SQL editor (project neulcrpkroiyglgiywcp).
-- Replaces the previous JSON-blob approach that stored the whole message
-- history inside app_state[dlbc_chat_messages]. That approach lost messages
-- under simultaneous sends because the whole blob is upserted (last-writer
-- wins). Per-row INSERTs are atomic and safe at any scale.
--
-- Safe to re-run — everything uses IF NOT EXISTS / CREATE OR REPLACE.
-- =============================================================================

-- 1. Table -------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  team_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  sender_role text not null check (sender_role in ('player','manager')),
  text text not null check (char_length(text) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_team_created_idx
  on public.chat_messages (team_id, created_at desc);

create index if not exists chat_messages_user_idx
  on public.chat_messages (user_id);

-- 2. RLS ---------------------------------------------------------------------
alter table public.chat_messages enable row level security;

-- SELECT: any authenticated user can read (client filters by team_id).
-- Matches the existing behaviour where all authed users could read the blob.
-- If you later want team-scoped read-privacy, replace this with a policy
-- that checks membership via is_chat_member(team_id, auth.uid()).
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select
  to authenticated
  using (true);

-- INSERT: sender must be the authenticated user.
drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- DELETE: sender can delete own; managers can delete anyone's.
-- Assumes is_manager() function already exists (from app-data-setup.sql).
drop policy if exists chat_messages_delete on public.chat_messages;
create policy chat_messages_delete on public.chat_messages
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    or coalesce((select public.is_manager()), false)
  );

-- No UPDATE policy — messages are immutable once sent. Delete + resend to edit.

-- 3. Realtime ---------------------------------------------------------------
-- Publish INSERT + DELETE events so all open clients update instantly with
-- no polling. The publication `supabase_realtime` already exists (created
-- by app-data-setup.sql).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
end
$$;

-- Ensure DELETE events carry the old row (id) so the client can drop it
-- from the local cache.
alter table public.chat_messages replica identity full;

-- 4. Grants -----------------------------------------------------------------
grant select, insert, delete on public.chat_messages to authenticated;

-- =============================================================================
-- Done. The app now writes chat via per-row INSERTs to this table and
-- receives updates via Supabase Realtime. The old blob key
-- app_state[dlbc_chat_messages] is no longer touched by the app (you can
-- leave that row in place or delete it manually — it's ignored).
-- =============================================================================
