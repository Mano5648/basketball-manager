import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export type LineItem = { name: string; amountCents: number; quantity: number; imageUrl?: string }
export type PurchaseType = 'store' | 'ticket' | 'membership' | 'lotto' | 'booking'

export type ValidatedCheckout = {
  lineItems: LineItem[]
  totalCents: number
  metadata: Record<string, string>
}

type Result = { ok: true; checkout: ValidatedCheckout } | { ok: false; error: string }
const fail = (error: string): Result => ({ ok: false, error })

/** Server-side pricing: never trust client amounts. Every type reads its price from the DB. */
export async function validateCheckoutPricing(
  supabase: SupabaseClient,
  input: { purchaseType: PurchaseType; referenceId: string; customerEmail: string; metadata?: Record<string, string> },
): Promise<Result> {
  const metadata = { ...(input.metadata ?? {}) }

  if (input.purchaseType === 'store') {
    const { data: order } = await supabase.from('orders').select('*').eq('id', input.referenceId).maybeSingle()
    if (!order) return fail('Order not found')
    if (order.status !== 'pending') return fail('Order is not payable')
    if (order.customer_email.toLowerCase() !== input.customerEmail.toLowerCase()) return fail('Order belongs to another customer')
    const ids = (order.items as { product_id: string; quantity: number; size?: string }[]).map((i) => i.product_id)
    const { data: products } = await supabase.from('products').select('*').in('id', ids)
    const lineItems: LineItem[] = []
    for (const item of order.items as { product_id: string; quantity: number; size?: string }[]) {
      const p = (products ?? []).find((x) => x.id === item.product_id)
      if (!p || !p.active) return fail('A product in your cart is no longer available')
      if (typeof p.stock === 'number' && p.stock < item.quantity) return fail(`Not enough stock for ${p.name}`)
      const qty = Math.max(1, Math.min(50, Math.floor(item.quantity)))
      lineItems.push({ name: item.size ? `${p.name} (${item.size})` : p.name, amountCents: p.price_cents, quantity: qty, imageUrl: p.image_url ?? undefined })
    }
    const totalCents = lineItems.reduce((s, i) => s + i.amountCents * i.quantity, 0)
    if (totalCents <= 0) return fail('Invalid order total')
    await supabase.from('orders').update({ total_cents: totalCents }).eq('id', order.id)
    metadata.order_id = order.id
    return { ok: true, checkout: { lineItems, totalCents, metadata } }
  }

  if (input.purchaseType === 'ticket') {
    const { data: fx } = await supabase.from('fixtures').select('*').eq('id', input.referenceId).maybeSingle()
    if (!fx || !fx.tickets_enabled || fx.status !== 'scheduled') return fail('Tickets are not available for this game')
    const adultQty = Math.max(0, Math.min(20, Math.floor(Number(metadata.adult_qty || 0))))
    const kidQty = Math.max(0, Math.min(20, Math.floor(Number(metadata.kid_qty || 0))))
    if (adultQty + kidQty <= 0) return fail('Select at least one ticket')
    const label = `${fx.is_home ? 'Home' : 'Away'} vs ${fx.opponent}`
    const lineItems: LineItem[] = []
    if (adultQty > 0) { if (fx.adult_price_cents <= 0) return fail('Adult tickets are not on sale'); lineItems.push({ name: `Adult ticket — ${label}`, amountCents: fx.adult_price_cents, quantity: adultQty }) }
    if (kidQty > 0) { if (fx.kid_price_cents <= 0) return fail('Child tickets are not on sale'); lineItems.push({ name: `Child ticket — ${label}`, amountCents: fx.kid_price_cents, quantity: kidQty }) }
    metadata.fixture_id = fx.id
    metadata.fixture_name = label
    metadata.fixture_date = fx.starts_at
    metadata.adult_qty = String(adultQty)
    metadata.kid_qty = String(kidQty)
    return { ok: true, checkout: { lineItems, totalCents: lineItems.reduce((s, i) => s + i.amountCents * i.quantity, 0), metadata } }
  }

  if (input.purchaseType === 'membership') {
    const { data: pkg } = await supabase.from('membership_packages').select('*').eq('id', input.referenceId).maybeSingle()
    if (!pkg || !pkg.active) return fail('This membership package is not available')
    if (pkg.price_cents <= 0) return fail('This package is free — contact the club')
    const { data: profile } = await supabase.from('profiles').select('id').ilike('email', input.customerEmail).maybeSingle()
    if (!profile) return fail('Member profile not found')
    if (metadata.child_id) {
      const { data: child } = await supabase.from('children').select('id, parent_id, full_name').eq('id', metadata.child_id).maybeSingle()
      if (!child || child.parent_id !== profile.id) return fail('Child not found on your account')
      metadata.child_name = child.full_name
    } else if (pkg.audience === 'child') {
      return fail('Choose which child this membership is for')
    }
    metadata.package_id = pkg.id
    metadata.package_name = pkg.name
    metadata.duration_months = String(pkg.duration_months)
    metadata.profile_id = profile.id
    metadata.plan_label = pkg.name
    return { ok: true, checkout: { lineItems: [{ name: `${pkg.name}${metadata.child_name ? ` — ${metadata.child_name}` : ''}`, amountCents: pkg.price_cents, quantity: 1 }], totalCents: pkg.price_cents, metadata } }
  }

  if (input.purchaseType === 'lotto') {
    const { data: draw } = await supabase.from('lotto_draws').select('*').eq('id', input.referenceId).maybeSingle()
    if (!draw || draw.status !== 'open' || new Date(draw.draw_at) <= new Date()) return fail('This draw is closed')
    const ids = (metadata.ticket_ids ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length === 0 || ids.length > 50) return fail('Select between 1 and 50 lines')
    const { data: profile } = await supabase.from('profiles').select('id').ilike('email', input.customerEmail).maybeSingle()
    if (!profile) return fail('Member profile not found')
    const { data: tickets } = await supabase.from('lotto_tickets').select('id, numbers, status, profile_id').in('id', ids).eq('draw_id', draw.id)
    if (!tickets || tickets.length !== ids.length) return fail('Some lines could not be found')
    for (const t of tickets) {
      if (t.profile_id !== profile.id || t.status !== 'pending') return fail('Invalid lotto line')
      const nums = t.numbers as number[]
      if (nums.length !== draw.numbers_count || new Set(nums).size !== nums.length || nums.some((n) => n < 1 || n > draw.max_number)) return fail('A line has invalid numbers')
    }
    metadata.ticket_ids = ids.join(',')
    metadata.draw_title = draw.title
    return { ok: true, checkout: { lineItems: [{ name: `${draw.title} — lotto line`, amountCents: draw.ticket_price_cents, quantity: ids.length }], totalCents: draw.ticket_price_cents * ids.length, metadata } }
  }

  if (input.purchaseType === 'booking') {
    const { data: booking } = await supabase.from('facility_bookings').select('*, facilities(*)').eq('id', input.referenceId).maybeSingle()
    if (!booking || booking.status !== 'pending') return fail('Booking is not payable')
    const facility = booking.facilities as { name: string; price_cents: number; active: boolean }
    if (!facility?.active || facility.price_cents <= 0) return fail('Facility is not bookable')
    const when = new Date(booking.starts_at).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Dublin' })
    metadata.booking_id = booking.id
    return { ok: true, checkout: { lineItems: [{ name: `${facility.name} — ${when}`, amountCents: facility.price_cents, quantity: 1 }], totalCents: facility.price_cents, metadata } }
  }

  return fail('Unsupported purchase type')
}
