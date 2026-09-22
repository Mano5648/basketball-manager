// Supabase Edge Function — refund a paid purchase and mark it refunded in DB.
//
// Callable ONLY by a manager (verified via the caller's Supabase JWT and the
// `is_manager()` SQL function). The Stripe refund is triggered against the
// payment intent stored on the original checkout session; the DB row is then
// updated with `status = 'refunded'`, refund audit fields, and realtime pushes
// the change to every open player / manager tab.
//
// POST body:
//   { purchaseId: string, reason?: string }

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { reversePurchase } from '../_shared/fulfil.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return json({ error: 'STRIPE_SECRET_KEY is not configured' }, 500)
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing bearer token' }, 401)

    const body = await req.json().catch(() => ({}))
    const { purchaseId, reason } = body as { purchaseId?: string; reason?: string }
    if (!purchaseId) return json({ error: 'purchaseId is required' }, 400)

    // --- Verify caller is a manager (uses their JWT, hits `is_manager()` RPC) ---
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: managerCheck, error: managerErr } = await anonClient.rpc('is_manager')
    if (managerErr) {
      console.error('is_manager check failed', managerErr.message)
      return json({ error: 'Could not verify manager status' }, 500)
    }
    if (!managerCheck) return json({ error: 'Refunds are limited to managers' }, 403)

    // --- Load the purchase row via service-role (bypass RLS to read) ----------
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: purchase, error: loadErr } = await adminClient
      .from('purchases')
      .select('id, status, amount_cents, stripe_session_id, stripe_payment_intent, currency')
      .eq('id', purchaseId)
      .maybeSingle()
    if (loadErr || !purchase) return json({ error: 'Purchase not found' }, 404)

    if (purchase.status === 'refunded') {
      return json({ ok: true, alreadyRefunded: true }, 200)
    }
    if (purchase.status !== 'paid') {
      return json({ error: `Only paid purchases can be refunded (status: ${purchase.status})` }, 400)
    }

    // --- Resolve the Stripe payment_intent, fall back to session lookup -------
    let paymentIntentId = purchase.stripe_payment_intent as string | null
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    if (!paymentIntentId && purchase.stripe_session_id) {
      try {
        const s = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id)
        paymentIntentId = (s.payment_intent as string) ?? null
      } catch (e) {
        console.error('session retrieve failed', (e as Error).message)
      }
    }
    if (!paymentIntentId) {
      return json({ error: 'No Stripe payment_intent recorded for this purchase' }, 400)
    }

    // --- Issue the refund ------------------------------------------------------
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: reason ? { reason } : undefined,
    })

    // --- Update the DB (service role, guarded so double-clicks are safe) -----
    const { error: updateErr } = await adminClient
      .from('purchases')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_amount_cents: refund.amount ?? purchase.amount_cents,
        refund_reason: reason ?? null,
        stripe_refund_id: refund.id,
      })
      .eq('id', purchaseId)
      .eq('status', 'paid') // no-op if some other tab already flipped it

    if (updateErr) {
      console.error('purchases update failed', updateErr.message)
      return json({ error: 'Refund succeeded on Stripe but DB update failed. Contact admin.' }, 500)
    }

    const { data: full } = await adminClient.from('purchases').select('*').eq('id', purchaseId).maybeSingle()
    if (full) await reversePurchase(adminClient, full)

    return json({ ok: true, refundId: refund.id, amountCents: refund.amount }, 200)
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Refund failed'
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
