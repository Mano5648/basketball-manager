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

The edge functions need the Stripe **secret** key (and the webhook secret so `stripe-webhook` can verify Stripe's signature). Install the Supabase CLI locally if you don't have it, then from the repo root run:

```bash
cd app
supabase login                          # opens browser — one-time
supabase link --project-ref neulcrpkroiyglgiywcp
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_REDACTED... \
  STRIPE_WEBHOOK_SECRET=whsec_REDACTED...
```

(Use the full sandbox secret key — the agent has the full value; paste it in from your saved sandbox response. Same for the webhook secret.)

If you don't have the Supabase CLI, do it via the dashboard instead:
https://supabase.com/dashboard/project/neulcrpkroiyglgiywcp/settings/functions

Add two secrets:
- `STRIPE_SECRET_KEY` = the sandbox `sk_test_…` value
- `STRIPE_WEBHOOK_SECRET` = the sandbox `whsec_…` value

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

## Going live

Claim the sandbox account when ready — this converts it into a real Stripe account with your KYC & bank details:

**Onboarding link:** https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVHdSY0REOXZvWTBxdWt6LDE3ODU2MzAxMzkv100PrcCIopJ

After you complete KYC and enable live mode, redeploy — the platform automatically swaps the test keys for your live keys. Google Pay in live mode requires no additional setup on your side (Stripe handles it as long as your account is verified for card payments).

## Troubleshooting

- **"Payment failed to start"** → `VITE_STRIPE_PUBLISHABLE_KEY` missing in `.env.local`, or `STRIPE_SECRET_KEY` not set on the edge function.
- **"Stripe not configured" banner in the app** → same as above.
- **Refund fails with 403** → the caller isn't a manager. Confirm the email is in `VITE_MANAGER_EMAILS` AND the `is_manager()` SQL function returns true for that email.
- **Manager doesn't see new orders live** → run `alter publication supabase_realtime add table public.purchases;` in the SQL editor (idempotent — safe if already added by `purchases-setup.sql`).
