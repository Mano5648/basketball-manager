# Live deployment checklist — Dublin Lions BC

Use this before opening the site to members. The app is a **static Vite build** with **HashRouter** (`/#/player/login`) and **Supabase** backend.

## 1. Build-time environment (`.env.local` or CI secrets)

These are baked into the JS bundle at `npm run build`:

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Publishable anon key |
| `VITE_MANAGER_EMAILS` | Yes | Comma-separated manager emails |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Yes (live) | Use `pk_live_…` in production |
| `VITE_TURNSTILE_SITE_KEY` | Recommended | Cloudflare Turnstile site key |

Copy `.env.example` → `.env.local` and fill in real values before building.

## 2. Supabase SQL (run once in SQL Editor)

Run in this order:

1. `supabase/app-data-setup.sql`
2. `supabase/purchases-setup.sql`
3. `supabase/security-setup.sql`
4. `supabase/security-hardening.sql`

Update manager email in `is_manager()` to match `VITE_MANAGER_EMAILS`.

## 3. Supabase Auth → URL configuration

Add **Redirect URLs** (hash routes required):

```
https://YOUR-DOMAIN/basketball-manager/#/reset-password
http://localhost:3000/basketball-manager/#/reset-password
```

**Site URL** can be: `https://YOUR-DOMAIN/basketball-manager/`

Enable email confirmation for sign-ups if you want verified accounts.

## 4. Edge functions — deploy & secrets

Deploy from `app/`:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy get-checkout-session
supabase functions deploy send-purchase-email
supabase functions deploy stripe-webhook
```

**Secrets** (Dashboard → Edge Functions → Secrets):

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | `sk_live_…` in production |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook endpoint |
| `RESEND_API_KEY` | Confirmation emails |
| `PURCHASE_FROM_EMAIL` | e.g. `Dublin Lions BC <orders@yourdomain.com>` |
| `SITE_URL` | `https://YOUR-DOMAIN/basketball-manager` |
| `ALLOWED_CHECKOUT_ORIGINS` | Same URL (+ localhost for testing) |
| `TURNSTILE_SECRET_KEY` | Required in production |
| `ENVIRONMENT` | Set to `production` |

Do **not** set `ALLOW_DEMO_PURCHASE_EMAIL` in production.

## 5. Stripe (live mode)

1. Switch to **Live mode** in Stripe Dashboard
2. Webhook endpoint → your `stripe-webhook` function URL
3. Events: `checkout.session.completed` (minimum)
4. Add live publishable key to build env
5. Stripe **Checkout redirect domains** must include your site origin

Success return URL format:  
`https://YOUR-DOMAIN/basketball-manager/#/payment/success?session_id={CHECKOUT_SESSION_ID}&vt=…`

## 6. Build & deploy frontend

```bash
cd app
npm ci
npm run build
```

Output: `dist/` — deploy to GitHub Pages or your host under `/basketball-manager/`.

**Important:** `public/404.html` redirects deep links (e.g. `/player/login`) to hash routes.

Member URLs to share:

- Home: `https://YOUR-DOMAIN/basketball-manager/`
- Player login: `https://YOUR-DOMAIN/basketball-manager/#/player/login`
- Manager login: `https://YOUR-DOMAIN/basketball-manager/#/manager/login`

## 7. Pre-launch smoke test

- [ ] Player sign-up + email confirmation (if enabled)
- [ ] Player sign-in → dashboard loads
- [ ] Forgot password → email → reset at `/#/reset-password`
- [ ] Store checkout → Stripe → success page with `session_id` + `vt`
- [ ] Ticket purchase on homepage
- [ ] Membership payment in player dashboard
- [ ] Manager login with allowlisted email only
- [ ] Turnstile appears on sign-up / checkout forms

## 8. Node version

Use **Node 20+** for local dev and CI (`vite` requires Node 20.19+ or 22.12+).
