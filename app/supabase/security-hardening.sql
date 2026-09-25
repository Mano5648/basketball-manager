-- =============================================================================
-- Security hardening (from security audit) — idempotent. Run after 00-full-setup.sql
-- =============================================================================

-- SEC-001: members may only read their own bookings / RSVPs -------------------
drop policy if exists bookings_select on public.facility_bookings;
create policy bookings_select on public.facility_bookings for select to authenticated
  using (profile_id = auth.uid() or public.is_manager());

-- anonymous busy-slot view for the booking grid (no notes / no identity)
create or replace view public.facility_busy_slots
with (security_invoker = false) as
  select facility_id, starts_at, ends_at
  from public.facility_bookings
  where status <> 'cancelled';
grant select on public.facility_busy_slots to authenticated;

drop policy if exists rsvps_select on public.event_rsvps;
create policy rsvps_select on public.event_rsvps for select to authenticated
  using (profile_id = auth.uid() or public.is_manager());

create or replace function public.event_rsvp_counts(p_event_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'going', count(*) filter (where status = 'going'),
    'maybe', count(*) filter (where status = 'maybe'),
    'not_going', count(*) filter (where status = 'not_going'))
  from public.event_rsvps where event_id = p_event_id;
$$;

-- SEC-002: purchases are only ever created by the checkout edge function (service role)
drop policy if exists "purchases_public_insert" on public.purchases;

-- Hardening: cryptographically random lotto draw ------------------------------
create or replace function public.run_lotto_draw(p_draw_id uuid)
returns int[] language plpgsql security definer set search_path = public as $$
declare d public.lotto_draws; nums int[] := '{}'; n int; r int; b bytea; lim int;
begin
  if not public.is_manager() then raise exception 'not allowed'; end if;
  select * into d from public.lotto_draws where id = p_draw_id for update;
  if d is null then raise exception 'draw not found'; end if;
  if d.status = 'drawn' then return d.winning_numbers; end if;
  lim := 65536 - (65536 % d.max_number);  -- rejection sampling: no modulo bias
  while coalesce(array_length(nums,1),0) < d.numbers_count loop
    b := gen_random_bytes(2);
    r := get_byte(b, 0) * 256 + get_byte(b, 1);
    if r >= lim then continue; end if;
    n := 1 + (r % d.max_number);
    if not (n = any(nums)) then nums := nums || n; end if;
  end loop;
  update public.lotto_draws set winning_numbers = nums, status = 'drawn', drawn_at = now() where id = p_draw_id;
  update public.lotto_tickets t set
    matched = (select count(*) from unnest(t.numbers) x where x = any(nums)),
    is_winner = ((select count(*) from unnest(t.numbers) x where x = any(nums)) = d.numbers_count)
  where t.draw_id = p_draw_id and t.status = 'paid';
  return nums;
end $$;

-- Hardening: remove the retired team-chat data --------------------------------
drop table if exists public.chat_messages cascade;

-- Hardening: legacy JSON blob store from the old website is no longer used ----
drop table if exists public.app_state cascade;

-- Legacy public-website image table
drop table if exists public.site_images cascade;
