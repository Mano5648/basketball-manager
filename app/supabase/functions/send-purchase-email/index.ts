import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { sendPurchaseEmail, type PurchaseEmailPayload } from '../_shared/purchase-email.ts'
import { confirmStripePurchaseAndSendEmail } from '../_shared/stripe-confirm.ts'
import { assertHumanRequest } from '../_shared/security.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EmailRequest = PurchaseEmailPayload & {
  paymentSource?: 'demo'
  stripeSessionId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as EmailRequest

    if (body.stripeSessionId) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const result = await confirmStripePurchaseAndSendEmail(supabase, stripe, body.stripeSessionId)
      return new Response(JSON.stringify(result), {
        status: result.confirmed ? 200 : 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.paymentSource !== 'demo') {
      return new Response(JSON.stringify({ error: 'Stripe payment must be verified before sending confirmation email' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const allowDemo = Deno.env.get('ALLOW_DEMO_PURCHASE_EMAIL') === 'true'
    if (!allowDemo) {
      return new Response(JSON.stringify({ error: 'Demo purchase emails are disabled' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const humanCheck = await assertHumanRequest(supabase, {
      action: 'demo-email',
      identifier: body.customerEmail,
      remoteIp,
      maxAttempts: 5,
    })
    if (!humanCheck.ok) {
      return new Response(JSON.stringify({ error: humanCheck.error }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!body.customerEmail || !body.referenceId) {
      return new Response(JSON.stringify({ error: 'Missing email fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await sendPurchaseEmail(body)
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Email failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
