import { supabase } from './supabase'

export function sb() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export type MemberType = 'adult' | 'parent' | 'supporter'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  member_type: MemberType
  avatar_url: string | null
  created_at: string
}
export interface Team { id: string; name: string; age_group: string | null; description: string | null; coach_name: string | null; coach_email: string | null; sort_order: number }
export interface Child { id: string; parent_id: string; full_name: string; dob: string | null; team_id: string | null }
export interface TeamMember { id: string; team_id: string; profile_id: string | null; child_id: string | null; role: 'player' | 'coach' | 'parent' }
export interface ClubSettings {
  id: 1
  club_name: string
  tagline: string | null
  logo_url: string | null
  primary_color: string
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  website_url: string | null
  currency: string
  features: Record<FeatureKey, boolean>
  lotto_rules: string | null
  terms_url: string | null
  privacy_url: string | null
  about_text: string | null
  privacy_text: string | null
  welcome_title: string | null
  register_title: string | null
  sponsors_title: string | null
  home_greeting: string | null
}
export type FeatureKey = 'news' | 'events' | 'fixtures' | 'shop' | 'membership' | 'lotto' | 'booking' | 'sponsors'
export interface Sponsor { id: string; name: string; logo_url: string | null; website_url: string | null; tier: string; blurb: string | null; active: boolean; sort_order: number }
export interface NewsPost { id: string; title: string; body: string; image_url: string | null; published: boolean; pinned: boolean; created_at: string }
export interface ClubEvent { id: string; title: string; description: string | null; location: string | null; starts_at: string; ends_at: string | null; team_id: string | null; image_url: string | null; rsvp_enabled: boolean }
export interface Rsvp { event_id: string; profile_id: string; status: 'going' | 'maybe' | 'not_going' }
export interface Fixture {
  id: string; team_id: string | null; opponent: string; competition: string | null; venue: string | null; is_home: boolean
  starts_at: string; home_score: number | null; away_score: number | null
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'; period: string | null
  tickets_enabled: boolean; adult_price_cents: number; kid_price_cents: number; notes: string | null
}
export interface FixtureUpdate { id: string; fixture_id: string; text: string; home_score: number | null; away_score: number | null; created_at: string }
export interface MembershipPackage { id: string; name: string; description: string | null; price_cents: number; duration_months: number; audience: 'any' | 'adult' | 'child' | 'supporter'; active: boolean; sort_order: number }
export interface Membership { id: string; profile_id: string; child_id: string | null; package_id: string | null; package_name: string; amount_cents: number; starts_at: string; expires_at: string; status: 'active' | 'expired' | 'cancelled'; created_at: string }
export interface LottoDraw { id: string; title: string; ticket_price_cents: number; jackpot_cents: number; numbers_count: number; max_number: number; draw_at: string; status: 'open' | 'closed' | 'drawn' | 'cancelled'; winning_numbers: number[] | null; drawn_at: string | null }
export interface LottoTicket { id: string; draw_id: string; profile_id: string; numbers: number[]; status: 'pending' | 'paid' | 'cancelled'; is_winner: boolean; matched: number; created_at: string }
export interface Facility { id: string; name: string; description: string | null; open_time: string; close_time: string; slot_minutes: number; price_cents: number; active: boolean }
export interface Booking { id: string; facility_id: string; profile_id: string; starts_at: string; ends_at: string; status: 'pending' | 'confirmed' | 'cancelled'; notes: string | null }
export interface Product { id: string; name: string; description: string | null; category: string | null; price_cents: number; image_url: string | null; stock: number | null; sizes: string[] | null; active: boolean; sort_order: number }
export interface OrderItem { product_id: string; name: string; price_cents: number; quantity: number; size?: string; image_url?: string }
export interface Order { id: string; profile_id: string | null; customer_name: string; customer_email: string; items: OrderItem[]; total_cents: number; status: 'pending' | 'paid' | 'fulfilled' | 'refunded' | 'cancelled'; delivery_note: string | null; purchase_id: string | null; created_at: string }
export interface Notification { id: string; title: string; body: string; target: 'all' | 'team'; team_id: string | null; link: string | null; push_sent: number; created_at: string }
export interface Purchase { id: string; reference_id: string; purchase_type: string; customer_name: string; customer_email: string; amount_cents: number; items: { name: string; quantity: number; amountCents: number }[]; status: string; created_at: string; paid_at: string | null; metadata: Record<string, string> | null }

export async function fetchSettings(): Promise<ClubSettings> {
  const { data, error } = await sb().from('club_settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data as ClubSettings
}

export async function listAll<T>(table: string, order = 'created_at', ascending = false, filter?: (q: any) => any): Promise<T[]> {
  let q: any = sb().from(table).select('*').order(order, { ascending })
  if (filter) q = filter(q)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as T[]
}

export async function upsertRow<T extends object>(table: string, row: Partial<T> & { id?: string }): Promise<T> {
  const payload = { ...row } as Record<string, unknown>
  if (!payload.id) delete payload.id
  const { data, error } = await sb().from(table).upsert(payload).select().single()
  if (error) throw error
  return data as T
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await sb().from(table).delete().eq('id', id)
  if (error) throw error
}
