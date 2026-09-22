import { supabase, isSupabaseConfigured } from './supabase'
import { hashReturnPath } from './routing'
import { openExternal, publicSiteOrigin } from './native'

export type PurchaseType = 'store' | 'ticket' | 'membership' | 'lotto' | 'booking'

export interface StartCheckoutInput {
  purchaseType: PurchaseType
  referenceId: string
  customerName: string
  customerEmail: string
  metadata?: Record<string, string>
}

export function isStripeCheckoutConfigured(): boolean {
  return isSupabaseConfigured && Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
}

/** Creates a Stripe Checkout session (server-priced) and opens it. */
export async function startCheckout(input: StartCheckoutInput): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      ...input,
      origin: publicSiteOrigin(),
      successPath: hashReturnPath('/payment/success'),
      cancelPath: hashReturnPath('/payment/cancel'),
    },
  })
  if (error) throw new Error(error.message || 'Could not start checkout')
  if (!data?.url) throw new Error(data?.error || 'Checkout URL was not returned')
  await openExternal(data.url as string)
}

export interface VerifiedCheckout {
  status: string
  confirmed?: boolean
  reason?: string
  purchase: { reference_id: string; purchase_type: string; amount_cents: number; items: { name: string; quantity: number; amountCents: number }[] } | null
}

export async function verifyCheckout(sessionId: string, verificationToken: string): Promise<VerifiedCheckout> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke('get-checkout-session', { body: { sessionId, verificationToken } })
  if (error) throw new Error(error.message || 'Could not verify payment')
  const verified = data as VerifiedCheckout
  if (!verified.confirmed || verified.status !== 'paid') throw new Error(verified.reason || 'Payment has not been received yet.')
  return verified
}

export async function refundPurchase(purchaseId: string, reason?: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke('refund-checkout-session', { body: { purchaseId, reason } })
  if (error) throw new Error(error.message || 'Could not issue refund')
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
}
