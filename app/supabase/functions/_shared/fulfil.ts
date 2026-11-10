import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type PurchaseRow = {
  id: string
  reference_id: string
  purchase_type: string
  customer_email: string
  amount_cents: number
  metadata: Record<string, string> | null
}

/** Idempotent: apply the real-world effect of a paid purchase (order paid, membership active, lotto lines live, booking confirmed). */
export async function fulfilPurchase(supabase: SupabaseClient, p: PurchaseRow): Promise<void> {
  const md = p.metadata ?? {}
  if (p.purchase_type === 'store') {
    // Stock was reserved when checkout started; this only flips the order to paid.
    const { error } = await supabase.rpc('mark_order_paid', { p_order_id: p.reference_id, p_purchase_id: p.id })
    if (error) throw new Error(error.message)
    return
  }
  if (p.purchase_type === 'membership') {
    // One per purchase, and only while the purchase is still paid (see grant_membership).
    const { error } = await supabase.rpc('grant_membership', { p_purchase_id: p.id })
    if (error) throw new Error(error.message)
    return
  }
  if (p.purchase_type === 'lotto') {
    const ids = (md.ticket_ids ?? '').split(',').filter(Boolean)
    // Only enter lines into a draw that is still open. A payment that lands after
    // the draw leaves the lines pending (never scored, never a "winner"); the
    // purchase stays paid so an admin can refund it from Orders.
    const { data: draw } = await supabase.from('lotto_draws').select('status').eq('id', p.reference_id).maybeSingle()
    if (draw?.status !== 'open') {
      console.warn('lotto payment after draw closed; lines not entered', p.id)
      return
    }
    if (ids.length) await supabase.from('lotto_tickets').update({ status: 'paid', purchase_id: p.id }).in('id', ids).eq('status', 'pending')
    return
  }
  if (p.purchase_type === 'booking') {
    await supabase.from('facility_bookings').update({ status: 'confirmed', purchase_id: p.id }).eq('id', p.reference_id).eq('status', 'pending')
  }
}

/** Reverse the effect after a refund. */
export async function reversePurchase(supabase: SupabaseClient, p: PurchaseRow): Promise<void> {
  const md = p.metadata ?? {}
  if (p.purchase_type === 'store') await supabase.from('orders').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', p.reference_id)
  if (p.purchase_type === 'membership') await supabase.from('memberships').update({ status: 'cancelled' }).eq('purchase_id', p.id)
  if (p.purchase_type === 'lotto') {
    const ids = (md.ticket_ids ?? '').split(',').filter(Boolean)
    if (ids.length) await supabase.from('lotto_tickets').update({ status: 'cancelled' }).in('id', ids)
  }
  if (p.purchase_type === 'booking') await supabase.from('facility_bookings').update({ status: 'cancelled' }).eq('id', p.reference_id)
}

/** Cancel pending domain rows when checkout expires / is abandoned. */
export async function abandonPurchase(supabase: SupabaseClient, p: PurchaseRow): Promise<void> {
  const md = p.metadata ?? {}
  if (p.purchase_type === 'store') {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', p.reference_id).eq('status', 'pending')
    await supabase.rpc('release_order_checkout', { p_order_id: p.reference_id })
  }
  if (p.purchase_type === 'lotto') {
    const ids = (md.ticket_ids ?? '').split(',').filter(Boolean)
    if (ids.length) await supabase.from('lotto_tickets').delete().in('id', ids).eq('status', 'pending')
  }
  if (p.purchase_type === 'booking') await supabase.from('facility_bookings').delete().eq('id', p.reference_id).eq('status', 'pending')
}
