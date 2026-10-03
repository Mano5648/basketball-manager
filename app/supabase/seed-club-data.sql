-- Club baseline for the new project: settings, teams, shop products and the
-- welcome post. Idempotent — safe to re-run.
--
-- Run this first, then seed-demo-content.sql for fixtures and events.

update public.club_settings set
  club_name     = 'Dublin Lions',
  tagline       = 'Official club app',
  contact_email = 'manager@dublinlions.ie',
  currency      = coalesce(currency, 'eur'),
  privacy_url   = 'https://mano5648.github.io/basketball-manager/',
  features      = '{"news":true,"events":true,"fixtures":true,"shop":true,
                    "membership":true,"lotto":true,"booking":true,"sponsors":true}'::jsonb,
  updated_at    = now()
where id = 1;

insert into public.teams (name, age_group, sort_order)
select v.name, v.age_group, v.sort_order
from (values
  ('U12 Boys',     'U12',    1),
  ('U14 Girls',    'U14',    2),
  ('U16 Boys',     'U16',    3),
  ('Senior Men',   'Senior', 4),
  ('Senior Women', 'Senior', 5)
) as v(name, age_group, sort_order)
where not exists (select 1 from public.teams t where t.name = v.name);

insert into public.products (name, description, category, price_cents, active, sort_order)
select v.name, v.description, v.category, v.price_cents, true, v.sort_order
from (values
  ('Lions home jersey', 'Official home playing jersey.',            'Kit',         4500, 1),
  ('Lions hoodie',      'Club hoodie in black with the crest.',     'Leisure',     5500, 2),
  ('Club water bottle', 'Reusable 750ml bottle with the crest.',    'Accessories', 1200, 3)
) as v(name, description, category, price_cents, sort_order)
where not exists (select 1 from public.products p where p.name = v.name);

insert into public.news_posts (title, body, published, pinned)
select
  'Welcome to the new Dublin Lions app',
  'This is your new home for everything Dublin Lions: club news, events, '
  || 'fixtures and results, the club shop, memberships and the club lotto. '
  || 'Register your details, add your children under Profile, and the club '
  || 'will assign them to their team.',
  true, true
where not exists (
  select 1 from public.news_posts n where n.title = 'Welcome to the new Dublin Lions app'
);
