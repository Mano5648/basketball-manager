import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export type LineItem = { name: string; amountCents: number; quantity: number; imageUrl?: string }

type Product = { id: string; name: string; price: number; active?: boolean; stock?: number }
type Order = {
  id: string
  customerName: string
  customerEmail: string
  items: { productId: string; productName: string; price: number; quantity: number }[]
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'cancelled'
}
type TicketPrice = { fixtureKey: string; adultPrice: number; kidPrice: number; enabled: boolean }
type ClubFixture = {
  id: string
  date?: string
  opponent: string
  ticketsEnabled?: boolean
  adultPrice?: number
  kidPrice?: number
}
type Player = { id: string; teamIds: string[]; amount?: number }
type Team = { id: string; ageGroupId?: string }
type AgeGroupFeeConfig = { monthly: number; oneTime: number }

const DEFAULT_MEMBERSHIP_FEES: Record<string, AgeGroupFeeConfig> = {
  u10: { monthly: 30, oneTime: 25 },
  u12: { monthly: 35, oneTime: 30 },
  u14: { monthly: 40, oneTime: 35 },
  u16: { monthly: 45, oneTime: 40 },
  u18: { monthly: 45, oneTime: 40 },
  u20: { monthly: 50, oneTime: 45 },
  senior: { monthly: 50, oneTime: 45 },
}

async function readState<T>(supabase: SupabaseClient, key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from('app_state').select('value').eq('key', key).maybeSingle()
  if (!data?.value) return fallback
  return data.value as T
}

function eurosToCents(amount: number): number {
  return Math.round(amount * 100)
}

function resolveTicketPricing(
  fixtureKey: string,
  fixtures: ClubFixture[],
  ticketPrices: Record<string, TicketPrice>,
): { adultPrice: number; kidPrice: number; fixtureName: string } | null {
  const fixture = fixtures.find((f) => f.id === fixtureKey)
  if (!fixture || fixture.ticketsEnabled === false) return null

  const override = ticketPrices[fixtureKey]
  if (override) {
    if (!override.enabled) return null
    return {
      adultPrice: override.adultPrice,
      kidPrice: override.kidPrice,
      fixtureName: fixture.opponent,
    }
  }

  const adultPrice = fixture.adultPrice ?? 0
  const kidPrice = fixture.kidPrice ?? 0
  if (adultPrice <= 0 && kidPrice <= 0) return null

  return { adultPrice, kidPrice, fixtureName: fixture.opponent }
}

function resolveMembershipFeeCents(
  playerId: string,
  planType: string,
  players: Player[],
  teams: Team[],
  fees: Record<string, AgeGroupFeeConfig>,
): number | null {
  const player = players.find((p) => p.id === playerId)
  if (!player) return null

  let ageGroupId: string | null = null
  if (player.teamIds.length > 0) {
    const team = teams.find((t) => player.teamIds.includes(t.id))
    ageGroupId = team?.ageGroupId ?? null
  }

  const feeConfig = ageGroupId ? fees[ageGroupId] : null
  const monthly = feeConfig?.monthly ?? player.amount ?? 50
  const oneTime = feeConfig?.oneTime ?? 40

  if (planType === 'oneTime') return eurosToCents(oneTime)
  if (planType === 'monthly') return eurosToCents(monthly)
  return null
}

export type ValidatedCheckout = {
  lineItems: LineItem[]
  totalCents: number
  metadata: Record<string, string>
}

export async function validateCheckoutPricing(
  supabase: SupabaseClient,
  input: {
    purchaseType: 'store' | 'ticket' | 'membership'
    referenceId: string
    playerId?: string
    metadata?: Record<string, string>
    clientLineItems?: LineItem[]
  },
): Promise<{ ok: true; checkout: ValidatedCheckout } | { ok: false; error: string }> {
  const metadata = { ...(input.metadata ?? {}) }

  if (input.purchaseType === 'store') {
    const [orders, products] = await Promise.all([
      readState<Order[]>(supabase, 'dlbc_orders', []),
      readState<Product[]>(supabase, 'dlbc_products', []),
    ])

    const order = orders.find((o) => o.id === input.referenceId)
    if (!order) return { ok: false, error: 'Order not found' }
    if (order.status !== 'pending') return { ok: false, error: 'Order is not payable' }

    const lineItems: LineItem[] = []
    for (const item of order.items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product || product.active === false) {
        return { ok: false, error: `Product unavailable: ${item.productName}` }
      }
      if (typeof product.stock === 'number' && product.stock < item.quantity) {
        return { ok: false, error: `Insufficient stock for ${product.name}` }
      }
      const imageFromClient = input.clientLineItems?.find((li) => li.name === item.productName)?.imageUrl
      lineItems.push({
        name: product.name,
        amountCents: eurosToCents(product.price),
        quantity: item.quantity,
        imageUrl: imageFromClient,
      })
    }

    const totalCents = lineItems.reduce((sum, item) => sum + item.amountCents * item.quantity, 0)
    if (totalCents <= 0) return { ok: false, error: 'Invalid order total' }

    metadata.order_id = order.id
    return { ok: true, checkout: { lineItems, totalCents, metadata } }
  }

  if (input.purchaseType === 'ticket') {
    const fixtureKey = metadata.fixture_key
    if (!fixtureKey) return { ok: false, error: 'Missing fixture_key' }

    const adultQty = Math.max(0, Number(metadata.adult_qty || 0))
    const kidQty = Math.max(0, Number(metadata.kid_qty || 0))
    if (adultQty + kidQty <= 0) return { ok: false, error: 'Select at least one ticket' }

    const [fixtures, ticketPrices] = await Promise.all([
      readState<ClubFixture[]>(supabase, 'dlbc_fixtures', []),
      readState<Record<string, TicketPrice>>(supabase, 'dlbc_ticket_prices', {}),
    ])

    const pricing = resolveTicketPricing(fixtureKey, fixtures, ticketPrices)
    if (!pricing) return { ok: false, error: 'Tickets are not available for this fixture' }

    const fixture = fixtures.find((f) => f.id === fixtureKey)
    const fixtureName = metadata.fixture_name || fixture?.opponent || 'Match'
    const lineItems: LineItem[] = []
    const imageFromClient = input.clientLineItems?.[0]?.imageUrl

    if (adultQty > 0) {
      if (pricing.adultPrice <= 0) return { ok: false, error: 'Adult tickets are not available' }
      lineItems.push({
        name: `Adult ticket — ${fixtureName}`,
        amountCents: eurosToCents(pricing.adultPrice),
        quantity: adultQty,
        imageUrl: imageFromClient,
      })
    }
    if (kidQty > 0) {
      if (pricing.kidPrice <= 0) return { ok: false, error: 'Kid tickets are not available' }
      lineItems.push({
        name: `Kid ticket — ${fixtureName}`,
        amountCents: eurosToCents(pricing.kidPrice),
        quantity: kidQty,
        imageUrl: imageFromClient,
      })
    }

    const totalCents = lineItems.reduce((sum, item) => sum + item.amountCents * item.quantity, 0)
    metadata.fixture_key = fixtureKey
    metadata.fixture_name = fixtureName
    metadata.fixture_date = metadata.fixture_date || fixture?.date || ''
    metadata.adult_qty = String(adultQty)
    metadata.kid_qty = String(kidQty)
    metadata.adult_price = String(pricing.adultPrice)
    metadata.kid_price = String(pricing.kidPrice)

    return { ok: true, checkout: { lineItems, totalCents, metadata } }
  }

  if (input.purchaseType === 'membership') {
    const playerId = input.playerId || metadata.player_id
    if (!playerId) return { ok: false, error: 'Missing player_id' }

    const planType = metadata.plan_type
    if (planType !== 'monthly' && planType !== 'oneTime') {
      return { ok: false, error: 'Invalid membership plan' }
    }

    const [players, teams, fees] = await Promise.all([
      readState<Player[]>(supabase, 'dlbc_players', []),
      readState<Team[]>(supabase, 'dlbc_teams', []),
      readState<Record<string, AgeGroupFeeConfig>>(supabase, 'dlbc_membership_fees', DEFAULT_MEMBERSHIP_FEES),
    ])

    const amountCents = resolveMembershipFeeCents(playerId, planType, players, teams, fees)
    if (!amountCents || amountCents <= 0) {
      return { ok: false, error: 'Membership fee could not be determined' }
    }

    const label = metadata.plan_label || (planType === 'monthly' ? 'Monthly membership' : 'One-time registration')
    const imageFromClient = input.clientLineItems?.[0]?.imageUrl

    metadata.player_id = playerId
    metadata.plan_type = planType
    metadata.plan_label = label

    return {
      ok: true,
      checkout: {
        lineItems: [{ name: label, amountCents, quantity: 1, imageUrl: imageFromClient }],
        totalCents: amountCents,
        metadata,
      },
    }
  }

  return { ok: false, error: 'Unsupported purchase type' }
}
