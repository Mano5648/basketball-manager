-- ============================================================================
-- Dublin Lions — Security hardening migration
-- Run in Supabase SQL Editor on projects that already ran app-data-setup.sql
-- ============================================================================

-- 1) Manager check — email allowlist only (never trust user_metadata.role)
create or replace function public.is_manager()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (array[
    'manager@dublinlions.ie'
  ]);
$$;

-- 2) Restrict app_state reads — public keys vs manager-only sensitive keys
drop policy if exists "app_state_public_read" on public.app_state;
drop policy if exists "app_state_public_read_safe" on public.app_state;
drop policy if exists "app_state_manager_read_sensitive" on public.app_state;
drop policy if exists "app_state_manager_read_all" on public.app_state;

create policy "app_state_public_read_safe"
  on public.app_state for select
  using (
    key in (
      'dlbc_fixtures',
      'dlbc_announcements',
      'dlbc_products',
      'dlbc_ticket_prices',
      'dlbc_default_ticket_price',
      'dlbc_membership_fees',
      'dlbc_ageGroups',
      'dlbc_teams',
      'dlbc_schedule',
      'dlbc_season',
      'dlbc_season_history',
      'dlbc_stripe_payment_link'
    )
  );

create policy "app_state_manager_read_sensitive"
  on public.app_state for select
  to authenticated
  using (
    public.is_manager()
    and key in (
      'dlbc_players',
      'dlbc_payments',
      'dlbc_ticket_purchases',
      'dlbc_chat_messages',
      'dlbc_chat_members',
      'dlbc_orders',
      'dlbc_pending_senior_players',
      'dlbc_pending_team_assignments'
    )
  );

create policy "app_state_manager_read_all"
  on public.app_state for select
  to authenticated
  using (public.is_manager());
