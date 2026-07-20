import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { confirmStripePurchaseAndSendEmail, isStripePaymentReceived } from '../_shared/stripe-confirm.ts'
import { assertHumanRequest } from '../_shared/security.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PurchaseRow = {
  reference_id: string
  purchase_type: string
  customer_name: string
  customer_email: string
  amount_cents: number
  items: { name: string; quantity: number; amountCents?: number; imageUrl?: string }[]
  metadata: Record<string, string> | null
}

function sanitizePurchase(row: PurchaseRow) {
  return {
    reference_id: row.reference_id,
    purchase_type: row.purchase_type,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    amount_cents: row.amount_cents,
    items: row.items,
    metadata: row.metadata,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, verificationToken } = await req.json()
    if (!sessionId || !verificationToken) {
      return new Response(JSON.stringify({ error: 'sessionId and verificationToken required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const humanCheck = await assertHumanRequest(supabase, {
      action: 'checkout-verify',
      identifier: sessionId,
      remoteIp,
      maxAttempts: 20,
    })
    if (!humanCheck.ok) {
      return new Response(JSON.stringify({ error: humanCheck.error }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()

    if (purchaseError || !purchase) {
      return new Response(JSON.stringify({ error: 'Purchase not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const storedToken = (purchase.metadata as Record<string, string> | null)?.verification_token
    if (!storedToken || storedToken !== verificationToken) {
      return new Response(JSON.stringify({ error: 'Invalid verification token' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const { received, session, reason } = await isStripePaymentReceived(stripe, sessionId)
    let emailSent = false

    if (received && session) {
      const confirmResult = await confirmStripePurchaseAndSendEmail(supabase, stripe, sessionId)
      emailSent = confirmResult.emailSent
      if (!confirmResult.confirmed) {
        return new Response(JSON.stringify({ error: confirmResult.reason || 'Payment not confirmed' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const row = purchase as PurchaseRow
    return new Response(
      JSON.stringify({
        status: session?.payment_status ?? 'unpaid',
        confirmed: received,
        emailSent,
        reason: received ? undefined : reason,
        purchase: sanitizePurchase(row),
        metadata: row.metadata,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Lookup failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
