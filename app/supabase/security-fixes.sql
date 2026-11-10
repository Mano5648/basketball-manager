-- security-fixes.sql
-- Run AFTER 00-full-setup.sql, public-browsing.sql, age-gate-and-export.sql and
-- race-condition-fixes.sql. Safe to re-run.
--
-- Several RLS policies only check who owns a row, not which columns the owner
-- may change. These triggers close that gap: members keep the writes the app
-- needs, and server-owned or manager-owned columns are left alone.
--
-- "Privileged" means the change comes from the service role (edge functions),
-- the SQL editor, a SECURITY DEFINER function, or a club manager.
-- Requests from the app run as the `authenticated` or `anon` role.

create or replace function public.is_privileged_writer()
returns boolean language sql stable set search_path = public as $$
  select current_user not in ('authenticated', 'anon') or public.is_manager();
$$;

-- 1) Profiles: members may not change their email --------------------------------
-- profiles.email is used as the identity key by data export, account deletion and
-- signup, so it must always match the verified login email. It is kept in sync
-- from auth.users by the trigger below.
create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_privileged_writer() and new.email is distinct from old.email then
    raise exception 'Email can only be changed from your account login settings'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = lower(new.email), updated_at = now() where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- 2) Data export: match purchases on the verified login email ------------------
create or replace function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  login_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'profile',      (select to_jsonb(p) from public.profiles p where p.id = uid),
    'children',     coalesce((select jsonb_agg(to_jsonb(c)) from public.children c where c.parent_id = uid), '[]'::jsonb),
    'teams',        coalesce((select jsonb_agg(to_jsonb(tm)) from public.team_members tm where tm.profile_id = uid), '[]'::jsonb),
    'event_rsvps',  coalesce((select jsonb_agg(to_jsonb(r)) from public.event_rsvps r where r.profile_id = uid), '[]'::jsonb),
    'memberships',  coalesce((select jsonb_agg(to_jsonb(m)) from public.memberships m where m.profile_id = uid), '[]'::jsonb),
    'lotto_tickets',coalesce((select jsonb_agg(to_jsonb(l)) from public.lotto_tickets l where l.profile_id = uid), '[]'::jsonb),
    'bookings',     coalesce((select jsonb_agg(to_jsonb(b)) from public.facility_bookings b where b.profile_id = uid), '[]'::jsonb),
    'orders',       coalesce((select jsonb_agg(to_jsonb(o)) from public.orders o where o.profile_id = uid), '[]'::jsonb),
    -- purchases carry no profile id, so they are matched on the verified login
    -- email from the JWT (never on a column the member can edit).
    'purchases',    coalesce((select jsonb_agg(to_jsonb(pu)) from public.purchases pu
                              where login_email <> '' and lower(pu.customer_email) = login_email), '[]'::jsonb),
    'devices',      coalesce((select jsonb_agg(jsonb_build_object('platform', pt.platform, 'updated_at', pt.updated_at))
                              from public.push_tokens pt where pt.profile_id = uid), '[]'::jsonb)
  );
end $$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- 3) Children: only managers assign teams -----------------------------------------
-- Parents add and edit their children; team placement stays a manager decision,
-- because children.team_id grants team notifications, rosters and team pushes.
create or replace function public.guard_child_team()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_privileged_writer() then
    if tg_op = 'INSERT' then
      new.team_id := null;
    else
      new.team_id := old.team_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_child_team on public.children;
create trigger guard_child_team before insert or update on public.children
  for each row execute function public.guard_child_team();

-- 4) Fixtures: coaches may only run the live match ----------------------------------
-- Coaches update score, status and period. Prices, ticket sales, opponent, venue,
-- date and team stay manager-only.
create or replace function public.guard_fixture_update()
returns trigger language plpgsql set search_path = public as $$
declare live_cols text[] := array['home_score', 'away_score', 'status', 'period'];
begin
  if not public.is_privileged_writer()
     and (to_jsonb(new) - live_cols) is distinct from (to_jsonb(old) - live_cols) then
    raise exception 'Coaches can only update the live score, status and period'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists guard_fixture_update on public.fixtures;
create trigger guard_fixture_update before update on public.fixtures
  for each row execute function public.guard_fixture_update();

-- 5) Facility bookings: payment decides confirmation ----------------------------------
-- A member's booking on a paid facility always starts 'pending'; only the payment
-- webhook (service role) confirms it. Members may cancel their own booking but
-- not move it, re-time it, or mark it confirmed.
create or replace function public.guard_booking_write()
returns trigger language plpgsql set search_path = public as $$
declare price int;
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.purchase_id := null;
    select f.price_cents into price from public.facilities f where f.id = new.facility_id;
    if coalesce(price, 0) > 0 then
      new.status := 'pending';
    elsif new.status is distinct from 'cancelled' then
      new.status := 'confirmed';
    end if;
    return new;
  end if;
  -- UPDATE: the only member change allowed is cancelling.
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status')
     or (new.status is distinct from old.status and new.status <> 'cancelled') then
    raise exception 'You can only cancel a booking'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists guard_booking_write on public.facility_bookings;
create trigger guard_booking_write before insert or update on public.facility_bookings
  for each row execute function public.guard_booking_write();

-- The busy-slot view runs as its owner, so it must stay read-only for the app.
revoke insert, update, delete on public.facility_busy_slots from anon, authenticated;

-- 6) Lotto tickets: results are set only by the draw ------------------------------
create or replace function public.guard_ticket_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_privileged_writer() then
    new.is_winner := false;
    new.matched := 0;
    new.purchase_id := null;
  end if;
  return new;
end $$;
drop trigger if exists guard_ticket_insert on public.lotto_tickets;
create trigger guard_ticket_insert before insert on public.lotto_tickets
  for each row execute function public.guard_ticket_insert();

-- 7) Storage: no anonymous listing of club-media ----------------------------------
-- The bucket is public, so images still load by URL without any SELECT policy.
-- The SELECT policy only governs listing, which exposed every member photo.
-- Members can see and delete their own uploads; managers can see everything.
drop policy if exists "club_media_read" on storage.objects;
create policy "club_media_read" on storage.objects for select to authenticated
  using (bucket_id = 'club-media' and (public.is_manager() or owner = auth.uid()));
drop policy if exists "club_media_delete" on storage.objects;
create policy "club_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'club-media' and (public.is_manager() or owner = auth.uid()));

-- 8) Realtime: don't broadcast per-person RSVP and read-receipt rows ------------
-- Realtime DELETE events are not filtered by RLS and carry the primary key, which
-- for these tables is (event/notification, profile). The app refreshes these
-- after its own writes, so dropping them from the feed only loses cross-device
-- live updates of your own RSVPs and read markers.
do $$
declare t text;
begin
  foreach t in array array['event_rsvps', 'notification_reads']
  loop
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end $$;
