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
