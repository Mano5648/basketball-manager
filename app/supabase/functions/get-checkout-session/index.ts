import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { confirmStripePurchaseAndSendEmail, isStripePaymentReceived } from '../_shared/stripe-confirm.ts'
import { enforceRateLimit } from '../_shared/security.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

type PurchaseRow = {
  reference_id: string
  purchase_type: string
  customer_email: string
  amount_cents: number
  items: { name: string; quantity: number; amountCents?: number }[]
  metadata: Record<string, string> | null
}

/** Only what the payment result page shows. No email, name or metadata. */
function receipt(row: PurchaseRow) {
  return {
    reference_id: row.reference_id,
    purchase_type: row.purchase_type,
    amount_cents: row.amount_cents,
    items: (row.items ?? []).map((i) => ({ name: i.name, quantity: i.quantity, amountCents: i.amountCents ?? 0 })),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, verificationToken } = await req.json()
    if (typeof sessionId !== 'string' || typeof verificationToken !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]{1,200}$/.test(sessionId)) {
      return json({ error: 'sessionId and verificationToken required' }, 400)
    }

    // The buyer must be signed in: the session id and token travel through
    // redirect URLs (and a custom app scheme on mobile), so on their own they
    // must not be enough to read the purchase.
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: userData } = await userClient.auth.getUser()
    const buyerEmail = userData.user?.email?.toLowerCase()
    if (!userData.user || !buyerEmail) return json({ error: 'Please sign in to see this payment' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const rate = await enforceRateLimit(supabase, 'checkout-verify', userData.user.id, 30)
    if (!rate.allowed) return json({ error: rate.reason || 'Too many requests.' }, 429)

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()
    const row = purchase as PurchaseRow | null
    const storedToken = row?.metadata?.verification_token

    // One answer for "not found", "wrong token" and "someone else's purchase".
    if (purchaseError || !row || !storedToken || storedToken !== verificationToken || row.customer_email.toLowerCase() !== buyerEmail) {
      return json({ error: 'Purchase not found' }, 404)
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const { received, session, reason } = await isStripePaymentReceived(stripe, sessionId)
    let emailSent = false

    if (received && session) {
      const confirmResult = await confirmStripePurchaseAndSendEmail(supabase, stripe, sessionId)
      emailSent = confirmResult.emailSent
      if (!confirmResult.confirmed) {
        return json({ error: confirmResult.reason || 'Payment not confirmed' }, 402)
      }
    }

    return json({
      status: session?.payment_status ?? 'unpaid',
      confirmed: received,
      emailSent,
      reason: received ? undefined : reason,
      purchase: receipt(row),
    })
  } catch (err) {
    console.error('get-checkout-session failed', err)
    return json({ error: 'Lookup failed' }, 500)
  }
})
