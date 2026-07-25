-- =============================================================================
-- Dublin Lions BC — Per-row `sessions` table + `team_coaches` role table
--
-- Run this ONCE in the Supabase SQL editor (project neulcrpkroiyglgiywcp).
-- Replaces the previous JSON-blob approach that stored the whole schedule
-- inside app_state[dlbc_schedule] (last-writer-wins, doesn't scale, and
-- worst of all can silently drop sessions added on another device before
-- the current tab re-syncs). Per-row inserts + Supabase Realtime make the
-- schedule visible to every team member within a second at any club size.
--
-- Also introduces `team_coaches` so the manager can grant per-team schedule
-- edit access to a coach (identified by email). Coaches can create / update /
-- delete only the sessions on their assigned team(s). Managers can do all.
--
-- Safe to re-run — everything uses IF NOT EXISTS / CREATE OR REPLACE.
-- =============================================================================

-- 0. Extension (uuid + jsonb helpers already available in Supabase) ----------

-- 1. team_coaches ------------------------------------------------------------
create table if not exists public.team_coaches (
  team_id text not null,
  coach_email text not null,
  created_at timestamptz not null default now(),
  primary key (team_id, coach_email)
);

create index if not exists team_coaches_email_idx
  on public.team_coaches (coach_email);

alter table public.team_coaches enable row level security;

-- SELECT: any authenticated user can read (needed so the app can check
-- 'am I a coach of this team?' client-side, and for the check further down).
drop policy if exists team_coaches_select on public.team_coaches;
create policy team_coaches_select on public.team_coaches
  for select
  to authenticated
  using (true);

-- INSERT / DELETE: manager only.
drop policy if exists team_coaches_manager_write on public.team_coaches;
create policy team_coaches_manager_write on public.team_coaches
  for all
  to authenticated
  using (coalesce((select public.is_manager()), false))
  with check (coalesce((select public.is_manager()), false));

-- 2. Helper: is_team_coach ---------------------------------------------------
create or replace function public.is_team_coach(p_team_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.team_coaches tc
    where tc.team_id = p_team_id
      and lower(tc.coach_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_team_coach(text) to authenticated;

-- 3. sessions ---------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  team_id text not null,
  title text not null,
  session_type text not null check (session_type in ('Training', 'Match', 'Event')),
  opponent text,
  session_date date not null,
  session_time time not null,
  location text not null default '',
  notes text not null default '',
  attendance text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_team_date_idx
  on public.sessions (team_id, session_date);

alter table public.sessions enable row level security;

-- SELECT: any authenticated user can read (client filters by their team
-- membership). Matches the previous behaviour where the schedule blob was
-- readable by any authenticated user.
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select
  to authenticated
  using (true);

-- WRITE: manager can do anything; coach can only write to teams they're
-- assigned to via `team_coaches`.
drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions
  for insert
  to authenticated
  with check (
    coalesce((select public.is_manager()), false)
    or public.is_team_coach(team_id)
  );

drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions
  for update
  to authenticated
  using (
    coalesce((select public.is_manager()), false)
    or public.is_team_coach(team_id)
  )
  with check (
    coalesce((select public.is_manager()), false)
    or public.is_team_coach(team_id)
  );

drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions
  for delete
  to authenticated
  using (
    coalesce((select public.is_manager()), false)
    or public.is_team_coach(team_id)
  );

-- 4. updated_at trigger ------------------------------------------------------
create or replace function public.sessions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sessions_touch_updated_at on public.sessions;
create trigger sessions_touch_updated_at
  before update on public.sessions
  for each row
  execute function public.sessions_touch_updated_at();

-- 5. Realtime ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sessions'
  ) then
    execute 'alter publication supabase_realtime add table public.sessions';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_coaches'
  ) then
    execute 'alter publication supabase_realtime add table public.team_coaches';
  end if;
end
$$;

alter table public.sessions replica identity full;
alter table public.team_coaches replica identity full;

-- 6. Grants -----------------------------------------------------------------
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, delete on public.team_coaches to authenticated;

-- =============================================================================
-- Done. The app now writes the schedule via per-row inserts/updates into
-- `public.sessions`, receives realtime events on every change, and the
-- manager can assign coaches per team via `public.team_coaches`.
-- =============================================================================
