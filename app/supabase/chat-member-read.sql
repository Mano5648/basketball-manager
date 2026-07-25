-- Allow players/parents to read team chat from app_state (run once on existing projects).
drop policy if exists "app_state_member_read_chat" on public.app_state;
create policy "app_state_member_read_chat"
  on public.app_state for select
  to authenticated
  using (key in ('dlbc_chat_messages', 'dlbc_chat_members', 'dlbc_chat_deleted_ids'));
