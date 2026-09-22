# Test Credentials — Dublin Lions club app (Supabase-backed)

Supabase project: https://neulcrpkroiyglgiywcp.supabase.co (ref neulcrpkroiyglgiywcp, eu-west-1)
Env in `/app/app/.env.local` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_PUBLISHABLE_KEY, VITE_PUBLIC_SITE_URL, VITE_MANAGER_EMAILS).
App runs via supervisor program `app_vite` (Vite dev server, /app/app) on port 3000.
Preview URL: https://d179de61-d1e5-45f8-b7ca-b5b38f669e9b.preview.emergentagent.com

## Accounts (single login page /#/login — role decided server-side via `managers` table)
- Admin/manager: manager@dublinlions.ie / lions2025  → lands on /#/admin
- Member (parent): cooler74.ea@gmail.com / test12  → lands on /#/app
- New members: /#/register (adult player / parent / supporter). Email confirmation may be required depending on Supabase auth settings.

## Secrets (agent-only, NOT in git)
- Supabase personal access token: /root/.secrets/supabase_pat
- Stripe sandbox keys + webhook secret: /root/.secrets/stripe_sandbox.json (acct_1TwRcDD9voY0qukz, IE, EUR)
- Stripe test card: 4242 4242 4242 4242, any future expiry, any CVC.

## Notes
- HashRouter. Member routes /#/app/*, admin routes /#/admin/*.
- Edge functions deployed: create-checkout-session, get-checkout-session, refund-checkout-session, send-push, delete-account, stripe-webhook (no-verify-jwt).
- Push (FCM) not configured: send-push saves inbox notifications and reports pushSkipped.
