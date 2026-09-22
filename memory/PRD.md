# Dublin Lions BC — Club App (ClubSpot-style, Android + iOS + Web)

## Original problem statement (Jun 2026 rebuild)
User: "convert this into an app for android and apple similar to the Neptune BC ClubSpot app, add all
the features on that app and delete the ones we currently have, make sure everything works for a real
audience and is secure, keep the shopping feature, make sure the admin can configure everything."
Choices: all ClubSpot features (news, events, fixtures & results, memberships, lotto, push, facility
booking, messaging); Capacitor native shell; open membership (adult / parent+children / supporter).

## Architecture
- `/app/app` — Vite + React 19 + TS + Tailwind, HashRouter. Supervisor program `app_vite` (port 3000).
- Backend = Supabase project `neulcrpkroiyglgiywcp` (Postgres + RLS, Auth, Realtime, Storage bucket
  `club-media`, Deno edge functions). No Python backend.
- Payments = Stripe Checkout (claimable sandbox acct_1TwRcDD9voY0qukz, IE/EUR). Keys live only in
  Supabase secrets + `.env.local`; agent copies in `/root/.secrets/`.
- Native = Capacitor 8 (`android/`, `ios/`, `capacitor.config.ts`, appId `ie.dublinlions.app`).
  Requires Node ≥22 for the Capacitor CLI (`/opt/node22/bin` in this pod).
- Docs: `app/README.md` (Supabase/Stripe/Firebase setup), `app/MOBILE_APP_SETUP.md` (store publishing).

## Data model (supabase/00-full-setup.sql — one paste, idempotent; APPLIED to prod 2026-06)
managers (admin emails; `is_manager()` reads it) · profiles (auto-created by trigger; member_type) ·
teams · children · team_members · `my_team_ids()` · club_settings (singleton: branding, features json,
contact, lotto rules) · news_posts · events + event_rsvps · fixtures (scores, ticket prices) ·
membership_packages + memberships · lotto_draws + lotto_tickets + `run_lotto_draw()` · facilities +
facility_bookings (GiST no-overlap) · products · orders · notifications + notification_reads ·
push_tokens · purchases (Stripe ledger; types store/ticket/membership/lotto/booking) · chat_messages
(team_id = team uuid or 'club'; SELECT scoped to own teams). Realtime on all app tables.
`admin_stats()` for the dashboard. Storage policies: admins write, members write `avatars/`.

## Edge functions (all DEPLOYED)
create-checkout-session (JWT-required; server-side pricing in `_shared/catalog.ts`) ·
get-checkout-session (verify + fulfil) · stripe-webhook (completed / expired / charge.refunded) ·
refund-checkout-session (admin; reverses domain rows) · send-push (admin; inbox row + FCM v1 via
`FIREBASE_SERVICE_ACCOUNT`) · delete-account (self or admin; GDPR). `_shared/fulfil.ts` applies /
reverses / abandons purchases (order paid + stock decrement, membership row, lotto lines paid,
booking confirmed).
Secrets set: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ALLOWED_CHECKOUT_ORIGINS (preview + localhost).
Stripe webhook endpoint we_1UITIND9voY0qukzJEdnFCgW → supabase stripe-webhook.

## Frontend map
- `src/lib`: supabase.ts, db.ts (types + helpers), useLiveQuery.ts (fetch + realtime refresh),
  AuthContext.tsx (role from `managers`), ClubContext.tsx (settings/teams/children/myTeamIds),
  chat.ts, stripeCheckout.ts, native.ts (Capacitor: push, in-app browser, deep links), format.ts.
- `src/components`: ui.tsx primitives, AdminCrud.tsx (schema-driven CRUD), AppShell (bottom tabs),
  AdminShell (sidebar/drawer), ErrorBoundary.
- Member `/#/app/*`: HomeFeed, NewsDetail, Events(+RSVP), Fixtures(+tickets), Shop(+Cart),
  Membership, Lotto, Bookings, Messages/ChatThread, Orders, Inbox, Profile(+children, delete acct), More.
- Admin `/#/admin/*`: Dashboard, News, Events, Fixtures, Members (team assignment, make admin,
  remove), Teams, Memberships, Lotto (run draw), Facilities(+bookings), Products, Orders & payments
  (fulfil, refund), Messages, Notifications, Reports, Settings (branding colour → CSS vars, features
  on/off, contact, admins).

## Verified (iteration_19 + self-test 2026-06)
Testing agent ~95% pass across all member + admin flows. Self-tested full Stripe payment with test
card → payment/success → order PAID, stock 100→99 → admin refund → order refunded. Membership checkout
session creation OK. Fixed after test: notification_reads added to realtime (badge decrement),
supporter packages visible to all, pending orders hidden from member purchases, GH-Pages sub-path
origin bug in checkout/redirect URLs, login redirect waited for role.

## Known / user actions
- Register: Supabase rejects obviously fake domains (example.com) — real emails work. Email
  confirmation depends on Supabase Auth settings.
- Push: needs Firebase project + `FIREBASE_SERVICE_ACCOUNT` secret (README §4). Inbox works regardless.
- Stripe sandbox is unclaimed (no real money) — user must claim via Emergent Payments tab / onboarding link.
- Web deploy: `/app/docs` rebuilt with new app (base './'). Set `VITE_PUBLIC_SITE_URL` + add the pages
  URL (origin + sub-path) to `ALLOWED_CHECKOUT_ORIGINS`, then rebuild.
- Native builds require Android Studio / Xcode on the user's machine (MOBILE_APP_SETUP.md).

## Backlog
- P1: Firebase push setup once user provides service account; app icons/splash via @capacitor/assets.
- P1: Receipt emails (RESEND_API_KEY) — function exists in `_shared/purchase-email.ts`.
- P2: Instalment / recurring membership plans (Stripe subscriptions); membership expiry reminders.
- P2: Product images for seeded products; richer match reports; event attendance export (CSV).
- P2: Old `app_state` rows in Supabase can be dropped (legacy, unused).
