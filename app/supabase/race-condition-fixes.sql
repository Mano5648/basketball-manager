-- =============================================================================
-- Race-condition fixes. Idempotent. Run after 00-full-setup.sql and
-- match-day-live.sql.
--
-- Every fix below is one conditional UPDATE (or INSERT .. ON CONFLICT): the
-- WHERE clause carries the state check, so Postgres's row lock decides the
-- winner and the loser simply matches no rows. No read-then-write in app code.
-- =============================================================================

-- 1. Shop stock is reserved when checkout starts, not decremented after payment.
--    Before: catalog.ts checked stock, then fulfil.ts read stock and wrote
--    stock - qty. Two buyers of the last item both passed the check and both
--    paid; concurrent fulfilments also overwrote each other's decrement.
alter table public.orders add column if not exists stock_reserved boolean not null default false;

-- Members insert their own orders, so they must not be able to pre-set the
-- flag: release_order_checkout would then hand back stock that was never taken.
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending' and not stock_reserved);

-- Claims an order for checkout and takes its stock in one transaction. A second
-- call for the same order (double click, two tabs) fails instead of opening a
-- second Stripe session. Any short product raises, which rolls back the claim.
-- A member may hold at most 3 unpaid checkouts, so nobody can tie up the
-- whole stock by starting checkouts and walking away.
create or replace function public.claim_order_checkout(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_items jsonb; v_profile uuid; v_open int; v_short text;
begin
  update public.orders set stock_reserved = true, updated_at = now()
   where id = p_order_id and status = 'pending' and not stock_reserved
   returning items, profile_id into v_items, v_profile;
  if not found then
    raise exception 'This order is already being paid for, or is no longer payable';
  end if;

  -- Serialise this member's claims on their profile row, so two claims racing
  -- each other can't both see "2 open" and both go through.
  perform 1 from public.profiles where id = v_profile for update;
  select count(*) into v_open from public.orders
   where profile_id = v_profile and status = 'pending' and stock_reserved;
  if v_open > 3 then
    raise exception 'You already have 3 unfinished checkouts. Complete one, or wait 30 minutes for them to expire';
  end if;

  with want as (
    select (i ->> 'product_id')::uuid as product_id,
           sum(greatest(1, least(50, floor((i ->> 'quantity')::numeric)::int))) as qty
      from jsonb_array_elements(v_items) i
     group by 1
  ), taken as (
    -- `stock >= qty` is re-checked against the latest row version after the
    -- row lock is granted, so two buyers can never both take the last item.
    update public.products p set stock = p.stock - w.qty
      from want w
     where p.id = w.product_id and p.stock is not null and p.stock >= w.qty
    returning p.id
  )
  select string_agg(pr.name, ', ') into v_short
    from want w join public.products pr on pr.id = w.product_id
   where pr.stock is not null and w.product_id not in (select id from taken);

  if v_short is not null then
    raise exception 'Not enough stock for %', v_short;
  end if;
end $$;

-- Gives reserved stock back. The flag flip is the claim, so a release that runs
-- twice (expiry webhook retried, checkout error path) restores stock once.
create or replace function public.release_order_checkout(p_order_id uuid)
returns void language sql security definer set search_path = public as $$
  with released as (
    update public.orders set stock_reserved = false, updated_at = now()
     where id = p_order_id and stock_reserved and status in ('pending', 'cancelled')
    returning items
  )
  update public.products p set stock = p.stock + w.qty
    from (
      select (i ->> 'product_id')::uuid as product_id,
             sum(greatest(1, least(50, floor((i ->> 'quantity')::numeric)::int))) as qty
        from released, jsonb_array_elements(released.items) i
       group by 1
    ) w
   where p.id = w.product_id and p.stock is not null;
$$;

-- Marks a store order paid. Only the call that moves it out of 'pending' does
-- anything; the webhook and the in-app confirmation can both call it safely.
-- Orders created before stock_reserved existed still get their stock taken here.
create or replace function public.mark_order_paid(p_order_id uuid, p_purchase_id uuid)
returns boolean language sql security definer set search_path = public as $$
  with paid as (
    update public.orders set status = 'paid', purchase_id = p_purchase_id, updated_at = now()
     where id = p_order_id and status = 'pending'
    returning items, stock_reserved
  ), legacy_stock as (
    update public.products p set stock = greatest(0, p.stock - w.qty)
      from (
        select (i ->> 'product_id')::uuid as product_id,
               sum(greatest(1, least(50, floor((i ->> 'quantity')::numeric)::int))) as qty
          from paid, jsonb_array_elements(paid.items) i
         where not paid.stock_reserved
         group by 1
      ) w
     where p.id = w.product_id and p.stock is not null
    returning p.id
  )
  select exists (select 1 from paid);
$$;

revoke all on function public.claim_order_checkout(uuid) from public, anon, authenticated;
revoke all on function public.release_order_checkout(uuid) from public, anon, authenticated;
revoke all on function public.mark_order_paid(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_order_checkout(uuid) to service_role;
grant execute on function public.release_order_checkout(uuid) to service_role;
grant execute on function public.mark_order_paid(uuid, uuid) to service_role;

-- 2. One membership per purchase. fulfil.ts used to check for an existing row
--    and then insert, so the webhook and the in-app confirmation could both
--    insert. It now inserts with ON CONFLICT DO NOTHING against this key.
alter table public.memberships drop constraint if exists memberships_purchase_id_key;
alter table public.memberships add constraint memberships_purchase_id_key unique (purchase_id);

-- Grants the membership a purchase paid for, reading everything from the
-- purchase row. FOR UPDATE locks that row, so a refund can't land between the
-- "still paid?" check and the insert: either the refund waits and then cancels
-- this membership, or it got there first and nothing is inserted.
create or replace function public.grant_membership(p_purchase_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.memberships
    (profile_id, child_id, package_id, package_name, amount_cents, starts_at, expires_at, status, purchase_id)
  select (pu.metadata ->> 'profile_id')::uuid,
         nullif(pu.metadata ->> 'child_id', '')::uuid,
         nullif(pu.metadata ->> 'package_id', '')::uuid,
         coalesce(nullif(pu.metadata ->> 'package_name', ''), 'Membership'),
         pu.amount_cents,
         current_date,
         (current_date + make_interval(months => greatest(1, coalesce(nullif(pu.metadata ->> 'duration_months', '')::int, 12))))::date,
         'active',
         pu.id
    from public.purchases pu
   where pu.id = p_purchase_id and pu.purchase_type = 'membership' and pu.status in ('paid', 'refunding')
     for update
  on conflict (purchase_id) do nothing;
$$;

revoke all on function public.grant_membership(uuid) from public, anon, authenticated;
grant execute on function public.grant_membership(uuid) to service_role;

-- 2b. Refunds claim the purchase first. Two managers clicking refund together
--     used to both read 'paid' and both call Stripe; now only the one whose
--     paid -> refunding update matches goes on, and a failed Stripe call puts
--     the row back to 'paid' so it can be retried straight away.
alter table public.purchases drop constraint if exists purchases_status_check;
alter table public.purchases add constraint purchases_status_check
  check (status in ('pending', 'paid', 'refunding', 'failed', 'cancelled', 'refunded'));

-- 3. Live score increments. MatchControl computed the new score from the value
--    on screen, so two scorers tapping at once lost a basket. The increment now
--    happens in the UPDATE itself. Security invoker: the fixtures RLS policies
--    (managers, the team's coach) still decide who may change the score.
create or replace function public.bump_fixture_score(p_fixture_id uuid, p_side text, p_delta int)
returns table (home_score int, away_score int)
language sql security invoker set search_path = public as $$
  update public.fixtures f set
    home_score = case when p_side = 'home' then greatest(0, coalesce(f.home_score, 0) + p_delta) else coalesce(f.home_score, 0) end,
    away_score = case when p_side = 'away' then greatest(0, coalesce(f.away_score, 0) + p_delta) else coalesce(f.away_score, 0) end
   where f.id = p_fixture_id and p_side in ('home', 'away')
  returning f.home_score, f.away_score;
$$;

revoke all on function public.bump_fixture_score(uuid, text, int) from public, anon;
grant execute on function public.bump_fixture_score(uuid, text, int) to authenticated;
