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
  Requires Node ≥22 for the Capacitor CLI (`/root/tools/node22/bin` in this pod).
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

## Added 2026-06 (round 2)
- **Match Day Live** (`supabase/match-day-live.sql` APPLIED; `src/pages/member/MatchLive.tsx`): fixtures
  status 'live' + `period`; `fixture_updates` table; `is_team_coach()`; coaches can UPDATE their team's
  fixtures; MatchControl panel (start, +1/+2/+3, period, updates, finish) for admin/coach; LiveUpdates
  timeline; team push at tip-off/final (send-push now allows team coach for target='team'). Verified
  realtime member update in a second browser context.
- **Icons & splash**: user's Lions crest → `resources/` (white background removed) → `@capacitor/assets`
  generated Android adaptive icons, iOS AppIcon, splash screens, PWA `public/icons` + `manifest.webmanifest`.
  Header logo `public/logo-lions-emblem.png` replaced; `club_settings.primary_color` set to #E63229 (red).
- User declined membership reminders. Push still needs Firebase (explained: native push must go via
  FCM/APNs; Supabase only triggers it). Node 22 + supabase CLI now at `/root/tools/node22/bin`.

## Added 2026-06 (round 3)
- Logo: original crest used untouched everywhere (white bg kept; icon/splash white bg; header/auth show it
  in a white rounded tile). Palette re-themed to crest colours: black surfaces (#0A0A0C/#161618), brand red
  #E00000 (`club_settings.primary_color`), gold accent `warn` #FEBD15. PWA icons in `public/icons` + manifest.
- **Sponsors** (`supabase/sponsors-setup.sql` APPLIED): table + admin CRUD (/admin/sponsors) + member
  home strip + /app/sponsors page; feature flag `sponsors`.
- **Nothing static**: club_settings gained about_text, privacy_text, welcome_title, register_title,
  sponsors_title, home_greeting ({name}); all editable in Admin → Settings → App text.
- **Team messaging removed** (UI + routes + feature flag; `chat_messages` table left in DB, unused).
- **Coach picker**: Teams admin selects coach from members list (coach_name auto-filled).
- AdminCrud: number fields omit empty values unless `nullable` (fixed sponsor save failure); error text
  now shows PostgREST message.
- **Firebase push CONFIGURED**: project `dublin-lions`; service account → Supabase secret
  FIREBASE_SERVICE_ACCOUNT (copy in /root/.secrets/firebase-service-account.json), FCM v1 auth verified;
  google-services.json + GoogleService-Info.plist placed in native projects (git-ignored; copies in
  /root/.secrets). AppDelegate.swift has Firebase/APNs forwarding guarded by #if canImport. Remaining
  user steps: add firebase-ios-sdk SPM package in Xcode + APNs key (needs Apple Developer account).

## Added 2026-06 (round 4) — security audit
- security_audit_agent run: CONDITIONAL PASS → all findings fixed in `supabase/security-hardening.sql`
  (APPLIED): bookings/RSVP SELECT now own-or-admin; anonymous `facility_busy_slots` view + `event_rsvp_counts()`
  for the UI; dropped open `purchases_public_insert` (only service-role edge fn inserts); lotto draw uses
  gen_random_bytes with rejection sampling; dropped legacy tables chat_messages, app_state, site_images.
  Left as-is (accepted): wildcard CORS on edge functions (bearer-JWT auth, no cookies); coach_email visible
  to members (needed to identify coach; staff contact).
- Removed: sort_order field from Teams & Sponsors forms; logo + brand colour from Settings (fixed to crest).

- Team roster view inside Admin → Teams (tap a team): adults, children + parent contact, coach.

## Backlog
- P1: Firebase push setup once user provides service account; app icons/splash via @capacitor/assets.
- P1: Receipt emails (RESEND_API_KEY) — function exists in `_shared/purchase-email.ts`.
- P2: Instalment / recurring membership plans (Stripe subscriptions); membership expiry reminders.
- P2: Product images for seeded products; richer match reports; event attendance export (CSV).
- P2: Old `app_state` rows in Supabase can be dropped (legacy, unused).
