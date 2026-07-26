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
