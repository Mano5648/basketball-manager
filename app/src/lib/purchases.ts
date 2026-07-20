import { supabase, isSupabaseConfigured } from './supabase'

export type PurchaseType = 'store' | 'ticket' | 'membership'
export type PurchaseStatus = 'pending' | 'paid' | 'failed' | 'cancelled'

export interface PurchaseLineItem {
  name: string
  amountCents: number
  quantity: number
}

export interface PurchaseRecord {
  id: string
  reference_id: string
  purchase_type: PurchaseType
  customer_name: string
  customer_email: string
  player_id: string | null
  amount_cents: number
  currency: string
  items: PurchaseLineItem[]
  status: PurchaseStatus
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  metadata: Record<string, unknown>
  created_at: string
  paid_at: string | null
}

export function isPurchasesDbConfigured(): boolean {
  return isSupabaseConfigured
}

export async function fetchPurchases(limit = 100): Promise<PurchaseRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.warn('[purchases] fetch failed', error.message)
    return []
  }
  return (data ?? []) as PurchaseRecord[]
}

export async function fetchPurchaseBySession(sessionId: string): Promise<PurchaseRecord | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle()
  if (error) {
    console.warn('[purchases] session lookup failed', error.message)
    return null
  }
  return (data as PurchaseRecord) ?? null
}
