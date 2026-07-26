# Payments setup — one-time deploy steps

Everything below only has to be done ONCE. After that, real card + Google Pay + Apple Pay + Link checkout will work end-to-end, the manager will see every order live, and can issue a refund with one click.

The Stripe **claimable sandbox** for this project has already been provisioned by the agent (`acct_1TwRcDD9voY0qukz`). Test keys are captured below; when you're ready to go live you'll claim the account via the onboarding link at the bottom of this doc — no code changes needed at that time (the platform swaps the keys automatically on deploy).

---

## 1) Run one SQL migration (30 seconds)

Open the Supabase SQL editor:
https://supabase.com/dashboard/project/neulcrpkroiyglgiywcp/sql/new

Paste + run the contents of **`/app/app/supabase/purchases-refund.sql`**. It adds the `refunded` status, `refunded_at`, `refund_amount_cents`, `refund_reason`, and `stripe_refund_id` columns to the existing `purchases` table. Safe to re-run.

---

## 2) Set Supabase edge-function secrets (2 minutes)

The edge functions need the Stripe **secret** key (and the webhook secret so `stripe-webhook` can verify Stripe's signature). Grab both from the sandbox JSON the agent saved in your pod at `/tmp/stripe_sandbox.json`:

```bash
cat /tmp/stripe_sandbox.json | python3 -m json.tool
# copy the sandbox_secret_key and preview_webhook_secret values
```

Then set them on Supabase — via the **dashboard** (easiest):

https://supabase.com/dashboard/project/neulcrpkroiyglgiywcp/settings/functions

Add two secrets (paste values from the JSON above):

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | the `sandbox_secret_key` (starts with `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | the `preview_webhook_secret` (starts with `whsec_…`) |

Or via the Supabase CLI if you prefer:

```bash
cd app
supabase login                          # opens browser — one-time
supabase link --project-ref neulcrpkroiyglgiywcp
# Paste the actual sk_test_ / whsec_ values from /tmp/stripe_sandbox.json:
supabase secrets set STRIPE_SECRET_KEY=<paste-here> STRIPE_WEBHOOK_SECRET=<paste-here>
```

> **Never commit these values to git** — GitHub's push protection blocks any `sk_test_` / `sk_live_` / `whsec_` string. They only ever live in Supabase's edge-function environment and in `.env.local` (which is git-ignored).

---

## 3) Deploy the edge functions (1 minute)

```bash
cd app
supabase functions deploy create-checkout-session
supabase functions deploy get-checkout-session
supabase functions deploy stripe-webhook   --no-verify-jwt
supabase functions deploy refund-checkout-session
supabase functions deploy send-purchase-email   # optional, for confirmation emails
```

`stripe-webhook` must be deployed with `--no-verify-jwt` (Stripe signs the webhook, not a Supabase JWT).

Then register the webhook URL with Stripe (dashboard → **Developers → Webhooks → Add endpoint**):

- URL: `https://neulcrpkroiyglgiywcp.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `charge.refunded`

---

## 4) That's it — test the flow

1. Log in as parent (`cooler74.ea@gmail.com` / `test12`), go to **Payments** → click a membership fee → click **Pay**.
2. Stripe Checkout opens with Card **and** Google Pay / Apple Pay / Link buttons (wallets show automatically when the buyer's device supports them).
3. Use test card `4242 4242 4242 4242`, any future expiry, any CVC. Or use the Google Pay button (test mode auto-approves).
4. On success, the parent lands on `/#/payment/success` and their **Purchase history** now shows the paid order.
5. Log in as manager (`manager@dublinlions.ie` / `lions2025`), go to **Payments** → scroll to **Stripe purchase history**. The order appears within 1 second (Supabase realtime). Click **Refund** — it hits Stripe, marks the row `refunded`, and the parent sees the status flip live.

---

## 5) Deploy the live site (GitHub Actions is already wired up)

The workflow at `.github/workflows/deploy.yml` reads five build-time env vars from GitHub → Settings → Secrets and variables → Actions. Add these once and every push to `main` builds + deploys automatically:

| Secret name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://neulcrpkroiyglgiywcp.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your Supabase project's anon/publishable key (Project settings → API) |
| `VITE_MANAGER_EMAILS` | `manager@dublinlions.ie` (comma-separate if you add more managers) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | the sandbox `pk_test_…` value (or `pk_live_…` after you claim the account) |
| `VITE_TURNSTILE_SITE_KEY` | optional — leave blank if you don't use Turnstile |

> Publishable keys (`pk_test_…` / `pk_live_…`, Supabase anon, Turnstile *site* key) are **safe to commit** — they're designed to run in the browser. Only the `sk_test_ / sk_live_ / whsec_` secrets stay server-side (Supabase edge functions), never in git.

## Going live

Claim the sandbox account when ready — this converts it into a real Stripe account with your KYC & bank details:

**Onboarding link:** https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVHdSY0REOXZvWTBxdWt6LDE3ODU2MzAxMzkv100PrcCIopJ

After you complete KYC and enable live mode, redeploy — the platform automatically swaps the test keys for your live keys. Google Pay in live mode requires no additional setup on your side (Stripe handles it as long as your account is verified for card payments).

## Troubleshooting

- **"Payment failed to start"** → `VITE_STRIPE_PUBLISHABLE_KEY` missing in `.env.local`, or `STRIPE_SECRET_KEY` not set on the edge function.
- **"Stripe not configured" banner in the app** → same as above.
- **Refund fails with 403** → the caller isn't a manager. Confirm the email is in `VITE_MANAGER_EMAILS` AND the `is_manager()` SQL function returns true for that email.
- **Manager doesn't see new orders live** → run `alter publication supabase_realtime add table public.purchases;` in the SQL editor (idempotent — safe if already added by `purchases-setup.sql`).
