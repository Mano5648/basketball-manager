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
    await supabase.from('orders').update({ status: 'paid', purchase_id: p.id, updated_at: new Date().toISOString() }).eq('id', p.reference_id).eq('status', 'pending')
    const { data: order } = await supabase.from('orders').select('items').eq('id', p.reference_id).maybeSingle()
    for (const item of ((order?.items ?? []) as { product_id: string; quantity: number }[])) {
      const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).maybeSingle()
      if (prod && typeof prod.stock === 'number') {
        await supabase.from('products').update({ stock: Math.max(0, prod.stock - item.quantity) }).eq('id', item.product_id)
      }
    }
    return
  }
  if (p.purchase_type === 'membership') {
    const { data: existing } = await supabase.from('memberships').select('id').eq('purchase_id', p.id).maybeSingle()
    if (existing) return
    const months = Math.max(1, Number(md.duration_months || 12))
    const start = new Date()
    const end = new Date(start)
    end.setMonth(end.getMonth() + months)
    await supabase.from('memberships').insert({
      profile_id: md.profile_id,
      child_id: md.child_id || null,
      package_id: md.package_id || null,
      package_name: md.package_name || 'Membership',
      amount_cents: p.amount_cents,
      starts_at: start.toISOString().slice(0, 10),
      expires_at: end.toISOString().slice(0, 10),
      status: 'active',
      purchase_id: p.id,
    })
    return
  }
  if (p.purchase_type === 'lotto') {
    const ids = (md.ticket_ids ?? '').split(',').filter(Boolean)
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
  if (p.purchase_type === 'store') await supabase.from('orders').update({ status: 'cancelled' }).eq('id', p.reference_id).eq('status', 'pending')
  if (p.purchase_type === 'lotto') {
    const ids = (md.ticket_ids ?? '').split(',').filter(Boolean)
    if (ids.length) await supabase.from('lotto_tickets').delete().in('id', ids).eq('status', 'pending')
  }
  if (p.purchase_type === 'booking') await supabase.from('facility_bookings').delete().eq('id', p.reference_id).eq('status', 'pending')
}
