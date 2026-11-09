import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { sendPurchaseEmail } from './purchase-email.ts'
import { fulfilPurchase } from './fulfil.ts'

export interface StripeConfirmResult {
  confirmed: boolean
  emailSent: boolean
  reason?: string
}

type PurchaseRow = {
  id: string
  reference_id: string
  purchase_type: 'store' | 'ticket' | 'membership'
  customer_name: string
  customer_email: string
  amount_cents: number
  items: { name: string; quantity: number; amountCents?: number; imageUrl?: string }[]
  metadata: Record<string, string> | null
  status: string
  paid_at: string | null
  confirmation_email_sent_at: string | null
}

/** Re-fetch the session from Stripe and only proceed when payment is fully received. */
export async function isStripePaymentReceived(stripe: Stripe, sessionId: string): Promise<{
  received: boolean
  session?: Stripe.Checkout.Session
  reason?: string
}> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })

  if (session.status !== 'complete') {
    return { received: false, session, reason: `Checkout session status is ${session.status}` }
  }

  if (session.payment_status !== 'paid') {
    return { received: false, session, reason: `Payment status is ${session.payment_status}` }
  }

  const paymentIntent = session.payment_intent
  if (paymentIntent && typeof paymentIntent === 'object') {
    if (paymentIntent.status !== 'succeeded') {
      return { received: false, session, reason: `Payment intent status is ${paymentIntent.status}` }
    }
  }

  return { received: true, session }
}

export async function confirmStripePurchaseAndSendEmail(
  supabase: SupabaseClient,
  stripe: Stripe,
  sessionId: string,
): Promise<StripeConfirmResult> {
  const { received, session, reason } = await isStripePaymentReceived(stripe, sessionId)
  if (!received || !session) {
    return { confirmed: false, emailSent: false, reason }
  }

  const stripeAmountTotal = session.amount_total
  if (typeof stripeAmountTotal === 'number' && stripeAmountTotal > 0) {
    const { data: purchaseBeforeUpdate } = await supabase
      .from('purchases')
      .select('amount_cents')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()

    if (purchaseBeforeUpdate && purchaseBeforeUpdate.amount_cents !== stripeAmountTotal) {
      return {
        confirmed: false,
        emailSent: false,
        reason: `Paid amount (${stripeAmountTotal}) does not match expected total (${purchaseBeforeUpdate.amount_cents})`,
      }
    }
  }

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle()

  if (fetchError || !purchase) {
    return { confirmed: false, emailSent: false, reason: 'Purchase record not found' }
  }

  const row = purchase as PurchaseRow
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null

  if (row.status === 'refunded' || row.status === 'refunding' || row.status === 'cancelled') {
    return { confirmed: false, emailSent: false, reason: `Purchase is ${row.status}` }
  }

  // Guarded on the current status so a late or retried confirmation can never
  // flip a refunded purchase back to paid.
  const { error: updateError } = await supabase
    .from('purchases')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent: paymentIntentId,
    })
    .eq('stripe_session_id', sessionId)
    .in('status', ['pending', 'failed'])

  if (updateError) {
    console.error('Failed to mark purchase paid', updateError.message)
    return { confirmed: false, emailSent: false, reason: updateError.message }
  }

  try {
    await fulfilPurchase(supabase, row)
  } catch (e) {
    console.error('fulfilment failed', (e as Error).message)
  }

  // Claim the email before sending it. The webhook and the in-app confirmation
  // often arrive together; only the call whose update matches a row sends.
  const claimedAt = new Date().toISOString()
  const { data: claimed } = await supabase
    .from('purchases')
    .update({ confirmation_email_sent_at: claimedAt })
    .eq('stripe_session_id', sessionId)
    .is('confirmation_email_sent_at', null)
    .select('id')
  if (!claimed?.length) {
    return { confirmed: true, emailSent: false, reason: 'Confirmation email already sent' }
  }

  const items = Array.isArray(row.items) ? row.items : []
  // A thrown send (network error) must still release the claim below, or this
  // purchase would never get its email.
  const emailResult = await sendPurchaseEmail({
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    purchaseType: row.purchase_type,
    referenceId: row.reference_id,
    amountCents: row.amount_cents,
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      amountCents: item.amountCents,
      imageUrl: item.imageUrl,
    })),
    planLabel: row.metadata?.plan_label,
  }).catch((e: unknown) => ({ sent: false, skipped: false, error: e instanceof Error ? e.message : 'Email send failed' }))

  if (!emailResult.sent) {
    // Release the claim so the next confirmation can try again.
    await supabase
      .from('purchases')
      .update({ confirmation_email_sent_at: null })
      .eq('stripe_session_id', sessionId)
      .eq('confirmation_email_sent_at', claimedAt)
  }

  return {
    confirmed: true,
    emailSent: emailResult.sent,
    reason: emailResult.skipped ? 'Email service not configured' : emailResult.error,
  }
}
