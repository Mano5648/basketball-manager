-- Let anyone browse club content without an account.
--
-- Only public-facing club information opens up. Anything belonging to a
-- person — profiles, children, team sheets, RSVPs, memberships, lotto
-- tickets, bookings, orders, purchases, push tokens, notification reads —
-- keeps its owner-scoped policy and is untouched here.
--
-- Note the trade-off: the anon key ships inside the app, so everything opened
-- below should be treated as published on the internet.

-- Club structure and fixtures ------------------------------------------------
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select using (true);

drop policy if exists events_select on public.events;
create policy events_select on public.events for select using (true);

drop policy if exists fixtures_select on public.fixtures;
create policy fixtures_select on public.fixtures for select using (true);

drop policy if exists fixture_updates_select on public.fixture_updates;
create policy fixture_updates_select on public.fixture_updates for select using (true);

-- Published news only; drafts stay with managers.
drop policy if exists news_select on public.news_posts;
create policy news_select on public.news_posts for select
  using (published or public.is_manager());

-- What the club offers -------------------------------------------------------
drop policy if exists packages_select on public.membership_packages;
create policy packages_select on public.membership_packages for select
  using (active or public.is_manager());

drop policy if exists facilities_select on public.facilities;
create policy facilities_select on public.facilities for select
  using (active or public.is_manager());

drop policy if exists draws_select on public.lotto_draws;
create policy draws_select on public.lotto_draws for select using (true);

-- Club-wide announcements are readable by anyone; team-targeted ones still
-- require being on that team.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select
  using (target = 'all' or public.is_manager() or team_id in (select public.my_team_ids()));

-- products, sponsors and club_settings were already readable without a session.
