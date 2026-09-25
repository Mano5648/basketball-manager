-- =============================================================================
-- Match Day Live — live scores + updates from coaches/admins (idempotent)
-- Run after 00-full-setup.sql
-- =============================================================================
alter table public.fixtures drop constraint if exists fixtures_status_check;
alter table public.fixtures add constraint fixtures_status_check
  check (status in ('scheduled','live','completed','postponed','cancelled'));
alter table public.fixtures add column if not exists period text;

create or replace function public.is_team_coach(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id
      and lower(coalesce(t.coach_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and t.coach_email is not null
  );
$$;

drop policy if exists fixtures_coach_update on public.fixtures;
create policy fixtures_coach_update on public.fixtures for update to authenticated
  using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));

create table if not exists public.fixture_updates (
  id          uuid primary key default gen_random_uuid(),
  fixture_id  uuid not null references public.fixtures(id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 300),
  home_score  int,
  away_score  int,
  author_id   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists fixture_updates_fixture_idx on public.fixture_updates (fixture_id, created_at desc);
alter table public.fixture_updates enable row level security;
drop policy if exists fixture_updates_select on public.fixture_updates;
create policy fixture_updates_select on public.fixture_updates for select to authenticated using (true);
drop policy if exists fixture_updates_write on public.fixture_updates;
create policy fixture_updates_write on public.fixture_updates for all to authenticated
  using (public.is_manager() or public.is_team_coach((select team_id from public.fixtures f where f.id = fixture_id)))
  with check (public.is_manager() or public.is_team_coach((select team_id from public.fixtures f where f.id = fixture_id)));

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='fixture_updates') then
    alter publication supabase_realtime add table public.fixture_updates;
  end if;
end $$;
