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
