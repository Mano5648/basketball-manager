-- =============================================================================
-- Sponsors + fully configurable club content (idempotent). Run after 00-full-setup.sql
-- =============================================================================
create table if not exists public.sponsors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  logo_url     text,
  website_url  text,
  tier         text not null default 'Club partner',
  blurb        text,
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.sponsors enable row level security;
drop policy if exists sponsors_select on public.sponsors;
create policy sponsors_select on public.sponsors for select using (active or public.is_manager());
drop policy if exists sponsors_write on public.sponsors;
create policy sponsors_write on public.sponsors for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

alter table public.club_settings add column if not exists about_text text;
alter table public.club_settings add column if not exists privacy_text text;
alter table public.club_settings add column if not exists welcome_title text default 'Welcome back';
alter table public.club_settings add column if not exists register_title text default 'Join the club';
alter table public.club_settings add column if not exists sponsors_title text default 'Our sponsors';
alter table public.club_settings add column if not exists home_greeting text default 'Hey {name}';
update public.club_settings set features = features || '{"sponsors": true}'::jsonb where not (features ? 'sponsors');
update public.club_settings set features = features - 'messages';

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sponsors') then
    alter publication supabase_realtime add table public.sponsors;
  end if;
end $$;
