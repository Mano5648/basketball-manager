-- Two GDPR-driven additions. Idempotent.
--
-- 1. Age gate. Ireland's digital age of consent is 16, so an account holder
--    must be 16 or over. Children do not get accounts — a parent registers and
--    adds them, which is what the children table is for.
--
-- 2. Right of access (GDPR Art. 15/20): a member can export everything the
--    club holds about them, without asking anyone.

-- 1. Age ---------------------------------------------------------------------
alter table public.profiles add column if not exists date_of_birth date;

-- Enforced in the database, not just the sign-up form, so it still holds for
-- anyone calling the API directly. Existing rows predate the column and are
-- left alone; the check only has to hold once a date is actually set.
alter table public.profiles drop constraint if exists profiles_min_age;
alter table public.profiles add constraint profiles_min_age
  check (date_of_birth is null or date_of_birth <= (current_date - interval '16 years'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare dob date;
begin
  dob := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  if dob is not null and dob > (current_date - interval '16 years') then
    raise exception 'Account holders must be at least 16 years old';
  end if;

  insert into public.profiles (id, email, full_name, phone, member_type, date_of_birth)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce(nullif(new.raw_user_meta_data ->> 'member_type', ''), 'parent'),
    dob
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Data export -------------------------------------------------------------
-- Returns everything tied to the caller. Security definer so it can read the
-- caller's own rows in one pass, but it is scoped to auth.uid() throughout and
-- returns nothing when called without a session.
create or replace function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
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
    -- purchases carry no profile id, so they are matched on the email the
    -- account currently uses; this is also why deleting an account cannot
    -- remove them, as the deletion page explains.
    'purchases',    coalesce((select jsonb_agg(to_jsonb(pu)) from public.purchases pu
                              where lower(pu.customer_email) = (select lower(email) from public.profiles where id = uid)), '[]'::jsonb),
    'devices',      coalesce((select jsonb_agg(jsonb_build_object('platform', pt.platform, 'updated_at', pt.updated_at))
                              from public.push_tokens pt where pt.profile_id = uid), '[]'::jsonb)
  );
end $$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
