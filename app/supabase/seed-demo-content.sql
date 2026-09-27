-- Demo content for store-listing screenshots: upcoming fixtures, a few results
-- and extra events. Teams are looked up by name so no ids need pasting.
--
-- Run in the Supabase SQL editor. Safe to re-run: each row is keyed on
-- (opponent, starts_at) or (title, starts_at) and skipped if already present.
--
-- To remove it all afterwards, see the DELETE statements at the bottom.

insert into public.fixtures (team_id, opponent, competition, venue, is_home, starts_at, status, tickets_enabled, adult_price_cents, kid_price_cents)
select t.id, v.opponent, v.competition, v.venue, v.is_home, v.starts_at, v.status, v.tickets, v.adult, v.kid
from (values
  ('Senior Men',    'Neptune BC',        'Dublin League',    'Colaiste Bride, Clondalkin', true,  timestamptz '2026-10-10 19:30+01', 'scheduled', true,  500, 200),
  ('Senior Women',  'Glanmire',          'Dublin League',    'Colaiste Bride, Clondalkin', true,  timestamptz '2026-10-17 18:00+01', 'scheduled', true,  500, 200),
  ('U16 Boys',      'Malahide Marlins',  'U16 Premier',      'Malahide Community School',  false, timestamptz '2026-10-24 11:00+01', 'scheduled', false,   0,   0),
  ('U14 Girls',     'Swords Thunder',    'U14 Division 1',   'Colaiste Bride, Clondalkin', true,  timestamptz '2026-10-31 10:00+00', 'scheduled', false,   0,   0),
  ('Senior Men',    'Templeogue',        'Dublin League',    'Templeogue College',         false, timestamptz '2026-11-07 20:00+00', 'scheduled', false,   0,   0),
  ('U12 Boys',      'Tallaght Tigers',   'U12 Development',  'Colaiste Bride, Clondalkin', true,  timestamptz '2026-11-14 10:30+00', 'scheduled', false,   0,   0)
) as v(team, opponent, competition, venue, is_home, starts_at, status, tickets, adult, kid)
join public.teams t on t.name = v.team
where not exists (
  select 1 from public.fixtures f where f.opponent = v.opponent and f.starts_at = v.starts_at
);

-- Past results, so the Results tab has something in it.
insert into public.fixtures (team_id, opponent, competition, venue, is_home, starts_at, status, home_score, away_score)
select t.id, v.opponent, v.competition, v.venue, v.is_home, v.starts_at, 'completed', v.hs, v.as_
from (values
  ('Senior Men',   'Killester',   'Dublin League',  'Colaiste Bride, Clondalkin', true,  timestamptz '2026-09-12 19:30+01', 78, 65),
  ('Senior Women', 'DCU Mercy',   'Dublin League',  'DCU Sports Complex',         false, timestamptz '2026-09-19 18:00+01', 61, 68),
  ('U16 Boys',     'Portmarnock', 'U16 Premier',    'Colaiste Bride, Clondalkin', true,  timestamptz '2026-09-26 11:00+01', 54, 49)
) as v(team, opponent, competition, venue, is_home, starts_at, hs, as_)
join public.teams t on t.name = v.team
where not exists (
  select 1 from public.fixtures f where f.opponent = v.opponent and f.starts_at = v.starts_at
);

insert into public.events (title, description, location, starts_at, ends_at, rsvp_enabled)
select v.title, v.description, v.location, v.starts_at, v.ends_at, true
from (values
  ('Senior squad training',
   'Weekly senior training for both squads. Bring indoor runners and a water bottle.',
   'Colaiste Bride, Clondalkin',
   timestamptz '2026-10-08 19:00+01', timestamptz '2026-10-08 21:00+01'),
  ('Halloween mini tournament',
   'All-day underage blitz across U12, U14 and U16. Families welcome, refreshments on the day.',
   'Colaiste Bride, Clondalkin',
   timestamptz '2026-10-30 09:00+00', timestamptz '2026-10-30 16:00+00'),
  ('Club AGM',
   'Annual general meeting. All members over 18 are welcome to attend and vote.',
   'Clondalkin Sports Hall',
   timestamptz '2026-11-20 19:30+00', timestamptz '2026-11-20 21:00+00')
) as v(title, description, location, starts_at, ends_at)
where not exists (
  select 1 from public.events e where e.title = v.title and e.starts_at = v.starts_at
);

-- Undo -----------------------------------------------------------------------
-- delete from public.fixtures where opponent in
--   ('Neptune BC','Glanmire','Malahide Marlins','Swords Thunder','Templeogue',
--    'Tallaght Tigers','Killester','DCU Mercy','Portmarnock')
--   and starts_at >= timestamptz '2026-09-12';
-- delete from public.events where title in
--   ('Senior squad training','Halloween mini tournament','Club AGM');
