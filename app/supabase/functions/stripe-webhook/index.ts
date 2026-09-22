import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { confirmStripePurchaseAndSendEmail } from '../_shared/stripe-confirm.ts'
import { abandonPurchase, reversePurchase } from '../_shared/fulfil.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const result = await confirmStripePurchaseAndSendEmail(supabase, stripe, session.id)
    if (!result.confirmed) {
      console.warn('Stripe payment not confirmed yet for session', session.id, result.reason)
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const { data: row } = await supabase.from('purchases').select('*').eq('stripe_session_id', session.id).maybeSingle()
    await supabase.from('purchases').update({ status: 'cancelled' }).eq('stripe_session_id', session.id).eq('status', 'pending')
    if (row) await abandonPurchase(supabase, row)
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
    if (pi) {
      const { data: row } = await supabase.from('purchases').select('*').eq('stripe_payment_intent', pi).maybeSingle()
      if (row && row.status === 'paid') {
        await supabase.from('purchases').update({ status: 'refunded', refunded_at: new Date().toISOString(), refund_reason: 'Refunded in Stripe dashboard' }).eq('id', row.id)
        await reversePurchase(supabase, row)
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
