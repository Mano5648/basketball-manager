-- ============================================================================
-- Dublin Lions — Shared App Data setup (Team Chat, Players, Teams, Fixtures,
-- Schedule, Announcements, Payments, Season, etc.)
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. It is idempotent, so re-running is safe.
--
-- What it creates:
--   1. A generic key/value table "app_state" mirroring everything the
--      manager dashboard keeps in localStorage (see KEYS in src/lib/clubData.ts).
--   2. An is_manager() helper + Row-Level Security so public visitors can read
--      non-sensitive shared state, but only manager accounts can write it or
--      read member PII (players, payments, chat, orders).
--   3. Realtime enabled on the table so every open browser/device picks up
--      changes (e.g. a new Team Chat message) live, without a page refresh.
--
-- IMPORTANT: set your manager email(s) in the is_manager() function below —
-- keep this in sync with VITE_MANAGER_EMAILS and supabase/site-images-setup.sql.
-- ============================================================================

-- 0) Manager check ------------------------------------------------------------
-- Shared with site-images-setup.sql. Safe to redefine here idempotently.
create or replace function public.is_manager()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (array[
    'manager@dublinlions.ie'
  ]);
$$;

-- 1) Generic key/value mirror table -------------------------------------------
create table if not exists public.app_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- 2) RLS policies --------------------------------------------------------------
drop policy if exists "app_state_public_read"  on public.app_state;
drop policy if exists "app_state_public_read_safe" on public.app_state;
drop policy if exists "app_state_manager_read_sensitive" on public.app_state;
drop policy if exists "app_state_manager_read_all" on public.app_state;
drop policy if exists "app_state_auth_insert"  on public.app_state;
drop policy if exists "app_state_auth_update"  on public.app_state;
drop policy if exists "app_state_auth_delete"  on public.app_state;

-- Public fixture/store data — safe for anonymous visitors.
create policy "app_state_public_read_safe"
  on public.app_state for select
  using (
    key in (
      'dlbc_fixtures',
      'dlbc_announcements',
      'dlbc_products',
      'dlbc_ticket_prices',
      'dlbc_default_ticket_price',
      'dlbc_membership_fees',
      'dlbc_ageGroups',
      'dlbc_teams',
      'dlbc_schedule',
      'dlbc_season',
      'dlbc_season_history',
      'dlbc_stripe_payment_link'
    )
  );

-- Member PII and internal records — managers only.
create policy "app_state_manager_read_sensitive"
  on public.app_state for select
  to authenticated
  using (
    public.is_manager()
    and key in (
      'dlbc_players',
      'dlbc_payments',
      'dlbc_ticket_purchases',
      'dlbc_chat_messages',
      'dlbc_chat_members',
      'dlbc_orders',
      'dlbc_pending_senior_players',
      'dlbc_pending_team_assignments'
    )
  );

-- Managers can read any shared key (including future keys).
create policy "app_state_manager_read_all"
  on public.app_state for select
  to authenticated
  using (public.is_manager());

-- Any authenticated member can contribute shared state. This is required so
-- that non-manager sign-ups actually reach the club: a parent registering a
-- child now publishes their own rows to a private per-user row
-- ("dlbc_roster_contrib:<auth.uid()>") which managers aggregate into the shared
-- roster, plus members send Team Chat (dlbc_chat_*), buy tickets
-- (dlbc_ticket_purchases) and record card payments (dlbc_payments) through the
-- same localStorage->app_state mirror. Restricting writes to managers silently
-- dropped every member contribution (RLS rejected the upsert), so children
-- never appeared in the manager roster. Member PII reads stay manager-only
-- above; the client merges local + remote rows (mergePlayersForSync) and only
-- managers own the shared dlbc_players blob, so members never clobber it.
create policy "app_state_auth_insert"
  on public.app_state for insert
  to authenticated
  with check (true);

create policy "app_state_auth_update"
  on public.app_state for update
  to authenticated
  using (true) with check (true);

-- Deletes remain manager-only to prevent members clearing shared records.
create policy "app_state_auth_delete"
  on public.app_state for delete
  to authenticated
  using (public.is_manager());

-- 3) Realtime ------------------------------------------------------------------
-- Lets every connected browser/device receive INSERT/UPDATE/DELETE events on
-- this table live (used for Team Chat and any other shared view).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end $$;

-- Done. Once this has been run, the app will automatically mirror its
-- localStorage-backed data (players, teams, fixtures, schedule, announcements,
-- payments, season state, and Team Chat messages) to this table, and every
-- device will receive live updates.
