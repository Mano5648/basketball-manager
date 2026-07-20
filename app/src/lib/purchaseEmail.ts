import { supabase, isSupabaseConfigured } from './supabase'

export interface PurchaseEmailItem {
  name: string
  quantity: number
  amountCents?: number
  imageUrl?: string
}

export interface PurchaseEmailInput {
  customerName: string
  customerEmail: string
  purchaseType: 'store' | 'ticket' | 'membership'
  referenceId: string
  amountCents: number
  items: PurchaseEmailItem[]
  planLabel?: string
}

/** Demo checkout only — Stripe payments verify with Stripe before emailing. */
export async function sendPurchaseConfirmationEmail(input: PurchaseEmailInput): Promise<void> {
  if (!supabase || !isSupabaseConfigured || !input.customerEmail) return

  try {
    await supabase.functions.invoke('send-purchase-email', {
      body: { ...input, paymentSource: 'demo' as const },
    })
  } catch (err) {
    console.warn('[purchase-email] failed to send', err)
  }
}

/** Stripe return URL — only emails after the edge function re-checks payment with Stripe. */
export async function sendStripePurchaseConfirmationEmail(stripeSessionId: string): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false

  try {
    const { data, error } = await supabase.functions.invoke('send-purchase-email', {
      body: { stripeSessionId },
    })
    if (error) return false
    return Boolean(data?.emailSent)
  } catch (err) {
    console.warn('[purchase-email] stripe confirmation failed', err)
    return false
  }
}
