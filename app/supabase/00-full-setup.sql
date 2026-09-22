-- =============================================================================
-- Dublin Lions BC club app — FULL DATABASE SETUP (one paste, safe to re-run)
-- Supabase SQL editor → paste everything → Run.
-- Order matters: admins + is_manager() first, then payments, chat, then the app.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.managers (
  email       text primary key,
  added_by    text,
  created_at  timestamptz not null default now()
);
insert into public.managers (email) values ('manager@dublinlions.ie') on conflict do nothing;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.managers m
    where m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;


-- ======================= security-setup.sql =======================

-- Security rate limiting for public forms and checkout (service role only)
create table if not exists public.security_rate_limits (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,
  identifier  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists security_rate_limits_lookup_idx
  on public.security_rate_limits (action, identifier, created_at desc);

alter table public.security_rate_limits enable row level security;
-- No client policies — edge functions use service role only.


-- ======================= purchases-setup.sql =======================

-- ============================================================================
-- Dublin Lions — Purchase history (Stripe checkout records)
-- Run in Supabase SQL Editor after app-data-setup.sql
-- ============================================================================

create table if not exists public.purchases (
  id                uuid primary key default gen_random_uuid(),
  reference_id      text not null,
  purchase_type     text not null check (purchase_type in ('store', 'ticket', 'membership')),
  customer_name     text not null,
  customer_email    text not null,
  player_id         text,
  amount_cents      integer not null check (amount_cents > 0),
  currency          text not null default 'eur',
  items             jsonb not null default '[]'::jsonb,
  status            text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  stripe_session_id text unique,
  stripe_payment_intent text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  confirmation_email_sent_at timestamptz
);

create index if not exists purchases_email_idx on public.purchases (customer_email);
create index if not exists purchases_status_idx on public.purchases (status);
create index if not exists purchases_created_idx on public.purchases (created_at desc);
create index if not exists purchases_reference_idx on public.purchases (reference_id);

alter table public.purchases enable row level security;

drop policy if exists "purchases_public_insert" on public.purchases;
drop policy if exists "purchases_public_read_own" on public.purchases;
drop policy if exists "purchases_manager_read_all" on public.purchases;
drop policy if exists "purchases_service_update" on public.purchases;

-- Anyone can create a pending purchase when starting checkout (anon + authenticated).
create policy "purchases_public_insert"
  on public.purchases for insert
  with check (true);

-- Shoppers can read their own purchases by email when signed in.
create policy "purchases_public_read_own"
  on public.purchases for select
  using (
    lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_manager()
  );

-- Managers see everything (via is_manager or when using service role in webhook).
create policy "purchases_manager_read_all"
  on public.purchases for select
  using (public.is_manager());

-- Updates only via service role (Stripe webhook edge function).
-- No client UPDATE policy on purpose.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'purchases'
  ) then
    alter publication supabase_realtime add table public.purchases;
  end if;
end $$;

-- Run on existing projects that already created purchases without this column:
alter table public.purchases
  add column if not exists confirmation_email_sent_at timestamptz;


-- ======================= purchases-refund.sql =======================

-- =============================================================================
-- Dublin Lions — Refund support for the `purchases` table
--
-- Run this ONCE in the Supabase SQL editor (safe to re-run — idempotent).
-- Extends the existing purchases table so managers can refund a paid order
-- and both sides (player + manager) see the refund status live.
-- =============================================================================

-- 1. Allow 'refunded' as a status (used to be pending/paid/failed/cancelled) --
alter table public.purchases drop constraint if exists purchases_status_check;
alter table public.purchases add constraint purchases_status_check
  check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

-- 2. Refund audit columns ---------------------------------------------------
alter table public.purchases
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_amount_cents integer,
  add column if not exists refund_reason text,
  add column if not exists stripe_refund_id text;

-- 3. Realtime already includes `purchases` from purchases-setup.sql, so both
--    player and manager see status flips within a second.

-- 4. Managers can trigger refund via the edge function (uses service role);
--    the UPDATE happens server-side so we do NOT expose a client UPDATE policy.
--    Nothing else to grant here.


-- ======================= chat-messages-setup.sql =======================

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


-- ======================= clubspot-app-setup.sql =======================

-- =============================================================================
-- Dublin Lions BC — Club App (ClubSpot-style) schema
-- Run ONCE in the Supabase SQL editor. Safe to re-run (idempotent).
-- Requires: chat-messages-setup.sql, purchases-setup.sql, security-setup.sql
-- =============================================================================

create extension if not exists pgcrypto;

-- 0) Admins ------------------------------------------------------------------
create table if not exists public.managers (
  email       text primary key,
  added_by    text,
  created_at  timestamptz not null default now()
);
insert into public.managers (email) values ('manager@dublinlions.ie') on conflict do nothing;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.managers m
    where m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.managers enable row level security;
drop policy if exists managers_select on public.managers;
create policy managers_select on public.managers for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')) or public.is_manager());
drop policy if exists managers_write on public.managers;
create policy managers_write on public.managers for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- 1) Profiles -----------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text not null default '',
  phone        text,
  member_type  text not null default 'supporter' check (member_type in ('adult','parent','supporter')),
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, member_type)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce(nullif(new.raw_user_meta_data ->> 'member_type', ''), 'supporter')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill existing users
insert into public.profiles (id, email, full_name, member_type)
select u.id, lower(u.email), coalesce(u.raw_user_meta_data ->> 'name', ''), 'parent'
from auth.users u where u.email is not null
on conflict (id) do nothing;

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_manager());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_manager()) with check (id = auth.uid() or public.is_manager());
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated using (public.is_manager());

-- 2) Teams + children + team membership ---------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  age_group   text,
  description text,
  coach_name  text,
  coach_email text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.children (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles(id) on delete cascade,
  full_name   text not null,
  dob         date,
  team_id     uuid references public.teams(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists children_parent_idx on public.children (parent_id);

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete cascade,
  child_id    uuid references public.children(id) on delete cascade,
  role        text not null default 'player' check (role in ('player','coach','parent')),
  created_at  timestamptz not null default now(),
  check (profile_id is not null or child_id is not null)
);
create unique index if not exists team_members_unique_idx
  on public.team_members (team_id, coalesce(profile_id, '00000000-0000-0000-0000-000000000000'), coalesce(child_id, '00000000-0000-0000-0000-000000000000'));

create or replace function public.my_team_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select tm.team_id from public.team_members tm where tm.profile_id = auth.uid()
  union
  select tm.team_id from public.team_members tm
    join public.children c on c.id = tm.child_id where c.parent_id = auth.uid()
  union
  select c.team_id from public.children c where c.parent_id = auth.uid() and c.team_id is not null
  union
  select t.id from public.teams t where lower(t.coach_email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

alter table public.teams enable row level security;
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated using (true);
drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

alter table public.children enable row level security;
drop policy if exists children_own on public.children;
create policy children_own on public.children for all to authenticated
  using (parent_id = auth.uid() or public.is_manager())
  with check (parent_id = auth.uid() or public.is_manager());

alter table public.team_members enable row level security;
drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select to authenticated
  using (profile_id = auth.uid() or public.is_manager()
         or child_id in (select id from public.children where parent_id = auth.uid())
         or team_id in (select public.my_team_ids()));
drop policy if exists team_members_write on public.team_members;
create policy team_members_write on public.team_members for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- 3) Club settings (singleton) ------------------------------------------------
create table if not exists public.club_settings (
  id              int primary key default 1 check (id = 1),
  club_name       text not null default 'Dublin Lions BC',
  tagline         text default 'Official club app',
  logo_url        text,
  primary_color   text not null default '#2E6BFF',
  contact_email   text,
  contact_phone   text,
  address         text,
  website_url     text,
  currency        text not null default 'eur',
  features        jsonb not null default '{"news":true,"events":true,"fixtures":true,"shop":true,"membership":true,"lotto":true,"booking":true,"messages":true}'::jsonb,
  lotto_rules     text,
  terms_url       text,
  privacy_url     text,
  updated_at      timestamptz not null default now()
);
insert into public.club_settings (id) values (1) on conflict do nothing;
alter table public.club_settings enable row level security;
drop policy if exists club_settings_select on public.club_settings;
create policy club_settings_select on public.club_settings for select using (true);
drop policy if exists club_settings_write on public.club_settings;
create policy club_settings_write on public.club_settings for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- 4) News -----------------------------------------------------------------------
create table if not exists public.news_posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  image_url   text,
  published   boolean not null default true,
  pinned      boolean not null default false,
  author_id   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists news_posts_created_idx on public.news_posts (pinned desc, created_at desc);
alter table public.news_posts enable row level security;
drop policy if exists news_select on public.news_posts;
create policy news_select on public.news_posts for select to authenticated
  using (published or public.is_manager());
drop policy if exists news_write on public.news_posts;
create policy news_write on public.news_posts for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- 5) Events + RSVPs -------------------------------------------------------------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text default '',
  location      text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  team_id       uuid references public.teams(id) on delete set null,
  image_url     text,
  rsvp_enabled  boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists events_starts_idx on public.events (starts_at);
alter table public.events enable row level security;
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated using (true);
drop policy if exists events_write on public.events;
create policy events_write on public.events for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create table if not exists public.event_rsvps (
  event_id    uuid not null references public.events(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  status      text not null check (status in ('going','maybe','not_going')),
  updated_at  timestamptz not null default now(),
  primary key (event_id, profile_id)
);
alter table public.event_rsvps enable row level security;
drop policy if exists rsvps_select on public.event_rsvps;
create policy rsvps_select on public.event_rsvps for select to authenticated using (true);
drop policy if exists rsvps_write on public.event_rsvps;
create policy rsvps_write on public.event_rsvps for all to authenticated
  using (profile_id = auth.uid() or public.is_manager()) with check (profile_id = auth.uid() or public.is_manager());

-- 6) Fixtures & results ---------------------------------------------------------
create table if not exists public.fixtures (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid references public.teams(id) on delete set null,
  opponent          text not null,
  competition       text,
  venue             text,
  is_home           boolean not null default true,
  starts_at         timestamptz not null,
  home_score        int,
  away_score        int,
  status            text not null default 'scheduled' check (status in ('scheduled','completed','postponed','cancelled')),
  tickets_enabled   boolean not null default false,
  adult_price_cents int not null default 0,
  kid_price_cents   int not null default 0,
  notes             text,
  created_at        timestamptz not null default now()
);
create index if not exists fixtures_starts_idx on public.fixtures (starts_at desc);
alter table public.fixtures enable row level security;
drop policy if exists fixtures_select on public.fixtures;
create policy fixtures_select on public.fixtures for select to authenticated using (true);
drop policy if exists fixtures_write on public.fixtures;
create policy fixtures_write on public.fixtures for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- 7) Membership packages + memberships ------------------------------------------
create table if not exists public.membership_packages (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text default '',
  price_cents      int not null check (price_cents >= 0),
  duration_months  int not null default 12 check (duration_months > 0),
  audience         text not null default 'any' check (audience in ('any','adult','child','supporter')),
  active           boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);
alter table public.membership_packages enable row level security;
drop policy if exists packages_select on public.membership_packages;
create policy packages_select on public.membership_packages for select to authenticated
  using (active or public.is_manager());
drop policy if exists packages_write on public.membership_packages;
create policy packages_write on public.membership_packages for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create table if not exists public.memberships (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  child_id     uuid references public.children(id) on delete set null,
  package_id   uuid references public.membership_packages(id) on delete set null,
  package_name text not null,
  amount_cents int not null default 0,
  starts_at    date not null default current_date,
  expires_at   date not null,
  status       text not null default 'active' check (status in ('active','expired','cancelled')),
  purchase_id  uuid references public.purchases(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists memberships_profile_idx on public.memberships (profile_id);
alter table public.memberships enable row level security;
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships for select to authenticated
  using (profile_id = auth.uid() or public.is_manager());
drop policy if exists memberships_write on public.memberships;
create policy memberships_write on public.memberships for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- 8) Lotto ----------------------------------------------------------------------
create table if not exists public.lotto_draws (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  ticket_price_cents int not null check (ticket_price_cents > 0),
  jackpot_cents      int not null default 0,
  numbers_count      int not null default 4 check (numbers_count between 1 and 10),
  max_number         int not null default 32 check (max_number between 5 and 99),
  draw_at            timestamptz not null,
  status             text not null default 'open' check (status in ('open','closed','drawn','cancelled')),
  winning_numbers    int[],
  drawn_at           timestamptz,
  created_at         timestamptz not null default now()
);
alter table public.lotto_draws enable row level security;
drop policy if exists draws_select on public.lotto_draws;
create policy draws_select on public.lotto_draws for select to authenticated using (true);
drop policy if exists draws_write on public.lotto_draws;
create policy draws_write on public.lotto_draws for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create table if not exists public.lotto_tickets (
  id           uuid primary key default gen_random_uuid(),
  draw_id      uuid not null references public.lotto_draws(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  numbers      int[] not null,
  status       text not null default 'pending' check (status in ('pending','paid','cancelled')),
  is_winner    boolean not null default false,
  matched      int not null default 0,
  purchase_id  uuid references public.purchases(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists lotto_tickets_draw_idx on public.lotto_tickets (draw_id);
alter table public.lotto_tickets enable row level security;
drop policy if exists tickets_select on public.lotto_tickets;
create policy tickets_select on public.lotto_tickets for select to authenticated
  using (profile_id = auth.uid() or public.is_manager());
drop policy if exists tickets_insert on public.lotto_tickets;
create policy tickets_insert on public.lotto_tickets for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending');
drop policy if exists tickets_manager on public.lotto_tickets;
create policy tickets_manager on public.lotto_tickets for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- Server-side random draw (manager only)
create or replace function public.run_lotto_draw(p_draw_id uuid)
returns int[] language plpgsql security definer set search_path = public as $$
declare d public.lotto_draws; nums int[] := '{}'; n int;
begin
  if not public.is_manager() then raise exception 'not allowed'; end if;
  select * into d from public.lotto_draws where id = p_draw_id for update;
  if d is null then raise exception 'draw not found'; end if;
  if d.status = 'drawn' then return d.winning_numbers; end if;
  while coalesce(array_length(nums,1),0) < d.numbers_count loop
    n := 1 + floor(random() * d.max_number)::int;
    if not (n = any(nums)) then nums := nums || n; end if;
  end loop;
  update public.lotto_draws set winning_numbers = nums, status = 'drawn', drawn_at = now() where id = p_draw_id;
  update public.lotto_tickets t set
    matched = (select count(*) from unnest(t.numbers) x where x = any(nums)),
    is_winner = ((select count(*) from unnest(t.numbers) x where x = any(nums)) = d.numbers_count)
  where t.draw_id = p_draw_id and t.status = 'paid';
  return nums;
end $$;

-- 9) Facilities + bookings -------------------------------------------------------
create table if not exists public.facilities (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text default '',
  open_time     time not null default '08:00',
  close_time    time not null default '22:00',
  slot_minutes  int not null default 60 check (slot_minutes in (30,60,90,120)),
  price_cents   int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table public.facilities enable row level security;
drop policy if exists facilities_select on public.facilities;
create policy facilities_select on public.facilities for select to authenticated using (active or public.is_manager());
drop policy if exists facilities_write on public.facilities;
create policy facilities_write on public.facilities for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create table if not exists public.facility_bookings (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text not null default 'confirmed' check (status in ('pending','confirmed','cancelled')),
  notes        text,
  purchase_id  uuid references public.purchases(id) on delete set null,
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists bookings_facility_time_idx on public.facility_bookings (facility_id, starts_at);
-- prevent double booking of live slots
create extension if not exists btree_gist;
alter table public.facility_bookings drop constraint if exists bookings_no_overlap;
alter table public.facility_bookings add constraint bookings_no_overlap
  exclude using gist (facility_id with =, tstzrange(starts_at, ends_at) with &&)
  where (status <> 'cancelled');
alter table public.facility_bookings enable row level security;
drop policy if exists bookings_select on public.facility_bookings;
create policy bookings_select on public.facility_bookings for select to authenticated using (true);
drop policy if exists bookings_insert on public.facility_bookings;
create policy bookings_insert on public.facility_bookings for insert to authenticated
  with check (profile_id = auth.uid() or public.is_manager());
drop policy if exists bookings_update on public.facility_bookings;
create policy bookings_update on public.facility_bookings for update to authenticated
  using (profile_id = auth.uid() or public.is_manager()) with check (profile_id = auth.uid() or public.is_manager());
drop policy if exists bookings_delete on public.facility_bookings;
create policy bookings_delete on public.facility_bookings for delete to authenticated
  using (profile_id = auth.uid() or public.is_manager());

-- 10) Shop: products + orders -----------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text default '',
  category     text default 'Merchandise',
  price_cents  int not null check (price_cents >= 0),
  image_url    text,
  stock        int,
  sizes        text[] default '{}',
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (active or public.is_manager());
drop policy if exists products_write on public.products;
create policy products_write on public.products for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references public.profiles(id) on delete set null,
  customer_name   text not null,
  customer_email  text not null,
  items           jsonb not null default '[]'::jsonb,
  total_cents     int not null default 0,
  status          text not null default 'pending' check (status in ('pending','paid','fulfilled','refunded','cancelled')),
  delivery_note   text,
  purchase_id     uuid references public.purchases(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_profile_idx on public.orders (profile_id, created_at desc);
alter table public.orders enable row level security;
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (profile_id = auth.uid() or public.is_manager());
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending');
drop policy if exists orders_manager on public.orders;
create policy orders_manager on public.orders for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- 11) Notifications + push tokens ---------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  target      text not null default 'all' check (target in ('all','team')),
  team_id     uuid references public.teams(id) on delete set null,
  link        text,
  sent_by     uuid references public.profiles(id) on delete set null,
  push_sent   int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (target = 'all' or public.is_manager() or team_id in (select public.my_team_ids()));
drop policy if exists notifications_write on public.notifications;
create policy notifications_write on public.notifications for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, profile_id)
);
alter table public.notification_reads enable row level security;
drop policy if exists notification_reads_own on public.notification_reads;
create policy notification_reads_own on public.notification_reads for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create table if not exists public.push_tokens (
  token       text primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  platform    text not null default 'android',
  updated_at  timestamptz not null default now()
);
create index if not exists push_tokens_profile_idx on public.push_tokens (profile_id);
alter table public.push_tokens enable row level security;
drop policy if exists push_tokens_own on public.push_tokens;
create policy push_tokens_own on public.push_tokens for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- 12) Purchases: extend types + allow refunded status --------------------------------
alter table public.purchases drop constraint if exists purchases_purchase_type_check;
alter table public.purchases add constraint purchases_purchase_type_check
  check (purchase_type in ('store','ticket','membership','lotto','booking'));
alter table public.purchases drop constraint if exists purchases_status_check;
alter table public.purchases add constraint purchases_status_check
  check (status in ('pending','paid','failed','cancelled','refunded'));
alter table public.purchases add column if not exists refunded_at timestamptz;
alter table public.purchases add column if not exists refund_reason text;

-- 13) Chat: scope reads to own teams + club channel ------------------------------------
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages for select to authenticated
  using (
    team_id = 'club'
    or public.is_manager()
    or team_id in (select id::text from public.my_team_ids() as id)
  );

-- 14) Storage bucket for images -----------------------------------------------------------
insert into storage.buckets (id, name, public) values ('club-media','club-media', true)
  on conflict (id) do nothing;
drop policy if exists "club_media_read" on storage.objects;
create policy "club_media_read" on storage.objects for select using (bucket_id = 'club-media');
drop policy if exists "club_media_write" on storage.objects;
create policy "club_media_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'club-media' and (public.is_manager() or (storage.foldername(name))[1] = 'avatars'));
drop policy if exists "club_media_update" on storage.objects;
create policy "club_media_update" on storage.objects for update to authenticated
  using (bucket_id = 'club-media' and public.is_manager());
drop policy if exists "club_media_delete" on storage.objects;
create policy "club_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'club-media' and public.is_manager());

-- 15) Realtime --------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['news_posts','events','event_rsvps','fixtures','orders','memberships','lotto_draws','lotto_tickets','facility_bookings','notifications','notification_reads','teams','team_members','children','profiles','products','club_settings']
  loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 16) Admin stats helper -------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_manager() then jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'children', (select count(*) from public.children),
    'active_memberships', (select count(*) from public.memberships where status='active' and expires_at >= current_date),
    'pending_orders', (select count(*) from public.orders where status='paid'),
    'revenue_cents', (select coalesce(sum(amount_cents),0) from public.purchases where status='paid'),
    'upcoming_events', (select count(*) from public.events where starts_at >= now()),
    'push_devices', (select count(*) from public.push_tokens)
  ) else '{}'::jsonb end;
$$;
