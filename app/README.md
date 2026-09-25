# Dublin Lions BC — Club App (Android + iOS + Web)

A ClubSpot-style club app built with React + Vite + Capacitor on a Supabase backend, with Stripe payments.

| Area | Where |
| --- | --- |
| Member app (bottom tabs) | `src/pages/member/*` — News feed, Events + RSVP, Fixtures & results + match tickets, Shop + cart, Membership packages, Club Lotto, Facility booking, Team messaging, Purchases, Notifications inbox, Profile + children |
| Admin console | `src/pages/admin/*` — Dashboard, News, Events, Fixtures, Members (team assignment, make admin, remove), Teams, Memberships, Lotto (run draw), Facilities + bookings, Products, Orders & refunds, Messages, Push notifications, Reports, Settings (branding, features on/off, contact, admins) |
| Database | `supabase/00-full-setup.sql` — one paste, safe to re-run |
| Edge functions | `supabase/functions/*` — Stripe checkout / verify / webhook / refund, `send-push`, `delete-account` |
| Native shell | `capacitor.config.ts`, `android/`, `ios/` |

## 1. Supabase (10 minutes, once)

1. Create a project at https://supabase.com/dashboard (EU region recommended) or restore your existing one.
2. **SQL editor → New query → paste `supabase/00-full-setup.sql` → Run.** Creates every table, RLS policy, storage bucket, realtime publication and the `manager@dublinlions.ie` admin seed. Change that email in the first `insert into public.managers` line if your admin email is different.
3. **Authentication → URL configuration**: set *Site URL* to your web URL (e.g. `https://<user>.github.io/<repo>/`) and add these *Redirect URLs*:
   - `https://<your-web-url>/#/login`
   - `https://<your-web-url>/#/reset-password`
   - `ie.dublinlions.app://` (native deep link)
4. **Edge function secrets** (Project settings → Edge Functions → Secrets):

   | Secret | Value |
   | --- | --- |
   | `STRIPE_SECRET_KEY` | `sk_live_…` / `sk_test_…` from Stripe |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the Stripe webhook you create in step 2 below |
   | `ALLOWED_CHECKOUT_ORIGINS` | comma-separated web app URLs (origin + sub-path, no trailing slash) allowed to start a checkout, e.g. `https://<user>.github.io/<repo>` |
   | `FIREBASE_SERVICE_ACCOUNT` | (for push) the full JSON of a Firebase service-account key — see §4 |
   | `RESEND_API_KEY` | (optional) for receipt emails |

5. **Deploy functions** (Supabase CLI):

   ```bash
   cd app
   supabase login && supabase link --project-ref <your-ref>
   supabase functions deploy create-checkout-session
   supabase functions deploy get-checkout-session
   supabase functions deploy refund-checkout-session
   supabase functions deploy send-push
   supabase functions deploy delete-account
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

6. Frontend env — `app/.env.local` (never committed):

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_… or pk_test_…
   VITE_PUBLIC_SITE_URL=https://<your-web-url>      # used by the native app for Stripe return pages
   VITE_MANAGER_EMAILS=manager@dublinlions.ie        # fallback only; admins are managed in Settings
   ```

## 2. Stripe

- Dashboard → Developers → Webhooks → **Add endpoint**: `https://<ref>.supabase.co/functions/v1/stripe-webhook`, events `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- Payment methods → enable Cards, Apple Pay, Google Pay, Link. No extra code: Stripe Checkout shows wallets automatically.
- Payouts, receipts and disputes are managed in Stripe. Refunds can be issued from the app (Admin → Orders & payments) or from Stripe — both sync.

## 3. Web build (GitHub Pages)

```bash
cd app && yarn build          # outputs app/dist
rm -rf ../docs/* && cp -r dist/* ../docs/   # GitHub Pages serves /docs
```

## 4. Push notifications (Firebase)

1. https://console.firebase.google.com → Add project → add an **Android app** with package `ie.dublinlions.app` → download `google-services.json` → put it in `app/android/app/`.
2. Add an **iOS app** with bundle id `ie.dublinlions.app` → download `GoogleService-Info.plist` → add to `app/ios/App/App/` in Xcode. In Firebase → Cloud Messaging → upload your **APNs key** (from Apple Developer → Keys).
3. Project settings → Service accounts → **Generate new private key** → paste the whole JSON as the `FIREBASE_SERVICE_ACCOUNT` secret in Supabase.
4. iOS only: in Xcode enable *Push Notifications* and *Background Modes → Remote notifications* capabilities.

Admins send notifications from **Admin → Notifications** (everyone or one team). Every message also lands in the in-app inbox, even for members who declined push.

## 5. Match Day Live
Admins and team coaches (the *coach email* on a team) see a **Match control** panel on any fixture (Fixtures tab → open the game): start match, tap +1/+2/+3, set the period, post short updates, finish. Members see the LIVE badge, score and updates in real time; a team push goes out at tip-off and at the final score.

## 6. Android & iOS builds — see `MOBILE_APP_SETUP.md`.
