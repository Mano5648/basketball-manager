import { supabase, isSupabaseConfigured } from './supabase'
import { hashReturnPath } from './routing'

export type StripeLineItem = { name: string; amountCents: number; quantity: number; imageUrl?: string }

export interface StartCheckoutInput {
  purchaseType: 'store' | 'ticket' | 'membership'
  referenceId: string
  customerName: string
  customerEmail: string
  playerId?: string
  lineItems: StripeLineItem[]
  metadata?: Record<string, string>
  successPath?: string
  cancelPath?: string
  turnstileToken?: string
}

export function isStripeCheckoutConfigured(): boolean {
  return isSupabaseConfigured && Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
}

export async function startStripeCheckout(input: StartCheckoutInput): Promise<{ url: string; sessionId: string }> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local')
  }

  const origin = window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      ...input,
      origin,
      successPath: input.successPath ?? hashReturnPath('/payment/success'),
      cancelPath: input.cancelPath ?? hashReturnPath('/payment/cancel'),
    },
  })

  if (error) throw new Error(error.message || 'Could not start Stripe checkout')
  if (!data?.url) throw new Error(data?.error || 'Stripe checkout URL was not returned')

  return { url: data.url as string, sessionId: data.sessionId as string }
}

export interface VerifiedCheckout {
  status: string
  confirmed?: boolean
  emailSent?: boolean
  reason?: string
  purchase: {
    reference_id: string
    purchase_type: string
    customer_name: string
    customer_email: string
    amount_cents: number
    items: StripeLineItem[]
    metadata?: Record<string, string>
  } | null
  metadata?: Record<string, string>
}

export async function redirectToStripeCheckout(input: StartCheckoutInput): Promise<boolean> {
  if (!isStripeCheckoutConfigured()) return false
  const { url } = await startStripeCheckout(input)
  window.location.href = url
  return true
}

export async function verifyStripeCheckout(sessionId: string, verificationToken: string): Promise<VerifiedCheckout> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!verificationToken) throw new Error('Missing payment verification token')

  const { data, error } = await supabase.functions.invoke('get-checkout-session', {
    body: { sessionId, verificationToken },
  })

  if (error) throw new Error(error.message || 'Could not verify payment')
  const verified = data as VerifiedCheckout
  if (!verified.confirmed || verified.status !== 'paid') {
    throw new Error(verified.reason || 'Payment has not been received from Stripe yet.')
  }
  return verified
}
