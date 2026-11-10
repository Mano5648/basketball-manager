import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { assertHumanRequest } from '../_shared/security.ts'
import { validateCheckoutPricing } from '../_shared/catalog.ts'
import { resolveCheckoutOrigin } from '../_shared/origin.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const {
      purchaseType,
      referenceId,
      customerName,
      metadata = {},
      successPath = '/#/payment/success',
      cancelPath = '/#/payment/cancel',
      origin,
      turnstileToken,
    } = body as {
      purchaseType: 'store' | 'ticket' | 'membership' | 'lotto' | 'booking'
      referenceId: string
      customerName: string
      metadata?: Record<string, string>
      successPath?: string
      cancelPath?: string
      origin: string
      turnstileToken?: string
    }

    // Caller must be a signed-in member — the email is taken from the verified JWT, never the body.
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await userClient.auth.getUser()
    const customerEmail = userData.user?.email?.toLowerCase()
    if (!customerEmail) {
      return new Response(JSON.stringify({ error: 'Please sign in to pay' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const playerId: string = userData.user!.id

    // Return paths are appended to the allowlisted origin, so they must be plain
    // relative app paths: a value like '.evil.example/' or '@evil.example/' would
    // otherwise change the redirect host.
    const SAFE_PATH = /^\/(#\/)?[A-Za-z0-9/_-]*$/
    if (!SAFE_PATH.test(successPath) || !SAFE_PATH.test(cancelPath)) {
      return new Response(JSON.stringify({ error: 'Invalid return path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!purchaseType || !referenceId || !origin) {
      return new Response(JSON.stringify({ error: 'Missing required checkout fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const siteOrigin = resolveCheckoutOrigin(origin)
    if (!siteOrigin) {
      return new Response(JSON.stringify({ error: 'Checkout origin is not allowed' }), {
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
      action: 'checkout',
      identifier: customerEmail,
      turnstileToken,
      remoteIp,
      maxAttempts: 10,
    })
    if (!humanCheck.ok) {
      return new Response(JSON.stringify({ error: humanCheck.error }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const validated = await validateCheckoutPricing(supabase, {
      purchaseType,
      referenceId,
      customerEmail,
      profileId: playerId,
      metadata,
    })
    if (!validated.ok) {
      return new Response(JSON.stringify({ error: validated.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { lineItems: pricedItems, totalCents, metadata: serverMetadata } = validated.checkout
    const verificationToken = crypto.randomUUID()
    const purchaseMetadata = {
      ...serverMetadata,
      verification_token: verificationToken,
    }

    // Store orders: claim the order and take its stock in one transaction, so a
    // double click can't open two sessions and two buyers can't both get the
    // last item. Released again below if checkout can't be started.
    const reservesStock = purchaseType === 'store'
    if (reservesStock) {
      const { error: claimError } = await supabase.rpc('claim_order_checkout', { p_order_id: referenceId })
      if (claimError) {
        // P0001 is our own RAISE in claim_order_checkout, written for members;
        // anything else is an internal database error and stays in the logs.
        if (claimError.code !== 'P0001') console.error('claim_order_checkout failed', claimError.message)
        const message = claimError.code === 'P0001' ? claimError.message : 'Could not start checkout. Please try again.'
        return new Response(JSON.stringify({ error: message }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
    const releaseStock = async () => {
      if (reservesStock) await supabase.rpc('release_order_checkout', { p_order_id: referenceId })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: customerEmail,
        // Reserved stock comes back on checkout.session.expired, so don't hold
        // it for Stripe's default 24 hours. 30 minutes is Stripe's minimum.
        ...(reservesStock ? { expires_at: Math.floor(Date.now() / 1000) + 31 * 60 } : {}),
        // `payment_method_types` intentionally omitted → Stripe Checkout picks the
        // full set enabled on this account (card, Google Pay, Apple Pay, Link, etc.).
        // Google Pay is a wallet on top of "card", so it appears automatically when
        // the buyer's device supports it and the Checkout is served from Stripe's
        // domain (no domain verification needed for Checkout-hosted flow).
        payment_method_options: {
          card: { request_three_d_secure: 'automatic' },
        },
        line_items: pricedItems.map((item) => ({
          price_data: {
            currency: 'eur',
            unit_amount: item.amountCents,
            product_data: { name: item.name },
          },
          quantity: item.quantity,
        })),
        success_url: `${siteOrigin}${successPath}?session_id={CHECKOUT_SESSION_ID}&vt=${verificationToken}`,
        cancel_url: `${siteOrigin}${cancelPath}?reference_id=${encodeURIComponent(referenceId)}`,
        metadata: {
          reference_id: referenceId,
          purchase_type: purchaseType,
          customer_name: customerName || customerEmail,
          player_id: playerId ?? '',
          verification_token: verificationToken,
        },
      })
    } catch (e) {
      await releaseStock()
      throw e
    }

    const { error: insertError } = await supabase.from('purchases').insert({
      reference_id: referenceId,
      purchase_type: purchaseType,
      customer_name: customerName || customerEmail,
      customer_email: customerEmail,
      player_id: playerId ?? null,
      amount_cents: totalCents,
      items: pricedItems,
      status: 'pending',
      stripe_session_id: session.id,
      metadata: purchaseMetadata,
    })

    if (insertError) {
      console.error('purchases insert failed', insertError.message)
      await stripe.checkout.sessions.expire(session.id).catch(() => {})
      await releaseStock()
      return new Response(JSON.stringify({ error: 'Could not create purchase record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Checkout failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
