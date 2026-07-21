/* ───────────────────────────────────────────────────────────
   Dublin Lions Basketball Club — Data Layer
   All data persists to localStorage, and — when Supabase is
   configured — is mirrored to a shared "app_state" table so every
   device/browser sees the same live data (see initAppStateSync
   below and supabase/app-data-setup.sql).
   ─────────────────────────────────────────────────────────── */

import { supabase, isSupabaseConfigured, isManagerEmail } from './supabase'
import { getLoggedInContact } from './authUser'

export interface Division {
  id: string
  name: string
  level: number
}

export interface AgeGroup {
  id: string
  name: string
  minAge: number
  maxAge: number
  divisions: Division[]
}

export interface Team {
  id: string
  name: string
  gender: 'Boys' | 'Girls' | 'Men' | 'Women'
  ageGroupId: string
  divisionId: string
  coach: string
  players: string[]
  season: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}

export interface Player {
  id: string
  name: string
  email: string
  phone: string
  dob: string
  gender: 'Male' | 'Female'
  teamIds: string[]
  position: string
  jerseyNumber: number
  status: 'Paid' | 'Pending' | 'Overdue'
  paymentPlan: 'Monthly' | 'Full Session' | 'Per Session' | 'None'
  amount: number
  lastPaymentDate: string
  registrationDate: string
  guardianName?: string
  guardianPhone?: string
  registeredWithBI: boolean
  photoUrl?: string
  ppg?: number
  rpg?: number
  apg?: number
  height?: string
  age?: number
  since?: number
  /** Set on first login — drives which fees the member sees. */
  memberType?: 'player' | 'parent'
  /** Player or parent-who-plays — year of birth. */
  birthYear?: number
  /** Parent flow — children registered under this account. */
  registeredChildren?: RegisteredChild[]
  /** @deprecated Use registeredChildren */
  childName?: string
  /** @deprecated Use registeredChildren */
  childDob?: string
  /** Parent flow — parent also registers to play themselves. */
  alsoPlays?: boolean
  /** Roster-only child record — links to parent account (no login). */
  parentPlayerId?: string
  registeredChildId?: string
  /** Set when the member finishes the player/parent onboarding wizard. */
  onboardingCompletedAt?: string
  /** Monotonic client timestamp of the last edit to registeredChildren (last-write-wins). */
  childrenUpdatedAt?: number
}

export interface RegisteredChild {
  id: string
  name: string
  dob: string
  gender?: 'Male' | 'Female'
  /** @deprecated Derived from dob */
  birthYear?: number
}

export type MemberPaymentFocus = 'monthly' | 'oneTime'

export interface Session {
  id: string
  title: string
  teamId: string
  date: string
  time: string
  location: string
  type: 'Training' | 'Match' | 'Event'
  opponent?: string
  attendance: string[]
  notes: string
}

export interface Announcement {
  id: string
  subject: string
  message: string
  recipients: string
  date: string
  status: 'Sent' | 'Draft'
}

export interface Payment {
  id: string
  playerId: string
  playerName: string
  amount: number
  status: 'succeeded' | 'pending' | 'failed'
  date: string
  method: string
  plan: string
}

export interface ImageMap {
  [key: string]: string
}

/* ─────────────────── Season Lifecycle ─────────────────── */

export interface SeasonState {
  label: string
  startedAt: string
  status: 'active' | 'ended'
  endedAt?: string
}

export interface SeasonStanding {
  teamId: string
  name: string
  ageGroupId: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}

export interface SeasonHistoryEntry {
  label: string
  startedAt: string
  endedAt: string
  standings: SeasonStanding[]
  fixtures: ClubFixture[]
}

// A player who's promoted into an age bracket that has no team yet. Team
// creation is manager-only — the manager creates the team from the Teams tab
// (using the auto-created age group) and then resolves this queue entry.
export interface PendingTeamAssignment {
  playerId: string
  ageGroupId: string
  ageGroupName: string
  gender: 'Boys' | 'Girls'
}

export interface DefaultTicketPrice {
  adultPrice: number
  kidPrice: number
}

export interface TicketPrice {
  fixtureKey: string
  adultPrice: number
  kidPrice: number
  enabled: boolean
}

export interface TicketPurchase {
  id: string
  userId: string
  fixtureKey: string
  fixtureName: string
  fixtureDate: string
  adultQty: number
  kidQty: number
  adultPrice: number
  kidPrice: number
  total: number
  receiptId: string
  paymentMethod: 'card' | 'cash'
  buyerName: string
  buyerEmail: string
  purchasedAt: string
}

/* ─────────────────── Default Data ─────────────────── */

export const defaultAgeGroups: AgeGroup[] = [
  { id: 'u10', name: 'U10', minAge: 8, maxAge: 10, divisions: [{ id: 'u10-a', name: 'A', level: 1 }] },
  { id: 'u12', name: 'U12', minAge: 10, maxAge: 12, divisions: [
    { id: 'u12-a', name: 'A', level: 1 },
    { id: 'u12-b', name: 'B', level: 2 },
    { id: 'u12-c', name: 'C', level: 3 }
  ]},
  { id: 'u14', name: 'U14', minAge: 12, maxAge: 14, divisions: [
    { id: 'u14-a', name: 'A', level: 1 },
    { id: 'u14-b', name: 'B', level: 2 },
    { id: 'u14-c', name: 'C', level: 3 },
    { id: 'u14-d', name: 'D', level: 4 }
  ]},
  { id: 'u16', name: 'U16', minAge: 14, maxAge: 16, divisions: [
    { id: 'u16-a', name: 'A', level: 1 },
    { id: 'u16-b', name: 'B', level: 2 },
    { id: 'u16-c', name: 'C', level: 3 },
    { id: 'u16-d', name: 'D', level: 4 }
  ]},
  { id: 'u18', name: 'U18', minAge: 16, maxAge: 18, divisions: [
    { id: 'u18-a', name: 'A', level: 1 },
    { id: 'u18-b', name: 'B', level: 2 },
    { id: 'u18-c', name: 'C', level: 3 }
  ]},
  { id: 'u20', name: 'U20', minAge: 18, maxAge: 20, divisions: [
    { id: 'u20-a', name: 'A', level: 1 },
    { id: 'u20-b', name: 'B', level: 2 }
  ]},
  { id: 'senior', name: 'Senior', minAge: 18, maxAge: 99, divisions: [
    { id: 'senior-sl', name: 'Super League', level: 1 },
    { id: 'senior-d1', name: 'Division 1', level: 2 }
  ]}
]

export const defaultTeams: Team[] = [
  { id: 'men-senior-d1', name: 'JOELS Dublin Lions', gender: 'Men', ageGroupId: 'senior', divisionId: 'senior-d1', coach: 'Rob White', players: [], season: '2025/26', wins: 8, losses: 3, pointsFor: 785, pointsAgainst: 692 },
  { id: 'women-senior-d1', name: 'Abbey Seals Dublin Lions', gender: 'Women', ageGroupId: 'senior', divisionId: 'senior-d1', coach: 'Haris Sikorskis', players: [], season: '2025/26', wins: 6, losses: 5, pointsFor: 634, pointsAgainst: 598 },
  { id: 'boys-u14-a', name: 'Dublin Lions U14 Boys', gender: 'Boys', ageGroupId: 'u14', divisionId: 'u14-a', coach: 'Gareth Winders', players: [], season: '2025/26', wins: 12, losses: 1, pointsFor: 892, pointsAgainst: 612 },
  { id: 'girls-u14-a', name: 'Dublin Lions U14 Girls', gender: 'Girls', ageGroupId: 'u14', divisionId: 'u14-a', coach: 'Laura Deeney', players: [], season: '2025/26', wins: 10, losses: 3, pointsFor: 756, pointsAgainst: 634 },
]

export const defaultPlayers: Player[] = [
  { id: 'p1', name: 'Kevin Anyanwu', email: 'kevin.anyanwu@email.ie', phone: '+353 87 123 4567', dob: '1995-03-15', gender: 'Male', teamIds: ['men-senior-d1'], position: 'Guard', jerseyNumber: 7, status: 'Paid', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2025-01-02', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: true, photoUrl: '/player-kevin-anyanwu.jpg', ppg: 18.4, rpg: 4.2, apg: 5.1, height: "6'2\"", age: 24, since: 2022 },
  { id: 'p2', name: 'Tiago Pereira', email: 'tiago.pereira@email.ie', phone: '+353 87 234 5678', dob: '1993-07-22', gender: 'Male', teamIds: ['men-senior-d1'], position: 'Forward', jerseyNumber: 11, status: 'Paid', paymentPlan: 'Full Session', amount: 250, lastPaymentDate: '2024-09-01', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: true, photoUrl: '/player-tiago-pereira.jpg', ppg: 14.8, rpg: 7.3, apg: 2.6, height: "6'5\"", age: 26, since: 2021 },
  { id: 'p3', name: 'Russ Marr', email: 'russ.marr@email.ie', phone: '+353 87 345 6789', dob: '1994-11-08', gender: 'Male', teamIds: ['men-senior-d1'], position: 'Center', jerseyNumber: 23, status: 'Paid', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2025-01-05', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: true, ppg: 12.2, rpg: 9.1, apg: 1.4, height: "6'9\"", age: 28, since: 2020 },
  { id: 'p4', name: 'Ignacio Folgueiras', email: 'ignacio.folgueiras@email.ie', phone: '+353 87 456 7890', dob: '1996-02-18', gender: 'Male', teamIds: ['men-senior-d1'], position: 'Guard', jerseyNumber: 3, status: 'Paid', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2025-01-03', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: true, ppg: 11.5, rpg: 3.8, apg: 6.2, height: "6'0\"", age: 23, since: 2023 },
  { id: 'p5', name: 'Tieran Howe', email: 'tieran.howe@email.ie', phone: '+353 87 567 8901', dob: '1997-09-30', gender: 'Male', teamIds: ['men-senior-d1'], position: 'Forward', jerseyNumber: 5, status: 'Pending', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2024-12-01', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: true, ppg: 9.7, rpg: 5.4, apg: 2.1, height: "6'4\"", age: 25, since: 2021 },
  { id: 'p6', name: 'Marcus O\'Brien', email: 'marcus.obrien@email.ie', phone: '+353 87 678 9012', dob: '1992-05-12', gender: 'Male', teamIds: ['men-senior-d1'], position: 'Guard', jerseyNumber: 15, status: 'Overdue', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2024-11-01', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: false, ppg: 8.3, rpg: 2.9, apg: 3.7, height: "6'1\"", age: 22, since: 2023 },
  { id: 'p7', name: 'Tara Nevin', email: 'tara.nevin@email.ie', phone: '+353 86 123 4567', dob: '1998-01-20', gender: 'Female', teamIds: ['women-senior-d1'], position: 'Guard', jerseyNumber: 5, status: 'Paid', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2025-01-05', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: true, photoUrl: '/player-tara-nevin.jpg', ppg: 16.2, rpg: 3.8, apg: 4.5, height: "5'7\"", age: 23, since: 2022 },
  { id: 'p8', name: 'Emily Smyth', email: 'emily.smyth@email.ie', phone: '+353 86 234 5678', dob: '1999-04-25', gender: 'Female', teamIds: ['women-senior-d1'], position: 'Forward', jerseyNumber: 14, status: 'Pending', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2024-12-15', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: true, photoUrl: '/player-emily-smyth.jpg', ppg: 13.5, rpg: 7.1, apg: 2.3, height: "5'10\"", age: 25, since: 2021 },
  { id: 'p9', name: 'Sinead Keane', email: 'sinead.keane@email.ie', phone: '+353 86 345 6789', dob: '1997-08-14', gender: 'Female', teamIds: ['women-senior-d1'], position: 'Center', jerseyNumber: 33, status: 'Paid', paymentPlan: 'Full Session', amount: 250, lastPaymentDate: '2024-09-01', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: true, ppg: 11.8, rpg: 8.9, apg: 1.6, height: "6'1\"", age: 27, since: 2020 },
  { id: 'p10', name: 'Makenzie Helms', email: 'makenzie.helms@email.ie', phone: '+353 86 456 7890', dob: '2000-12-03', gender: 'Female', teamIds: ['women-senior-d1'], position: 'Guard', jerseyNumber: 8, status: 'Paid', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2025-01-01', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: true, ppg: 10.4, rpg: 4.2, apg: 5.8, height: "5'6\"", age: 22, since: 2023 },
  { id: 'p11', name: 'Rachel Brennan', email: 'rachel.brennan@email.ie', phone: '+353 86 567 8901', dob: '2001-06-18', gender: 'Female', teamIds: ['women-senior-d1'], position: 'Forward', jerseyNumber: 12, status: 'Overdue', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2024-10-01', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: false, ppg: 9.1, rpg: 6.3, apg: 2.7, height: "5'9\"", age: 24, since: 2021 },
  { id: 'p12', name: 'Niamh Walsh', email: 'niamh.walsh@email.ie', phone: '+353 86 678 9012', dob: '2002-09-22', gender: 'Female', teamIds: ['women-senior-d1'], position: 'Forward', jerseyNumber: 22, status: 'Overdue', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '2024-11-15', registrationDate: '2024-09-01', guardianName: '', guardianPhone: '', registeredWithBI: false, ppg: 6.8, rpg: 5.5, apg: 1.8, height: "5'11\"", age: 26, since: 2022 },
]

defaultTeams[0].players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
defaultTeams[1].players = ['p7', 'p8', 'p9', 'p10', 'p11', 'p12']

export const defaultSessions: Session[] = [
  { id: 's1', title: 'Senior Men Training', teamId: 'men-senior-d1', date: '2025-05-06', time: '19:00', location: 'Coláiste Bríde', type: 'Training', attendance: ['p1', 'p2', 'p3', 'p4'], notes: 'Focus on defensive drills' },
  { id: 's2', title: 'Senior Women Training', teamId: 'women-senior-d1', date: '2025-05-06', time: '20:30', location: 'Coláiste Bríde', type: 'Training', attendance: ['p7', 'p9', 'p10'], notes: 'Offensive plays practice' },
  { id: 's3', title: 'vs Neptune BC', teamId: 'men-senior-d1', date: '2025-05-10', time: '18:00', location: 'National Basketball Arena', type: 'Match', opponent: 'Neptune BC', attendance: [], notes: '' },
]

export const defaultAnnouncements: Announcement[] = [
  { id: 'a1', subject: 'Welcome to the new season!', message: 'The 2025/26 season is underway. All players must be registered with Basketball Ireland by September 30th.', recipients: 'All Members', date: '2025-09-01', status: 'Sent' }
]

export const defaultPayments: Payment[] = [
  { id: 'pay1', playerId: 'p1', playerName: 'Kevin Anyanwu', amount: 50, status: 'succeeded', date: '2025-01-02', method: 'Stripe', plan: 'Monthly' },
  { id: 'pay2', playerId: 'p7', playerName: 'Tara Nevin', amount: 50, status: 'succeeded', date: '2025-01-05', method: 'Stripe', plan: 'Monthly' },
  { id: 'pay3', playerId: 'p6', playerName: 'Mark Doyle', amount: 50, status: 'failed', date: '2024-12-01', method: 'Stripe', plan: 'Monthly' },
]

export const defaultSeason: SeasonState = { label: '2025/26', startedAt: '2025-09-01', status: 'active' }

/* ─────────────────── localStorage Keys ─────────────────── */

const KEYS = {
  ageGroups: 'dlbc_ageGroups',
  teams: 'dlbc_teams',
  players: 'dlbc_players',
  sessions: 'dlbc_schedule',
  announcements: 'dlbc_announcements',
  payments: 'dlbc_payments',
  images: 'dlbc_images',
  ticketPrices: 'dlbc_ticket_prices',
  ticketPurchases: 'dlbc_ticket_purchases',
  chatMessages: 'dlbc_chat_messages',
  chatMembers: 'dlbc_chat_members',
  stripeLink: 'dlbc_stripe_payment_link',
  fixtures: 'dlbc_fixtures',
  membershipFees: 'dlbc_membership_fees',
  season: 'dlbc_season',
  seasonHistory: 'dlbc_season_history',
  defaultTicketPrice: 'dlbc_default_ticket_price',
  pendingSeniorPlayers: 'dlbc_pending_senior_players',
  pendingTeamAssignments: 'dlbc_pending_team_assignments',
  revokedMemberEmails: 'dlbc_revoked_member_emails',
}

// Every key EXCEPT `images` is mirrored to Supabase (`images` is superseded
// by the dedicated site_images table/bucket in src/lib/siteImages.ts).
const SYNCED_KEYS = new Set<string>(
  Object.entries(KEYS)
    .filter(([name]) => name !== 'images')
    .map(([, value]) => value),
)

/* ─────────────────── Membership Fees (per age group) ─────────────────── */
// Manager configures monthly and one-time (registration) fees per age group.
export interface AgeGroupFeeConfig {
  monthly: number
  oneTime: number
}

export type MembershipFeeConfigMap = Record<string, AgeGroupFeeConfig>

/** @deprecated Use MembershipFeeConfigMap — kept for backward compatibility */
export type MembershipFeeMap = Record<string, number>

const defaultMembershipFeeConfig: MembershipFeeConfigMap = {
  u10: { monthly: 30, oneTime: 25 },
  u12: { monthly: 35, oneTime: 30 },
  u14: { monthly: 40, oneTime: 35 },
  u16: { monthly: 45, oneTime: 40 },
  u18: { monthly: 45, oneTime: 40 },
  u20: { monthly: 50, oneTime: 45 },
  senior: { monthly: 50, oneTime: 45 },
}

function migrateLegacyFees(raw: unknown): MembershipFeeConfigMap {
  if (!raw || typeof raw !== 'object') return { ...defaultMembershipFeeConfig }
  const obj = raw as Record<string, unknown>
  const firstVal = Object.values(obj)[0]
  if (typeof firstVal === 'number') {
    const legacy = obj as MembershipFeeMap
    const out: MembershipFeeConfigMap = { ...defaultMembershipFeeConfig }
    for (const [id, monthly] of Object.entries(legacy)) {
      out[id] = { monthly: Number(monthly) || 0, oneTime: out[id]?.oneTime ?? 0 }
    }
    return out
  }
  const out: MembershipFeeConfigMap = { ...defaultMembershipFeeConfig }
  for (const [id, val] of Object.entries(obj)) {
    if (val && typeof val === 'object' && 'monthly' in val) {
      const cfg = val as AgeGroupFeeConfig
      out[id] = { monthly: Number(cfg.monthly) || 0, oneTime: Number(cfg.oneTime) || 0 }
    }
  }
  return out
}

export function getMembershipFeeConfig(): MembershipFeeConfigMap {
  return migrateLegacyFees(getStore(KEYS.membershipFees, defaultMembershipFeeConfig))
}

export function setMembershipFeeConfig(v: MembershipFeeConfigMap) {
  setStore(KEYS.membershipFees, v)
}

/** Monthly fees only — legacy helper */
export const getMembershipFees = (): MembershipFeeMap => {
  const cfg = getMembershipFeeConfig()
  return Object.fromEntries(Object.entries(cfg).map(([id, f]) => [id, f.monthly]))
}

export const setMembershipFees = (v: MembershipFeeMap) => {
  const current = getMembershipFeeConfig()
  const next: MembershipFeeConfigMap = { ...current }
  for (const [id, monthly] of Object.entries(v)) {
    next[id] = { monthly: Number(monthly) || 0, oneTime: next[id]?.oneTime ?? 0 }
  }
  setMembershipFeeConfig(next)
}

export function getAgeGroupIdForPlayer(playerId: string): string | null {
  const player = getPlayers().find((p) => p.id === playerId)
  if (!player || player.teamIds.length === 0) return null
  const team = getTeams().find((t) => player.teamIds.includes(t.id))
  return team?.ageGroupId ?? null
}

export function isValidBirthYear(year: number): boolean {
  const current = new Date().getFullYear()
  return Number.isInteger(year) && year >= current - 80 && year <= current
}

export const MIN_CHILD_AGE = 10

export function isValidChildDob(dob: string): boolean {
  if (!dob?.trim()) return false
  const age = calcAge(dob.trim())
  if (age === null) return false
  return age >= MIN_CHILD_AGE
}

/** @deprecated Use isValidChildDob with full date */
export function isValidChildBirthYear(year: number): boolean {
  const current = new Date().getFullYear()
  const newestAllowed = current - MIN_CHILD_AGE
  return Number.isInteger(year) && year >= current - 80 && year <= newestAllowed
}

export function childBirthYearOptions(): number[] {
  const current = new Date().getFullYear()
  const newest = current - MIN_CHILD_AGE
  const oldest = current - 80
  return Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i)
}

export function calcAgeFromBirthYear(birthYear: number): number {
  return new Date().getFullYear() - birthYear
}

export function getPlayerBirthYear(player: Player): number | null {
  if (player.birthYear && isValidBirthYear(player.birthYear)) return player.birthYear
  if (player.dob) {
    const age = calcAge(player.dob)
    if (age !== null) return new Date().getFullYear() - age
  }
  return null
}

/** Normalises legacy single-child fields into registeredChildren. */
export function getRegisteredChildren(player: Player | undefined | null): RegisteredChild[] {
  if (!player) return []
  if (player.registeredChildren?.length) {
    return player.registeredChildren.map((c) => ({
      ...c,
      dob: c.dob || (c.birthYear ? `${c.birthYear}-01-01` : ''),
      gender: c.gender || 'Male',
    }))
  }
  if (player.childName?.trim()) {
    const dob = player.childDob || (player.birthYear ? `${player.birthYear}-01-01` : '')
    if (dob) {
      return [{
        id: 'legacy-1',
        name: player.childName.trim(),
        dob,
        gender: 'Male',
        birthYear: parseInt(dob.slice(0, 4), 10) || undefined,
      }]
    }
  }
  return []
}

export function isChildRosterPlayer(player: Player | undefined | null): boolean {
  return !!player?.parentPlayerId
}

/** Club manager / admin logins — not roster members. */
export function isClubAdminEmail(email: string | undefined | null): boolean {
  return isManagerEmail(email)
}

/**
 * Who appears in the manager Members list: children and players who completed
 * sign-up onboarding. No manual manager entries or incomplete registrations.
 */
export function isRosterListedMember(player: Player | undefined | null): boolean {
  if (!player) return false
  if (isClubAdminEmail(player.email)) return false
  if (player.memberType === 'parent' && !isChildRosterPlayer(player)) return false
  if (isChildRosterPlayer(player)) return true
  if (player.memberType === 'player') {
    return !!player.onboardingCompletedAt || !needsPlayerOnboarding(player)
  }
  return false
}

export function getRosterListedMembers(): Player[] {
  return getPlayers().filter(isRosterListedMember)
}

export function getChildRosterPlayersForParent(parentId: string): Player[] {
  return getPlayers().filter((p) => p.parentPlayerId === parentId)
}

export function getParentForChildRosterPlayer(childPlayerId: string): Player | null {
  const child = getPlayers().find((p) => p.id === childPlayerId)
  if (!child?.parentPlayerId) return null
  return getPlayers().find((p) => p.id === child.parentPlayerId) ?? null
}

export function childRosterPlayerId(parentId: string, childId: string): string {
  return `child-${parentId}-${childId}`
}

export function findTeamForChild(child: RegisteredChild): Team | null {
  const age = calcAge(child.dob)
  if (age === null) return null
  const target = computeTargetAgeGroup(age)
  if (!target) return null
  const preferredGender: Team['gender'] = child.gender === 'Female' ? 'Girls' : 'Boys'
  const teams = getTeams().filter((t) => t.ageGroupId === target.id)
  return teams.find((t) => t.gender === preferredGender) ?? teams[0] ?? null
}

/** Chat members for a team: parents of child roster entries + adult players (not children). */
export function getChatEligibleMemberIds(teamId: string): string[] {
  const team = getTeams().find((t) => t.id === teamId)
  if (!team) return []
  const players = getPlayers()
  const ids = new Set<string>()
  for (const pid of team.players) {
    const p = players.find((pl) => pl.id === pid)
    if (!p) continue
    if (p.parentPlayerId) {
      ids.add(p.parentPlayerId)
    } else if (!isChildRosterPlayer(p)) {
      ids.add(pid)
    }
  }
  return [...ids]
}

/** Team IDs a parent can access (own teams + children's teams). */
export function getTeamIdsForMember(player: Player): string[] {
  const ids = new Set(player.teamIds)
  if (player.memberType === 'parent') {
    for (const child of getChildRosterPlayersForParent(player.id)) {
      child.teamIds.forEach((tid) => ids.add(tid))
    }
  }
  return [...ids]
}

/**
 * Creates/updates roster Player records for each registered child, assigns them
 * to the age-appropriate team, and adds the parent (not the child) to team chat.
 */
export function syncChildrenRosterForParent(parentId: string): Player | null {
  const players = getPlayers()
  const parent = players.find((p) => p.id === parentId)
  if (!parent || parent.parentPlayerId) return parent ?? null

  const children = getRegisteredChildren(parent)
  let nextPlayers = [...players]
  let nextTeams = getTeams().map((t) => ({ ...t, players: [...t.players] }))
  const activeChildIds = new Set<string>()

  for (const child of children) {
    if (!child.name.trim() || !isValidChildDob(child.dob)) continue
    activeChildIds.add(child.id)

    const rosterId = childRosterPlayerId(parentId, child.id)
    const team = findTeamForChild(child)
    const teamId = team?.id
    const teamIds = teamId ? [teamId] : []
    const age = calcAge(child.dob) ?? undefined
    const existingIdx = nextPlayers.findIndex((p) => p.id === rosterId)
    const now = new Date().toISOString().split('T')[0]

    const childPlayer: Player = existingIdx >= 0
      ? {
          ...nextPlayers[existingIdx],
          name: child.name.trim(),
          dob: child.dob,
          gender: child.gender || 'Male',
          teamIds,
          guardianName: parent.name,
          guardianPhone: parent.phone,
          age,
        }
      : {
          id: rosterId,
          name: child.name.trim(),
          email: '',
          phone: parent.phone || '',
          dob: child.dob,
          gender: child.gender || 'Male',
          teamIds,
          position: '',
          jerseyNumber: 0,
          status: parent.status,
          paymentPlan: 'Monthly',
          amount: 0,
          lastPaymentDate: '',
          registrationDate: parent.registrationDate || now,
          guardianName: parent.name,
          guardianPhone: parent.phone,
          registeredWithBI: false,
          parentPlayerId: parentId,
          registeredChildId: child.id,
          age,
        }

    if (existingIdx >= 0) nextPlayers[existingIdx] = childPlayer
    else nextPlayers.push(childPlayer)

    for (const t of nextTeams) {
      const onTeam = teamIds.includes(t.id)
      const wasOn = t.players.includes(rosterId)
      if (onTeam && !wasOn) t.players.push(rosterId)
      if (!onTeam && wasOn) t.players = t.players.filter((pid) => pid !== rosterId)
    }

    if (teamId) {
      addChatMember(teamId, parentId)
      removeChatMember(teamId, rosterId)
    }
  }

  const staleChildren = nextPlayers.filter(
    (p) => p.parentPlayerId === parentId && p.registeredChildId && !activeChildIds.has(p.registeredChildId),
  )
  for (const stale of staleChildren) {
    nextPlayers = nextPlayers.filter((p) => p.id !== stale.id)
    nextTeams = nextTeams.map((t) => ({
      ...t,
      players: t.players.filter((pid) => pid !== stale.id),
    }))
  }

  const currentPlayers = getPlayers()
  const currentTeams = getTeams()
  const playersChanged = JSON.stringify(nextPlayers) !== JSON.stringify(currentPlayers)
  const teamsChanged = JSON.stringify(nextTeams) !== JSON.stringify(currentTeams)

  if (playersChanged) setPlayers(nextPlayers)
  if (teamsChanged) setTeams(nextTeams)
  return nextPlayers.find((p) => p.id === parentId) ?? null
}

/** Ensures every parent account has up-to-date child roster Player rows (for manager view). */
export function reconcileAllParentChildRosters(): void {
  const players = getPlayers()
  for (const p of players) {
    if (p.parentPlayerId) continue
    if (p.memberType === 'parent' || getRegisteredChildren(p).length > 0) {
      syncChildrenRosterForParent(p.id)
    }
  }
}

/** Remove spurious player records created for club admin logins (admins are not members). */
export function pruneAdminAccountsFromRoster(): void {
  const players = getPlayers()
  const toRemove = players.filter(
    (p) =>
      isClubAdminEmail(p.email) &&
      !isChildRosterPlayer(p) &&
      getRegisteredChildren(p).length === 0,
  )
  if (toRemove.length === 0) return

  const removeIds = new Set(toRemove.map((p) => p.id))
  setPlayers(players.filter((p) => !removeIds.has(p.id)))
  setTeams(
    getTeams().map((t) => ({
      ...t,
      players: t.players.filter((pid) => !removeIds.has(pid)),
    })),
  )
}

/** Sync child roster rows and drop admin accounts from the members list. */
export function reconcileClubRoster(): void {
  pruneAdminAccountsFromRoster()
  reconcileAllParentChildRosters()
}

/** True when a parent account has registered children not yet mirrored as roster members. */
export function hasUnsyncedParentChildren(players: Player[] = getPlayers()): boolean {
  for (const parent of players) {
    if (parent.parentPlayerId) continue
    const children = getRegisteredChildren(parent)
    if (children.length === 0) continue
    for (const child of children) {
      if (!child.name.trim() || !isValidChildDob(child.dob)) continue
      const rosterId = childRosterPlayerId(parent.id, child.id)
      const rosterRow = players.find((p) => p.id === rosterId)
      if (!rosterRow) return true
      if (rosterRow.name !== child.name.trim() || rosterRow.dob !== child.dob) return true
    }
  }
  return false
}

export function reconcileClubRosterIfNeeded(): void {
  if (hasUnsyncedParentChildren()) reconcileClubRoster()
  else pruneAdminAccountsFromRoster()
}

/** Push roster changes to Supabase so managers on other devices see new sign-ups immediately. */
export async function ensureClubRosterSynced(): Promise<void> {
  await ensureAppStateKeySynced(KEYS.players)
  await ensureAppStateKeySynced(KEYS.teams)
}

export function getFeeConfigForBirthYear(birthYear: number): AgeGroupFeeConfig {
  if (!isValidBirthYear(birthYear)) return { monthly: 0, oneTime: 0 }
  const ageGroupId = computeTargetAgeGroup(calcAgeFromBirthYear(birthYear))?.id
  if (!ageGroupId) {
    const cfg = getMembershipFeeConfig()
    const senior = cfg.senior
    if (senior) return senior
    const first = Object.values(cfg)[0]
    return first ?? { monthly: 0, oneTime: 0 }
  }
  return getFeeConfigForAgeGroup(ageGroupId)
}

/** Age group used for membership fees — team assignment, else birth year from onboarding. */
export function getFeeAgeGroupIdForPlayer(player: Player): string | null {
  const teamAgeGroup = getAgeGroupIdForPlayer(player.id)
  if (teamAgeGroup) return teamAgeGroup

  if (player.memberType === 'parent') {
    const firstChild = getRegisteredChildren(player)[0]
    if (firstChild?.dob) {
      const age = calcAge(firstChild.dob)
      if (age !== null) return computeTargetAgeGroup(age)?.id ?? null
    }
    if (player.childDob) {
      const age = calcAge(player.childDob)
      if (age !== null) return computeTargetAgeGroup(age)?.id ?? null
    }
    return null
  }

  const birthYear = getPlayerBirthYear(player)
  if (birthYear) return computeTargetAgeGroup(calcAgeFromBirthYear(birthYear))?.id ?? null
  if (player.dob) {
    const age = calcAge(player.dob)
    if (age !== null) return computeTargetAgeGroup(age)?.id ?? null
  }
  return null
}

export function getFeeConfigForAgeGroup(ageGroupId: string): AgeGroupFeeConfig {
  const cfg = getMembershipFeeConfig()
  return cfg[ageGroupId] ?? { monthly: 50, oneTime: 40 }
}

export function getFeeConfigForPlayer(playerId: string): AgeGroupFeeConfig {
  const player = getPlayers().find((p) => p.id === playerId)
  if (!player?.memberType) {
    return { monthly: 0, oneTime: 0 }
  }
  const ageGroupId = getFeeAgeGroupIdForPlayer(player)
  if (!ageGroupId) {
    const cfg = getMembershipFeeConfig()
    const senior = cfg.senior
    if (senior) return senior
    const first = Object.values(cfg)[0]
    return first ?? { monthly: 0, oneTime: 0 }
  }
  return getFeeConfigForAgeGroup(ageGroupId)
}

/** One-time / self fees for a parent who also plays (uses their birth year). */
export function getSelfFeeConfigForPlayer(player: Player): AgeGroupFeeConfig {
  const birthYear = getPlayerBirthYear(player)
  if (birthYear) return getFeeConfigForBirthYear(birthYear)
  return { monthly: 0, oneTime: 0 }
}

export function needsPlayerOnboarding(player: Player | undefined | null): boolean {
  if (!player) return true
  if (player.onboardingCompletedAt) return false
  if (!player.memberType) return true
  if (player.memberType === 'player') return getPlayerBirthYear(player) === null
  const children = getRegisteredChildren(player)
  if (
    children.length === 0
    || children.some((c) => !c.name.trim() || !isValidChildDob(c.dob))
  ) {
    return true
  }
  if (player.alsoPlays && getPlayerBirthYear(player) === null) return true
  return false
}

function parseAuthRegisteredChildren(raw: unknown): RegisteredChild[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({
      id: String(c.id ?? `child-${Date.now().toString(36)}`),
      name: String(c.name ?? '').trim(),
      dob: String(c.dob ?? '').trim(),
      gender: c.gender === 'Female' ? 'Female' as const : 'Male' as const,
    }))
    .filter((c) => c.name && c.dob)
}

function playerRecordScore(player: Player): number {
  let score = 0
  if (player.onboardingCompletedAt) score += 4
  score += getRegisteredChildren(player).length * 10
  if (player.parentPlayerId) score += 8
  if (player.memberType) score += 2
  if (player.email?.trim()) score += 1
  return score
}

/** Merge local + remote player rows so sign-ups and child records are not wiped on sync. */
export function mergePlayersForSync(local: Player[], remote: Player[]): Player[] {
  const merged = new Map<string, Player>()

  const upsert = (incoming: Player) => {
    const existing = merged.get(incoming.id)
    if (!existing) {
      merged.set(incoming.id, incoming)
      return
    }
    const preferIncoming = playerRecordScore(incoming) > playerRecordScore(existing)
    const primary = preferIncoming ? incoming : existing
    const secondary = preferIncoming ? existing : incoming
    const primaryChildren = getRegisteredChildren(primary)
    const secondaryChildren = getRegisteredChildren(secondary)
    // Children are reconciled by LAST-WRITE-WINS (childrenUpdatedAt), NOT by
    // "largest set wins" — otherwise a stale row with more children would
    // resurrect a child the member just deleted (the reload-revert bug).
    const primaryTs = primary.childrenUpdatedAt ?? 0
    const secondaryTs = secondary.childrenUpdatedAt ?? 0
    const childrenSource =
      primaryTs !== secondaryTs
        ? primaryTs > secondaryTs
          ? primary
          : secondary
        : primaryChildren.length >= secondaryChildren.length
          ? primary
          : secondary
    merged.set(incoming.id, {
      ...secondary,
      ...primary,
      registeredChildren: childrenSource.registeredChildren,
      childName: childrenSource.childName,
      childDob: childrenSource.childDob,
      childrenUpdatedAt: Math.max(primaryTs, secondaryTs) || undefined,
      onboardingCompletedAt: primary.onboardingCompletedAt ?? secondary.onboardingCompletedAt,
      memberType: primary.memberType ?? secondary.memberType,
      alsoPlays: primary.alsoPlays ?? secondary.alsoPlays,
      birthYear: primary.birthYear ?? secondary.birthYear,
    })
  }

  for (const player of remote) upsert(player)
  for (const player of local) upsert(player)
  return Array.from(merged.values())
}

function readPlayersFromStorage(): Player[] {
  const raw = localStorage.getItem(KEYS.players)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Player[]
  } catch {
    return []
  }
}

function applySyncedPlayersValue(value: unknown): Player[] {
  const remote = Array.isArray(value) ? (value as Player[]) : []
  const local = readPlayersFromStorage()
  if (local.length === 0 && remote.length === 0) return remote
  const merged = mergePlayersForSync(local, remote)
  if (JSON.stringify(merged) !== JSON.stringify(local)) {
    setPlayers(merged)
  }
  return merged
}

/* ─── Per-member roster contributions (P2 hardening) ───
   A shared `dlbc_players` blob means the last writer wins: a member pushing
   their local roster would clobber rows they can't see (they can't read other
   members' PII). To make member sign-ups collision-free, each member writes
   ONLY the rows they own — their own roster row + their child rows — to a row
   keyed by their auth uid: `dlbc_roster_contrib:<uid>`. The manager reads every
   contribution row and merges it into the authoritative `dlbc_players` blob.
   No member ever overwrites another member's data. */
export const CONTRIB_PREFIX = 'dlbc_roster_contrib:'

function currentUserIsManager(): boolean {
  const contact = getLoggedInContact()
  if (!contact) return false
  return contact.role === 'manager' || isManagerEmail(contact.email)
}

/** Rows the signed-in member owns: their own roster row + any child rows. */
function computeOwnedRosterRows(email: string): Player[] {
  const players = getPlayers()
  const own = players.find((p) => p.email && p.email.toLowerCase() === email.toLowerCase())
  if (!own) return []
  return [own, ...players.filter((p) => p.parentPlayerId === own.id)]
}

/**
 * Publishes the signed-in member's owned roster rows to their private
 * `dlbc_roster_contrib:<uid>` app_state row. No-op for managers (they own the
 * shared blob) and when Supabase isn't configured.
 */
export async function pushMemberRosterContribution(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const contact = getLoggedInContact()
  if (!contact?.email || currentUserIsManager()) return
  const owned = computeOwnedRosterRows(contact.email)
  if (owned.length === 0) return
  let uid: string | undefined
  try {
    const { data } = await supabase.auth.getUser()
    uid = data.user?.id
  } catch {
    uid = undefined
  }
  if (!uid) return
  const key = CONTRIB_PREFIX + uid
  const payload = { key, value: owned, updated_at: new Date().toISOString() }
  // Retry on transient network failures ("Failed to fetch") so a dropped push
  // doesn't leave the remote roster (and therefore the manager) stale.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { error } = await supabase.from('app_state').upsert(payload, { onConflict: 'key' })
      if (!error) return
      console.warn('[app_state] member contribution sync failed', error.message)
    } catch (e) {
      console.warn('[app_state] member contribution push threw, retrying', e)
    }
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
  }
}

let contribPushTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Debounced member contribution push. A single roster save triggers several
 * `setPlayers` calls (parent row update, then child-roster reconcile, then the
 * global reconcile). Firing an immediate push on each one captured different
 * (and sometimes stale, e.g. pre-deletion) snapshots that could land out of
 * order in Supabase — leaving a deleted child alive in the contribution row.
 * Coalescing to one push after the state settles always sends the final roster.
 */
function scheduleMemberContributionPush(): void {
  if (contribPushTimer) clearTimeout(contribPushTimer)
  contribPushTimer = setTimeout(() => {
    contribPushTimer = null
    void pushMemberRosterContribution()
  }, 250)
}

/** Merge a member contribution row into the local players roster (manager-side aggregation). */
function mergeContributionIntoPlayers(value: unknown): void {
  const rows = Array.isArray(value) ? (value as Player[]) : []
  if (rows.length === 0) return
  const local = readPlayersFromStorage()

  // The contributor's own row has no parentPlayerId; its children carry
  // parentPlayerId === owner.id. The contribution is authoritative for THIS
  // owner's set of children, so we must also honour deletions: drop any child
  // rows for this owner that the contribution no longer includes.
  const ownerRow = rows.find((r) => !r.parentPlayerId) ?? null
  const ownerId = ownerRow?.id

  // Ignore a stale contribution: if the manager already holds a newer edit for
  // this owner (larger childrenUpdatedAt), don't let an out-of-order/retried
  // push revert it.
  if (ownerRow && ownerId) {
    const localOwner = local.find((p) => p.id === ownerId)
    const localTs = localOwner?.childrenUpdatedAt ?? 0
    const contribTs = ownerRow.childrenUpdatedAt ?? 0
    if (localOwner && contribTs < localTs) return
  }

  let base = local
  if (ownerId) {
    const contribIds = new Set(rows.map((r) => r.id))
    base = local.filter((p) => !(p.parentPlayerId === ownerId && !contribIds.has(p.id)))
  }

  let merged = mergePlayersForSync(base, rows)

  // mergePlayersForSync keeps the "largest" registeredChildren set, which would
  // resurrect a deleted child. The contributor owns their own row, so take its
  // children list verbatim.
  if (ownerRow) {
    merged = merged.map((p) =>
      p.id === ownerRow.id
        ? {
            ...p,
            registeredChildren: ownerRow.registeredChildren,
            childName: ownerRow.childName,
            childDob: ownerRow.childDob,
            childrenUpdatedAt: ownerRow.childrenUpdatedAt,
          }
        : p,
    )
  }

  if (JSON.stringify(merged) !== JSON.stringify(local)) {
    setPlayers(merged)
  }
}

/**
 * Re-applies saved onboarding answers from Supabase Auth user_metadata when the
 * local roster row was reset (e.g. after syncing from another device).
 */
/**
 * Ensures registered children from auth metadata exist as roster members (manager view).
 * Safe to call after onboarding whenever a parent updates children.
 */
export function syncRegisteredChildrenFromAuthMetadata(
  email: string,
  metadata: Record<string, unknown> | undefined,
): Player | null {
  const player = findPlayerByEmail(email)
  if (!player) return null

  const authChildren = parseAuthRegisteredChildren(metadata?.registeredChildren)
  const localChildren = getRegisteredChildren(player)
  const authTs = typeof metadata?.childrenUpdatedAt === 'number' ? metadata.childrenUpdatedAt : 0
  const localTs = player.childrenUpdatedAt ?? 0

  // Last-write-wins. Restore children FROM auth metadata only when it is
  // genuinely newer than the local edit (e.g. changed on another device), or
  // when local has no record at all (fresh-device recovery). This prevents a
  // stale auth-metadata snapshot from resurrecting a just-added/deleted child
  // after reload — the exact revert bug we hit when a Supabase push failed.
  const authIsNewer = authTs > localTs
  const localNeverEdited = localTs === 0 && localChildren.length === 0
  if (authChildren && (authIsNewer || (localNeverEdited && authChildren.length > 0))) {
    return updateRegisteredChildren(player.id, authChildren, authTs || Date.now())
  }

  if (hasUnsyncedParentChildren()) {
    reconcileClubRoster()
    return findPlayerByEmail(email) ?? null
  }

  return syncChildrenRosterForParent(player.id) ?? player
}

export function syncPlayerProfileFromAuthMetadata(
  email: string,
  metadata: Record<string, unknown> | undefined,
): Player | null {
  if (!metadata) return null
  const memberType = metadata.memberType
  if (memberType !== 'player' && memberType !== 'parent') return null

  const player = findPlayerByEmail(email)
  if (!player) return null
  if (!needsPlayerOnboarding(player)) {
    return syncRegisteredChildrenFromAuthMetadata(email, metadata) ?? player
  }

  const birthYear =
    typeof metadata.birthYear === 'number' && isValidBirthYear(metadata.birthYear)
      ? metadata.birthYear
      : undefined
  const alsoPlays = !!metadata.alsoPlays
  const registeredChildren =
    memberType === 'parent' ? parseAuthRegisteredChildren(metadata.registeredChildren) : undefined

  if (memberType === 'parent' && (!registeredChildren || registeredChildren.length === 0)) {
    return null
  }
  if (memberType === 'player' && !birthYear) return null

  return completePlayerOnboarding(player.id, {
    memberType,
    birthYear,
    alsoPlays,
    registeredChildren,
  })
}

export function getMemberPaymentFocus(player: Player | undefined | null): MemberPaymentFocus | null {
  if (!player?.memberType) return null
  return player.memberType === 'parent' ? 'monthly' : 'oneTime'
}

export function completePlayerOnboarding(
  playerId: string,
  input: {
    memberType: 'player' | 'parent'
    registeredChildren?: RegisteredChild[]
    birthYear?: number
    alsoPlays?: boolean
  },
): Player | null {
  const players = getPlayers()
  const idx = players.findIndex((p) => p.id === playerId)
  if (idx < 0) return null

  const current = players[idx]
  const isParent = input.memberType === 'parent'
  const birthYear = input.birthYear && isValidBirthYear(input.birthYear) ? input.birthYear : undefined
  const children = isParent
    ? (input.registeredChildren ?? []).map((c) => ({
        id: c.id,
        name: c.name.trim(),
        dob: c.dob.trim(),
        gender: c.gender || 'Male',
        birthYear: parseInt(c.dob.slice(0, 4), 10) || undefined,
      }))
    : undefined
  const firstChild = children?.[0]

  const updated: Player = {
    ...current,
    memberType: input.memberType,
    birthYear: input.memberType === 'player' || input.alsoPlays ? birthYear : undefined,
    registeredChildren: children,
    childName: firstChild?.name,
    childDob: firstChild?.dob,
    alsoPlays: isParent ? !!input.alsoPlays : undefined,
    dob: birthYear ? `${birthYear}-01-01` : current.dob,
    age: birthYear ? calcAgeFromBirthYear(birthYear) : current.age,
    guardianName: isParent ? current.guardianName || current.name : current.guardianName,
    paymentPlan: isParent ? 'Monthly' : current.paymentPlan,
    onboardingCompletedAt: new Date().toISOString(),
    childrenUpdatedAt: Date.now(),
  }
  const next = [...players]
  next[idx] = updated
  setPlayers(next)
  if (isParent) return syncChildrenRosterForParent(playerId)
  return updated
}

export function updateRegisteredChildren(
  playerId: string,
  children: RegisteredChild[],
  childrenUpdatedAt: number = Date.now(),
): Player | null {
  const players = getPlayers()
  const idx = players.findIndex((p) => p.id === playerId)
  if (idx < 0) return null

  const current = players[idx]
  const hasSelfRegistration =
    current.memberType === 'player' || !!current.alsoPlays || getPlayerBirthYear(current) !== null

  const normalised = children
    .map((c) => ({
      id: c.id || `child-${Date.now().toString(36)}`,
      name: c.name.trim(),
      dob: c.dob.trim(),
      gender: c.gender || 'Male',
      birthYear: parseInt(c.dob.slice(0, 4), 10) || undefined,
    }))
    .filter((c) => c.name && isValidChildDob(c.dob))

  const firstChild = normalised[0]
  let memberType: 'player' | 'parent' = current.memberType ?? 'player'
  let alsoPlays = current.alsoPlays
  let paymentPlan = current.paymentPlan

  if (normalised.length > 0) {
    memberType = 'parent'
    if (hasSelfRegistration) alsoPlays = true
    paymentPlan = 'Monthly'
  } else if (hasSelfRegistration) {
    memberType = 'player'
    alsoPlays = undefined
  }

  const updated: Player = {
    ...current,
    memberType,
    registeredChildren: normalised.length > 0 ? normalised : undefined,
    childName: firstChild?.name,
    childDob: firstChild?.dob,
    alsoPlays: memberType === 'parent' ? alsoPlays : undefined,
    paymentPlan,
    guardianName: memberType === 'parent' ? current.guardianName || current.name : current.guardianName,
    childrenUpdatedAt,
  }
  const next = [...players]
  next[idx] = updated
  setPlayers(next)
  return syncChildrenRosterForParent(playerId)
}

export function hasTeamAssignment(player: Player | undefined | null): boolean {
  if (!player) return false
  if (player.teamIds.length > 0) return true
  if (player.memberType === 'parent') {
    return getChildRosterPlayersForParent(player.id).some((c) => c.teamIds.length > 0)
  }
  return false
}

/** Sessions for a member's assigned team(s) only — empty until a manager assigns teams. */
export function getSessionsForPlayer(playerId: string): Session[] {
  const player = getPlayers().find((p) => p.id === playerId)
  if (!player) return []
  const teamIds = new Set(getTeamIdsForMember(player))
  if (teamIds.size === 0) return []
  return getSessions().filter((s) => teamIds.has(s.teamId))
}

// Apply monthly and/or one-time fees to all or selected age groups.
export function applyFeesToAgeGroups(
  ageGroupIds: string[] | 'all',
  fees: { monthly?: number; oneTime?: number },
) {
  const groups = getAgeGroups()
  const targets = ageGroupIds === 'all' ? groups.map((g) => g.id) : ageGroupIds
  const current = getMembershipFeeConfig()
  const next = { ...current }
  for (const id of targets) {
    const prev = next[id] ?? { monthly: 0, oneTime: 0 }
    next[id] = {
      monthly: fees.monthly !== undefined ? fees.monthly : prev.monthly,
      oneTime: fees.oneTime !== undefined ? fees.oneTime : prev.oneTime,
    }
  }
  setMembershipFeeConfig(next)
}

// Returns the monthly fee for a given player based on their team's age group.
export function getMonthlyFeeForPlayer(playerId: string): number {
  return getFeeConfigForPlayer(playerId).monthly
}

export function getOneTimeFeeForPlayer(playerId: string): number {
  return getFeeConfigForPlayer(playerId).oneTime
}

export function hasPaidOneTimeFee(playerId: string): boolean {
  return getPayments().some(
    (p) =>
      p.playerId === playerId &&
      p.status === 'succeeded' &&
      (p.plan === 'One-time' || p.plan === 'Registration' || p.plan.includes('One-time')),
  )
}

export function findPlayerByEmail(email: string): Player | undefined {
  const norm = email.trim().toLowerCase()
  return getPlayers().find((p) => p.email.trim().toLowerCase() === norm)
}

export function normalizeMemberEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getRevokedMemberEmails(): string[] {
  return getStore<string[]>(KEYS.revokedMemberEmails, [])
}

export function isMemberAccessRevoked(email: string): boolean {
  const norm = normalizeMemberEmail(email)
  if (!norm) return false
  return getRevokedMemberEmails().includes(norm)
}

export function revokeMemberAccess(email: string): void {
  const norm = normalizeMemberEmail(email)
  if (!norm) return
  const current = getRevokedMemberEmails()
  if (!current.includes(norm)) {
    setStore(KEYS.revokedMemberEmails, [...current, norm])
  }
}

export function clearMemberRevocation(email: string): void {
  const norm = normalizeMemberEmail(email)
  if (!norm) return
  setStore(
    KEYS.revokedMemberEmails,
    getRevokedMemberEmails().filter((e) => e !== norm),
  )
}

/** True when a player login should remain active (roster + not revoked). */
export function isPlayerAccountActive(email: string | undefined | null): boolean {
  if (!email?.trim()) return false
  if (isMemberAccessRevoked(email)) return false
  return !!findPlayerByEmail(email)
}

/** Remove a member from the club roster and revoke their portal access. */
export function removePlayerFromClub(playerId: string): boolean {
  const players = getPlayers()
  const player = players.find((p) => p.id === playerId)
  if (!player) return false

  const childIds = players.filter((p) => p.parentPlayerId === playerId).map((p) => p.id)
  const removeIds = new Set([playerId, ...childIds])

  setPlayers(players.filter((p) => !removeIds.has(p.id)))
  setTeams(
    getTeams().map((t) => ({
      ...t,
      players: t.players.filter((pid) => !removeIds.has(pid)),
    })),
  )
  clearPendingSeniorPlayer(playerId)
  setPendingTeamAssignments(getPendingTeamAssignments().filter((p) => p.playerId !== playerId))

  if (player.email?.trim()) {
    revokeMemberAccess(player.email)
  }
  return true
}

/** Team/position/jersey from roster — empty until a manager assigns them. */
export function getRosterDisplayForEmail(email: string) {
  const player = findPlayerByEmail(email)
  if (!player) {
    return { player: undefined as Player | undefined, teamName: '', position: '', jersey: 0, hasTeam: false }
  }
  const team = getTeams().find((t) => player.teamIds.includes(t.id))
  return {
    player,
    teamName: team?.name ?? '',
    position: player.position || '',
    jersey: player.jerseyNumber || 0,
    hasTeam: Boolean(team),
  }
}

/** True only when a succeeded payment exists for the current calendar month. */
export function isMembershipPaidForCurrentMonth(email: string, now = new Date()): boolean {
  const player = findPlayerByEmail(email)
  if (!player) return false
  return hasPaidThisMonth(player.id, now)
}

// Has the player paid for the current month? True if their last successful
// payment falls within this calendar month.
export function hasPaidThisMonth(playerId: string, now = new Date()): boolean {
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return getPayments().some(
    (p) => p.playerId === playerId && p.status === 'succeeded' && p.date.startsWith(monthKey),
  )
}

// Records a cash payment for the given player and flips their status to Paid.
export function recordCashPayment(playerId: string, amount?: number, plan = 'Monthly'): Payment | null {
  const players = getPlayers()
  const player = players.find((p) => p.id === playerId)
  if (!player) return null
  const finalAmount = amount ?? getMonthlyFeeForPlayer(playerId)
  return recordPayment({
    playerId,
    playerName: player.name,
    amount: finalAmount,
    method: 'Cash',
    plan: plan || (player.paymentPlan === 'None' ? 'Monthly' : player.paymentPlan),
    status: 'succeeded',
  })
}

// Records a card payment after the user enters their payment method in checkout.
export function recordCardPayment(params: {
  playerId: string
  amount: number
  plan: string
  cardLast4?: string
  payerName?: string
  method?: string
}): Payment | null {
  const player = getPlayers().find((p) => p.id === params.playerId)
  if (!player) return null
  const method = params.method ?? (params.cardLast4 ? `Card •••• ${params.cardLast4}` : 'Card')
  return recordPayment({
    playerId: params.playerId,
    playerName: params.payerName || player.name,
    amount: params.amount,
    method,
    plan: params.plan,
    status: 'succeeded',
  })
}

export function recordGuestCardPayment(params: {
  payerName: string
  payerEmail?: string
  amount: number
  plan: string
  cardLast4?: string
  referenceId?: string
  method?: string
}): Payment {
  const method = params.method ?? (params.cardLast4 ? `Card •••• ${params.cardLast4}` : 'Card')
  return recordPayment({
    playerId: params.referenceId || `guest-${Date.now().toString(36)}`,
    playerName: params.payerName,
    amount: params.amount,
    method,
    plan: params.plan,
    status: 'succeeded',
  })!
}

function recordPayment(params: {
  playerId: string
  playerName: string
  amount: number
  method: string
  plan: string
  status: 'succeeded' | 'pending' | 'failed'
}): Payment | null {
  const payment: Payment = {
    id: `pay-${Date.now().toString(36)}`,
    playerId: params.playerId,
    playerName: params.playerName,
    amount: params.amount,
    status: params.status,
    date: new Date().toISOString().split('T')[0],
    method: params.method,
    plan: params.plan,
  }
  const payments = getPayments()
  payments.unshift(payment)
  setPayments(payments)

  const players = getPlayers()
  const player = players.find((p) => p.id === params.playerId)
  if (player && params.status === 'succeeded') {
    const updated = players.map((p) =>
      p.id === params.playerId
        ? {
            ...p,
            status: 'Paid' as const,
            lastPaymentDate: payment.date,
            amount: params.amount,
            paymentPlan: params.plan === 'One-time' ? p.paymentPlan : 'Monthly',
          }
        : p,
    )
    setPlayers(updated)
  }
  return payment
}

/* ─────────────────── Public Fixtures (with Results) ─────────────────── */
// A ClubFixture represents a single competitive match shown on the public
// site. The manager can add, edit, and enter results from the dashboard.

export interface FixtureResult {
  lionsScore: number
  opponentScore: number
  mvp?: string
}

export interface ClubFixture {
  id: string
  date: string        // ISO date — YYYY-MM-DD
  time: string        // 24h time — HH:MM
  opponent: string
  venue: 'Home' | 'Away'
  competition: string
  ticketLink?: string
  soldOut?: boolean
  // Ticket pricing — set per fixture from the manager dashboard. When
  // `ticketsEnabled` is true and a price > 0, the public site shows a
  // "Buy ticket" button that routes through Stripe (or cash fallback).
  ticketsEnabled?: boolean
  adultPrice?: number
  kidPrice?: number
  result?: FixtureResult
}

export const defaultFixtures: ClubFixture[] = [
  { id: 'fx1', date: '2025-01-11', time: '18:00', opponent: 'Killester', venue: 'Away', competition: "Domino's Division 1", result: { lionsScore: 82, opponentScore: 74, mvp: 'Kevin Anyanwu' } },
  { id: 'fx2', date: '2025-01-18', time: '19:00', opponent: 'Neptune BC', venue: 'Home', competition: "Domino's Division 1" },
  { id: 'fx3', date: '2025-01-25', time: '18:30', opponent: 'UCD Marian', venue: 'Away', competition: "Domino's Division 1" },
  { id: 'fx4', date: '2025-02-01', time: '19:00', opponent: 'Belfast Star', venue: 'Home', competition: "Domino's Division 1" },
  { id: 'fx5', date: '2025-02-08', time: '18:30', opponent: 'DCU Saints', venue: 'Away', competition: "Domino's Division 1" },
  { id: 'fx6', date: '2025-02-15', time: '19:00', opponent: 'Templeogue', venue: 'Home', competition: "Domino's Division 1" },
  { id: 'fx7', date: '2025-02-22', time: '18:00', opponent: 'Éanna', venue: 'Away', competition: "Domino's Division 1" },
]

export const getFixtures = () => getStore<ClubFixture[]>(KEYS.fixtures, defaultFixtures)
export const setFixtures = (v: ClubFixture[]) => setStore(KEYS.fixtures, v)

export function upsertFixture(fixture: ClubFixture) {
  const list = getFixtures()
  const idx = list.findIndex((f) => f.id === fixture.id)
  if (idx === -1) list.push(fixture)
  else list[idx] = fixture
  setFixtures(list)
}

export function deleteFixture(id: string) {
  setFixtures(getFixtures().filter((f) => f.id !== id))
}

export function setFixtureResult(id: string, result: FixtureResult | null) {
  const list = getFixtures()
  const idx = list.findIndex((f) => f.id === id)
  if (idx === -1) return
  if (result == null) delete list[idx].result
  else list[idx].result = result
  setFixtures(list)
}

/* ─────────────────── Stripe Payment Link ─────────────────── */
// Single configurable Stripe Payment Link used as the card-checkout URL for
// tickets, store orders, and membership sign-ups. Stripe Payment Links are
// hosted by Stripe so no backend is required — the manager creates one in
// the Stripe dashboard and pastes the URL into Settings.
export function getStripePaymentLink(): string {
  return getStore<string>(KEYS.stripeLink, '')
}
export function setStripePaymentLink(url: string) {
  setStore(KEYS.stripeLink, url)
}
// Returns the Stripe checkout URL with a pending order id appended as
// `client_reference_id` so the manager can reconcile the payment to the
// order in the Stripe dashboard.
export function buildStripeCheckoutUrl(referenceId: string): string | null {
  const base = getStripePaymentLink().trim()
  if (!base) return null
  try {
    const u = new URL(base)
    u.searchParams.set('client_reference_id', referenceId)
    return u.toString()
  } catch {
    return null
  }
}

export interface ChatRoomMembership {
  memberIds: string[]
  adminIds: string[]
}

/* ─────────────────── Helpers ─────────────────── */

export function getStore<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

export function setStore<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new StorageEvent('storage', { key }))
  syncKeyToRemote(key, value)
}

export function clearStore(key: string) {
  localStorage.removeItem(key)
  window.dispatchEvent(new StorageEvent('storage', { key }))
  syncKeyToRemote(key, null)
}

/* ─────────────────── Shared / Multi-Device Sync ───────────────────
   When Supabase is configured, every localStorage write above is also
   mirrored to a public "app_state" table (key/value + updated_at). This
   makes data like Team Chat, players, fixtures, etc. genuinely shared
   across devices/browsers instead of being local to one machine:
     - writes: fire-and-forget upsert (localStorage remains the source
       of truth for instant, synchronous UI reads/writes everywhere else
       in the app — no call site needs to change).
     - bootstrap: on load, pull every row once and merge remote-over-local.
     - realtime: subscribe to live changes and merge them in, dispatching
       a `storage` event so every existing storage-event listener across
       the app (Navbar, ManagerDashboard, Teams, Fixtures, Home, Store...)
       picks up the update with zero extra code.
   See supabase/app-data-setup.sql for the table + RLS + Realtime setup.
   ─────────────────────────────────────────────────────────────────── */

let appStateSyncPromise: Promise<void> | null = null

/** Resolves once the initial Supabase → localStorage pull has finished (or immediately if offline). */
export function whenClubDataReady(): Promise<void> {
  return appStateSyncPromise ?? Promise.resolve()
}

function syncKeyToRemote(key: string, value: unknown) {
  if (!isSupabaseConfigured || !supabase) return
  if (!SYNCED_KEYS.has(key)) return
  if (value === null) {
    supabase.from('app_state').delete().eq('key', key).then(({ error }) => {
      if (error) console.warn('[app_state] delete failed for', key, error.message)
    })
    return
  }
  // Members never overwrite the shared roster/team blobs — they publish only the
  // rows they own to their private contribution row instead (see P2 hardening).
  if (key === KEYS.players && !currentUserIsManager()) {
    scheduleMemberContributionPush()
    return
  }
  if (key === KEYS.teams && !currentUserIsManager()) {
    // Team roster membership is rebuilt manager-side from the contribution; a
    // member write here is rejected by RLS and only spams the console.
    return
  }
  supabase
    .from('app_state')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .then(({ error }) => {
      if (error) console.warn('[app_state] sync failed for', key, error.message)
    })
}

/** Await remote sync before server-side validation (e.g. Stripe checkout). */
export async function ensureAppStateKeySynced(key: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !SYNCED_KEYS.has(key)) return
  // Members publish the roster via their private contribution row, never the
  // shared blob (see P2 hardening) — otherwise this would clobber other members.
  if (key === KEYS.players && !currentUserIsManager()) {
    await pushMemberRosterContribution()
    return
  }
  if (key === KEYS.teams && !currentUserIsManager()) return
  const raw = localStorage.getItem(key)
  if (!raw) return
  try {
    const value = JSON.parse(raw) as unknown
    const { error } = await supabase
      .from('app_state')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) console.warn('[app_state] ensure sync failed for', key, error.message)
  } catch {
    /* ignore malformed local data */
  }
}

/**
 * Call once on app startup. Pulls the shared app_state table into
 * localStorage (remote wins on first load, since it reflects whatever the
 * manager last saved from any device), then subscribes to live changes so
 * every open tab/device stays in sync without a refresh. No-ops when
 * Supabase isn't configured (the app keeps working purely from localStorage).
 */
function applyRemoteAppStateRow(key: string, value: unknown) {
  if (key.startsWith(CONTRIB_PREFIX)) {
    mergeContributionIntoPlayers(value)
    window.dispatchEvent(new StorageEvent('storage', { key: KEYS.players }))
    return
  }
  if (!SYNCED_KEYS.has(key)) return
  if (key === KEYS.players) {
    applySyncedPlayersValue(value)
    window.dispatchEvent(new StorageEvent('storage', { key }))
    return
  }
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new StorageEvent('storage', { key }))
}

/**
 * Re-pull the shared app_state table into localStorage (merging, not
 * overwriting). Used both on startup and as a lightweight polling fallback so
 * the manager dashboard picks up new member sign-ups even when Supabase
 * Realtime isn't delivering events. No-ops without Supabase.
 */
export async function pullRemoteAppState(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  try {
    const { data, error } = await supabase.from('app_state').select('key, value')
    if (error || !data) return
    for (const row of data as { key: string; value: unknown }[]) {
      applyRemoteAppStateRow(row.key, row.value)
    }
    reconcileClubRosterIfNeeded()
  } catch {
    /* offline or unreachable — keep working from localStorage */
  }
}

export async function initAppStateSync(): Promise<void> {
  if (appStateSyncPromise) return appStateSyncPromise
  if (!isSupabaseConfigured || !supabase) {
    appStateSyncPromise = Promise.resolve()
    return appStateSyncPromise
  }
  appStateSyncPromise = (async () => {
  const applyRemoteRow = applyRemoteAppStateRow

  // Awaited so callers (e.g. pruneDemoSeedData in main.tsx) can safely run
  // AFTER remote state has been merged in — otherwise a fresh device could
  // read only its local/default data, "prune" it, and push that over data
  // another device already synced to Supabase.
  try {
    const { data, error } = await supabase!.from('app_state').select('key, value')
    if (!error && data) {
      for (const row of data as { key: string; value: unknown }[]) {
        applyRemoteRow(row.key, row.value)
      }
    }
  } catch {
    /* offline or unreachable — keep working from localStorage */
  }

  reconcileClubRoster()
  void ensureAppStateKeySynced(KEYS.players)
  void ensureAppStateKeySynced(KEYS.teams)

  supabase
    .channel('app_state-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state' },
      (payload) => {
        const row = (payload.new ?? payload.old) as { key?: string; value?: unknown } | null
        if (!row?.key) return
        if (payload.eventType === 'DELETE') {
          if (!row.key.startsWith(CONTRIB_PREFIX)) localStorage.removeItem(row.key)
          window.dispatchEvent(new StorageEvent('storage', { key: row.key }))
        } else {
          applyRemoteRow(row.key, row.value)
          if (row.key === KEYS.players || row.key.startsWith(CONTRIB_PREFIX)) {
            reconcileClubRosterIfNeeded()
            void ensureAppStateKeySynced(KEYS.players)
            void ensureAppStateKeySynced(KEYS.teams)
          }
        }
      },
    )
    .subscribe()
  })()

  return appStateSyncPromise
}

/* ─────────────────── Typed Getters / Setters ─────────────────── */

export const getAgeGroups = () => getStore(KEYS.ageGroups, defaultAgeGroups)
export const setAgeGroups = (v: AgeGroup[]) => setStore(KEYS.ageGroups, v)

export const getTeams = () => getStore(KEYS.teams, defaultTeams)
export const setTeams = (v: Team[]) => setStore(KEYS.teams, v)

export const getPlayers = () => getStore(KEYS.players, defaultPlayers)
export const setPlayers = (v: Player[]) => setStore(KEYS.players, v)

// Called right after a player creates their own account (see AuthContext.signUp).
// Links their login to a real roster Player record so features like Team Chat
// work immediately — reuses an existing record if the email already matches
// (e.g. the manager pre-added them), otherwise creates a new, unassigned one
// (teamIds: []) that shows up in the manager's Players list to be assigned to
// a team and reviewed.
export function upsertPlayerFromAuth(input: {
  email: string
  name: string
  team?: string
  position?: string
  jerseyNumber?: number
}): Player | null {
  if (isMemberAccessRevoked(input.email)) return null
  if (isClubAdminEmail(input.email)) return null

  const players = getPlayers()
  const existing = players.find((p) => p.email.toLowerCase() === input.email.toLowerCase())
  if (existing) return existing

  const newPlayer: Player = {
    id: `p-${Date.now().toString(36)}`,
    name: input.name,
    email: input.email,
    phone: '',
    dob: '',
    gender: /women/i.test(input.team || '') ? 'Female' : 'Male',
    teamIds: [],
    position: input.position || '',
    jerseyNumber: input.jerseyNumber || 0,
    status: 'Pending',
    paymentPlan: 'None',
    amount: 0,
    lastPaymentDate: '',
    registrationDate: new Date().toISOString().split('T')[0],
    registeredWithBI: false,
  }
  setPlayers([...players, newPlayer])
  return newPlayer
}

export const getSessions = () => getStore(KEYS.sessions, defaultSessions)
export const setSessions = (v: Session[]) => setStore(KEYS.sessions, v)

export const getAnnouncements = () => getStore(KEYS.announcements, defaultAnnouncements)
export const setAnnouncements = (v: Announcement[]) => setStore(KEYS.announcements, v)

export const getPayments = () => getStore(KEYS.payments, defaultPayments)
export const setPayments = (v: Payment[]) => setStore(KEYS.payments, v)

export const getImages = () => getStore(KEYS.images, {} as ImageMap)
export const setImages = (v: ImageMap) => setStore(KEYS.images, v)

/* ─────────────────── Ticket Pricing ─────────────────── */

export function getTicketPrice(fixtureKey: string): TicketPrice | null {
  const prices = getStore<Record<string, TicketPrice>>(KEYS.ticketPrices, {})
  return prices[fixtureKey] || null
}

export function setTicketPrice(
  fixtureKey: string,
  adultPrice: number,
  kidPrice: number,
  enabled: boolean
) {
  const prices = getStore<Record<string, TicketPrice>>(KEYS.ticketPrices, {})
  prices[fixtureKey] = { fixtureKey, adultPrice, kidPrice, enabled }
  setStore(KEYS.ticketPrices, prices)
}

export function getTicketPurchases(): TicketPurchase[] {
  return getStore<TicketPurchase[]>(KEYS.ticketPurchases, [])
}

export function setTicketPurchases(v: TicketPurchase[]) {
  setStore(KEYS.ticketPurchases, v)
}

export function addTicketPurchase(data: Omit<TicketPurchase, 'id' | 'purchasedAt'>) {
  const purchases = getTicketPurchases()
  const purchase: TicketPurchase = {
    ...data,
    id: `tp-${Date.now().toString(36)}`,
    purchasedAt: new Date().toISOString(),
  }
  purchases.push(purchase)
  setTicketPurchases(purchases)
}

/* ─────────────────── Season Lifecycle ─────────────────── */

export const getSeason = (): SeasonState => getStore<SeasonState>(KEYS.season, defaultSeason)
export const setSeason = (v: SeasonState) => setStore(KEYS.season, v)

export const getSeasonHistory = (): SeasonHistoryEntry[] => getStore<SeasonHistoryEntry[]>(KEYS.seasonHistory, [])
export const setSeasonHistory = (v: SeasonHistoryEntry[]) => setStore(KEYS.seasonHistory, v)

export const getDefaultTicketPrice = (): DefaultTicketPrice =>
  getStore<DefaultTicketPrice>(KEYS.defaultTicketPrice, { adultPrice: 10, kidPrice: 5 })
export const setDefaultTicketPrice = (v: DefaultTicketPrice) => setStore(KEYS.defaultTicketPrice, v)

// Players flagged as having aged out of U20 — the manager decides whether to
// promote them to a Senior team or remove them, so this is a manual queue
// rather than an automatic move.
export const getPendingSeniorPlayers = (): string[] => getStore<string[]>(KEYS.pendingSeniorPlayers, [])
export const setPendingSeniorPlayers = (v: string[]) => setStore(KEYS.pendingSeniorPlayers, v)
export function clearPendingSeniorPlayer(playerId: string) {
  setPendingSeniorPlayers(getPendingSeniorPlayers().filter((id) => id !== playerId))
}

// Players promoted into a bracket with no team yet — manager must create the
// team (Teams tab) and then manually assign them from this queue.
export const getPendingTeamAssignments = (): PendingTeamAssignment[] =>
  getStore<PendingTeamAssignment[]>(KEYS.pendingTeamAssignments, [])
export const setPendingTeamAssignments = (v: PendingTeamAssignment[]) => setStore(KEYS.pendingTeamAssignments, v)
export function clearPendingTeamAssignment(playerId: string) {
  setPendingTeamAssignments(getPendingTeamAssignments().filter((p) => p.playerId !== playerId))
}

// Age (in full years) as of today, from a YYYY-MM-DD date of birth.
export function calcAge(dob: string): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--
  return age
}

// Maps a player's real age to the age group they should play in this season.
// The club runs single-year brackets (U11, U12, U13...) rather than the
// 2-year "divisions" used for scheduling, plus an "Academy" tier for the
// youngest kids. Once a player is 20+ they're Senior-eligible, which is a
// manual manager decision (tryouts / ability), so this returns null for them.
export function computeTargetAgeGroup(age: number): { id: string; name: string } | null {
  if (age < 8) return { id: 'academy', name: 'Academy' }
  if (age <= 19) return { id: `u${age + 1}`, name: `U${age + 1}` }
  return null
}

// Ensures an AgeGroup entry exists (creating a single default "A" division
// if it's brand new), returns the age group id.
export function ensureAgeGroup(id: string, name: string): string {
  const groups = getAgeGroups()
  if (groups.some((g) => g.id === id)) return id
  const ordinal = id === 'academy' ? 0 : parseInt(id.replace('u', ''), 10) || 0
  const next: AgeGroup = {
    id,
    name,
    minAge: Math.max(0, ordinal - 1),
    maxAge: ordinal,
    divisions: [{ id: `${id}-a`, name: 'A', level: 1 }],
  }
  setAgeGroups([...groups, next])
  return id
}

// Kept for callers that want to explicitly spin up a team for an age group
// (e.g. a manager-triggered "quick create" action) — but season promotion no
// longer calls this automatically; team creation is manager-only.
export function ensureTeamForAgeGroup(ageGroupId: string, ageGroupName: string, gender: Team['gender'], seasonLabel: string): string {
  const teams = getTeams()
  const existing = teams.find((t) => t.ageGroupId === ageGroupId && t.gender === gender)
  if (existing) return existing.id
  const divisionId = `${ageGroupId}-a`
  const id = `${ageGroupId}-${gender.toLowerCase()}-${Date.now().toString(36)}`
  const team: Team = {
    id,
    name: `Dublin Lions ${ageGroupName} ${gender}`,
    gender,
    ageGroupId,
    divisionId,
    coach: 'TBC',
    players: [],
    season: seasonLabel,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  }
  setTeams([...teams, team])
  return id
}

export interface StartSeasonResult {
  label: string
  promotedCount: number
  needsSeniorAssignment: Player[]
  needsTeamAssignment: PendingTeamAssignment[]
}

// Starts a new season: resets every team's win/loss/points record, then
// promotes every player whose real age now puts them in a different age
// bracket. The age group itself is auto-created (so it shows up as a tab for
// the manager to work with), but the *team* is not — team creation is
// manager-only, so a player who lands in a bracket with no team yet is
// queued for manual assignment instead of moved automatically. Players who've
// aged into Senior territory (20+) are likewise left where they are and
// queued for the manager to place by hand.
export function startNewSeason(label: string): StartSeasonResult {
  // Snapshot the roster before any age-group auto-creation happens, so
  // "current team" lookups reflect last season's assignments rather than
  // partially rebuilt state.
  const teamsBefore = getTeams()
  const players = getPlayers()
  const needsSeniorAssignment: Player[] = []
  const needsTeamAssignment: PendingTeamAssignment[] = []
  let promotedCount = 0

  const updatedPlayers = players.map((p) => {
    const age = calcAge(p.dob)
    if (age == null) return p
    const target = computeTargetAgeGroup(age)
    const currentTeams = p.teamIds.map((tid) => teamsBefore.find((t) => t.id === tid)).filter(Boolean) as Team[]
    const onSenior = currentTeams.some((t) => t.ageGroupId === 'senior')

    if (target == null) {
      // Aged out of U20 — manual call, don't auto-move them.
      if (!onSenior) needsSeniorAssignment.push(p)
      return p
    }

    const alreadyInTarget = currentTeams.some((t) => t.ageGroupId === target.id)
    if (alreadyInTarget || onSenior) return p

    ensureAgeGroup(target.id, target.name)
    const gender: Team['gender'] = p.gender === 'Male' ? 'Boys' : 'Girls'
    const existingTeam = teamsBefore.find((t) => t.ageGroupId === target.id && t.gender === gender)

    if (!existingTeam) {
      // No team for this bracket yet — leave the player on their current team
      // and queue them for the manager to move once they've created one.
      needsTeamAssignment.push({ playerId: p.id, ageGroupId: target.id, ageGroupName: target.name, gender })
      return p
    }

    // Move the player off their old (non-senior) youth teams and onto the new one.
    const nonSeniorOldIds = currentTeams.filter((t) => t.ageGroupId !== 'senior').map((t) => t.id)
    const keptTeamIds = p.teamIds.filter((tid) => !nonSeniorOldIds.includes(tid))
    promotedCount++
    return { ...p, teamIds: [...keptTeamIds, existingTeam.id] }
  })

  // Reset every team's record for the new season, then rebuild each team's
  // players[] roster from the updated player records.
  const finalTeams = getTeams().map((t) => ({
    ...t,
    season: label,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    players: updatedPlayers.filter((p) => p.teamIds.includes(t.id)).map((p) => p.id),
  }))

  setPlayers(updatedPlayers)
  setTeams(finalTeams)
  setSeason({ label, startedAt: new Date().toISOString(), status: 'active' })
  setPendingSeniorPlayers(Array.from(new Set([...getPendingSeniorPlayers(), ...needsSeniorAssignment.map((p) => p.id)])))
  setPendingTeamAssignments([
    ...getPendingTeamAssignments().filter((pt) => !needsTeamAssignment.some((n) => n.playerId === pt.playerId)),
    ...needsTeamAssignment,
  ])

  return { label, promotedCount, needsSeniorAssignment, needsTeamAssignment }
}

// Ends the current season: snapshots standings + fixtures into history, then
// clears the fixture list so the new season starts with a clean slate.
export function endSeason(): SeasonHistoryEntry {
  const season = getSeason()
  const teams = getTeams()
  const standings: SeasonStanding[] = teams.map((t) => ({
    teamId: t.id,
    name: t.name,
    ageGroupId: t.ageGroupId,
    wins: t.wins,
    losses: t.losses,
    pointsFor: t.pointsFor,
    pointsAgainst: t.pointsAgainst,
  }))
  const entry: SeasonHistoryEntry = {
    label: season.label,
    startedAt: season.startedAt,
    endedAt: new Date().toISOString(),
    standings,
    fixtures: getFixtures(),
  }
  setSeasonHistory([entry, ...getSeasonHistory()])
  setFixtures([])
  setSeason({ ...season, status: 'ended', endedAt: entry.endedAt })
  return entry
}

// Restores a season from history: re-applies its archived standings + fixtures
// as the active season. Whatever is currently active gets archived first (as
// its own history entry) so nothing is lost by restoring an older one.
export function restoreSeasonFromHistory(historyIndex: number): SeasonHistoryEntry | null {
  const history = getSeasonHistory()
  const entry = history[historyIndex]
  if (!entry) return null

  const current = getSeason()
  const currentTeams = getTeams()
  const currentEntry: SeasonHistoryEntry = {
    label: current.label,
    startedAt: current.startedAt,
    endedAt: new Date().toISOString(),
    standings: currentTeams.map((t) => ({
      teamId: t.id,
      name: t.name,
      ageGroupId: t.ageGroupId,
      wins: t.wins,
      losses: t.losses,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
    })),
    fixtures: getFixtures(),
  }

  // Re-apply the archived standings onto today's teams (rosters/coaches are
  // left as they are now — only the record + season label is rolled back).
  const restoredTeams = currentTeams.map((t) => {
    const stand = entry.standings.find((s) => s.teamId === t.id)
    return stand
      ? { ...t, wins: stand.wins, losses: stand.losses, pointsFor: stand.pointsFor, pointsAgainst: stand.pointsAgainst, season: entry.label }
      : t
  })

  setTeams(restoredTeams)
  setFixtures(entry.fixtures)
  setSeason({ label: entry.label, startedAt: entry.startedAt, status: 'active' })
  setSeasonHistory([currentEntry, ...history.filter((_, i) => i !== historyIndex)])

  return entry
}

// Applies one flat adult/kid price to every fixture. Individual fixtures can
// still be overridden afterwards from the fixture edit form.
export function applyDefaultTicketPriceToAllFixtures(adultPrice: number, kidPrice: number) {
  setDefaultTicketPrice({ adultPrice, kidPrice })
  const fixtures = getFixtures().map((f) => ({ ...f, ticketsEnabled: true, adultPrice, kidPrice }))
  setFixtures(fixtures)
}

/* ─────────────────── Stats ─────────────────── */

export function computeClubStats() {
  const players = getRosterListedMembers()
  const teams = getTeams()
  const payments = getPayments()
  return {
    totalPlayers: players.length,
    totalTeams: teams.length,
    paidPlayers: players.filter((p) => p.status === 'Paid').length,
    pendingPlayers: players.filter((p) => p.status === 'Pending').length,
    overduePlayers: players.filter((p) => p.status === 'Overdue').length,
    monthlyRevenue: payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0),
    totalWins: teams.reduce((s, t) => s + t.wins, 0),
    totalLosses: teams.reduce((s, t) => s + t.losses, 0),
    biRegistered: players.filter((p) => p.registeredWithBI).length,
  }
}

export function getTeamPlayers(teamId: string): Player[] {
  const players = getPlayers()
  return players.filter((p) => p.teamIds.includes(teamId))
}

export function getPlayerTeams(playerId: string): Team[] {
  const player = getPlayers().find((p) => p.id === playerId)
  if (!player) return []
  const teams = getTeams()
  return teams.filter((t) => player.teamIds.includes(t.id))
}

/** Add a roster member to a team (updates player + team records and team chat). */
export function assignPlayerToTeam(playerId: string, teamId: string): Player | null {
  const players = getPlayers()
  const player = players.find((p) => p.id === playerId)
  if (!player || player.teamIds.includes(teamId)) return player ?? null

  const nextPlayers = players.map((p) =>
    p.id === playerId ? { ...p, teamIds: [...p.teamIds, teamId] } : p,
  )
  const nextTeams = getTeams().map((t) =>
    t.id === teamId && !t.players.includes(playerId)
      ? { ...t, players: [...t.players, playerId] }
      : t,
  )
  setPlayers(nextPlayers)
  setTeams(nextTeams)

  if (isChildRosterPlayer(player)) {
    const parent = getParentForChildRosterPlayer(playerId)
    if (parent) addChatMember(teamId, parent.id)
  } else if (!isClubAdminEmail(player.email)) {
    addChatMember(teamId, playerId)
  }

  return nextPlayers.find((p) => p.id === playerId) ?? null
}

/** Remove a roster member from a team. */
export function unassignPlayerFromTeam(playerId: string, teamId: string): void {
  const players = getPlayers()
  const player = players.find((p) => p.id === playerId)
  if (!player || !player.teamIds.includes(teamId)) return

  const nextPlayers = players.map((p) =>
    p.id === playerId ? { ...p, teamIds: p.teamIds.filter((tid) => tid !== teamId) } : p,
  )
  const nextTeams = getTeams().map((t) =>
    t.id === teamId ? { ...t, players: t.players.filter((pid) => pid !== playerId) } : t,
  )
  setPlayers(nextPlayers)
  setTeams(nextTeams)

  if (isChildRosterPlayer(player)) {
    const parent = getParentForChildRosterPlayer(playerId)
    if (parent) {
      const stillOnTeam = getChildRosterPlayersForParent(parent.id).some((c) => c.teamIds.includes(teamId))
      if (!stillOnTeam) removeChatMember(teamId, parent.id)
    }
  } else {
    removeChatMember(teamId, playerId)
  }
}

export function getUnassignedRosterMembers(): Player[] {
  return getRosterListedMembers().filter((p) => p.teamIds.length === 0)
}

export function getAgeGroupName(id: string): string {
  return getAgeGroups().find((g) => g.id === id)?.name || id
}

export function getDivisionName(ageGroupId: string, divisionId: string): string {
  const ag = getAgeGroups().find((g) => g.id === ageGroupId)
  return ag?.divisions.find((d) => d.id === divisionId)?.name || divisionId
}

export function getTeamAgeDivisionLabel(team: Team): string {
  return `${getAgeGroupName(team.ageGroupId)} — ${getDivisionName(team.ageGroupId, team.divisionId)}`
}

/* ─────────────────── Chat Messages ─────────────────── */

export function getChatMessages(): ChatMessage[] {
  return getStore<ChatMessage[]>(KEYS.chatMessages, [])
}

export function setChatMessages(v: ChatMessage[]) {
  setStore(KEYS.chatMessages, v)
}

/* ─────────────────── Chat Membership (per team/room) ─────────────────── */

type ChatMembersMap = Record<string, ChatRoomMembership>

export function getChatMembersMap(): ChatMembersMap {
  return getStore<ChatMembersMap>(KEYS.chatMembers, {})
}

export function setChatMembersMap(v: ChatMembersMap) {
  setStore(KEYS.chatMembers, v)
}

// One-time-per-write cleanup of the bundled demo/placeholder roster (Kevin
// Anyanwu, Tiago Pereira, etc.) so it doesn't keep showing up in team
// rosters, Chat Members lists, or payment history once real players exist.
// Safe to call on every app load — it's idempotent (only writes if a demo
// id is actually still present) and only ever removes the original seeded
// ids, so it never touches real players/teams/payments added afterwards.
const DEMO_PLAYER_IDS = new Set(defaultPlayers.map((p) => p.id))
const DEMO_PAYMENT_IDS = new Set(defaultPayments.map((p) => p.id))

export function pruneDemoSeedData() {
  const players = getPlayers()
  if (players.some((p) => DEMO_PLAYER_IDS.has(p.id))) {
    setPlayers(players.filter((p) => !DEMO_PLAYER_IDS.has(p.id)))
  }

  const teams = getTeams()
  if (teams.some((t) => t.players.some((pid) => DEMO_PLAYER_IDS.has(pid)))) {
    setTeams(teams.map((t) => ({ ...t, players: t.players.filter((pid) => !DEMO_PLAYER_IDS.has(pid)) })))
  }

  const payments = getPayments()
  if (payments.some((p) => DEMO_PAYMENT_IDS.has(p.id))) {
    setPayments(payments.filter((p) => !DEMO_PAYMENT_IDS.has(p.id)))
  }

  const sessions = getSessions()
  if (sessions.some((s) => s.attendance.some((pid) => DEMO_PLAYER_IDS.has(pid)))) {
    setSessions(sessions.map((s) => ({ ...s, attendance: s.attendance.filter((pid) => !DEMO_PLAYER_IDS.has(pid)) })))
  }

  const chatMap = getChatMembersMap()
  let chatChanged = false
  const nextChatMap: ChatMembersMap = {}
  for (const [teamId, room] of Object.entries(chatMap)) {
    const memberIds = room.memberIds.filter((id) => !DEMO_PLAYER_IDS.has(id))
    const adminIds = room.adminIds.filter((id) => !DEMO_PLAYER_IDS.has(id))
    if (memberIds.length !== room.memberIds.length || adminIds.length !== room.adminIds.length) chatChanged = true
    nextChatMap[teamId] = { memberIds, adminIds }
  }
  if (chatChanged) setChatMembersMap(nextChatMap)
}

export function getChatRoom(teamId: string): ChatRoomMembership {
  const map = getChatMembersMap()
  if (map[teamId]) {
    const room = map[teamId]
    const players = getPlayers()
    const memberIds = room.memberIds.filter((id) => {
      const p = players.find((pl) => pl.id === id)
      return !p || !isChildRosterPlayer(p)
    })
    return { memberIds, adminIds: room.adminIds }
  }
  return { memberIds: getChatEligibleMemberIds(teamId), adminIds: [] }
}

export function setChatRoom(teamId: string, room: ChatRoomMembership) {
  const map = getChatMembersMap()
  map[teamId] = room
  setChatMembersMap(map)
}

export function addChatMember(teamId: string, playerId: string) {
  const room = getChatRoom(teamId)
  if (!room.memberIds.includes(playerId)) {
    room.memberIds = [...room.memberIds, playerId]
    setChatRoom(teamId, room)
  }
}

export function removeChatMember(teamId: string, playerId: string) {
  const room = getChatRoom(teamId)
  room.memberIds = room.memberIds.filter((id) => id !== playerId)
  room.adminIds = room.adminIds.filter((id) => id !== playerId)
  setChatRoom(teamId, room)
}

export function setChatAdmin(teamId: string, playerId: string, isAdmin: boolean) {
  const room = getChatRoom(teamId)
  if (isAdmin) {
    if (!room.adminIds.includes(playerId)) room.adminIds = [...room.adminIds, playerId]
    if (!room.memberIds.includes(playerId)) room.memberIds = [...room.memberIds, playerId]
  } else {
    room.adminIds = room.adminIds.filter((id) => id !== playerId)
  }
  setChatRoom(teamId, room)
}

export function addChatMessage(teamId: string, senderName: string, senderRole: string, text: string) {
  const messages = getChatMessages()
  messages.push({
    id: `msg-${Date.now().toString(36)}`,
    teamId,
    senderName,
    senderRole,
    text,
    timestamp: new Date().toISOString(),
  })
  setChatMessages(messages)
}

/* ─────────────────── Store / Products / Cart ─────────────────── */

export interface Product {
  id: string; name: string; description: string; price: number; category: string
  imageKey: string; stock: number; active: boolean; createdAt: string
}
export interface Order {
  id: string; customerName: string; customerEmail: string
  items: { productId: string; productName: string; price: number; quantity: number }[]
  total: number; status: 'pending' | 'paid' | 'shipped' | 'cancelled'; date: string
}

export interface ChatMessage {
  id: string
  teamId: string
  senderName: string
  senderRole: string
  text: string
  timestamp: string
}
export interface CartItem { productId: string; quantity: number }

export const LOW_STOCK_THRESHOLD = 5

export function getProductById(productId: string): Product | undefined {
  return getProducts().find((p) => p.id === productId)
}

export function getCartQuantityForProduct(productId: string): number {
  return getCart().find((c) => c.productId === productId)?.quantity ?? 0
}

export function getRemainingStock(productId: string): number {
  const product = getProductById(productId)
  if (!product) return 0
  return Math.max(0, product.stock - getCartQuantityForProduct(productId))
}

export function canAddToCart(productId: string, qty = 1): { ok: boolean; reason?: string } {
  const product = getProductById(productId)
  if (!product || !product.active) return { ok: false, reason: 'This product is unavailable.' }
  if (product.stock <= 0) return { ok: false, reason: `${product.name} is out of stock.` }
  const remaining = getRemainingStock(productId)
  if (qty > remaining) {
    return {
      ok: false,
      reason: remaining === 0
        ? `${product.name} is out of stock.`
        : `Only ${remaining} left for ${product.name}.`,
    }
  }
  return { ok: true }
}

export function validateCartStock(): { ok: boolean; errors: string[] } {
  const products = getProducts()
  const cart = getCart()
  const errors: string[] = []
  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId)
    if (!product || !product.active) {
      errors.push('An item in your cart is no longer available.')
      continue
    }
    if (product.stock <= 0) errors.push(`${product.name} is out of stock.`)
    else if (item.quantity > product.stock) errors.push(`Only ${product.stock} of ${product.name} left in stock.`)
  }
  return { ok: errors.length === 0, errors }
}

/** Adjust cart quantities when stock changes; returns user-facing warnings. */
export function syncCartToStock(): string[] {
  const products = getProducts()
  const cart = getCart()
  const warnings: string[] = []
  const next: CartItem[] = []

  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId)
    if (!product || !product.active || product.stock <= 0) {
      warnings.push(`${product?.name || 'An item'} is out of stock and was removed from your cart.`)
      continue
    }
    if (item.quantity > product.stock) {
      warnings.push(`${product.name}: quantity reduced to ${product.stock} (only ${product.stock} left).`)
      next.push({ productId: item.productId, quantity: product.stock })
    } else {
      next.push(item)
    }
  }

  if (next.length !== cart.length || next.some((c, i) => c.quantity !== cart[i]?.quantity)) {
    setCart(next)
  }
  return warnings
}

const defaultProducts: Product[] = [
  { id: 'prod-1', name: 'Home Jersey', description: 'Official match jersey — breathable mesh, club crest. Adult S–XXL.', price: 55, category: 'Jerseys', imageKey: '', stock: 25, active: true, createdAt: '2025-01-01' },
  { id: 'prod-2', name: 'Away Jersey', description: 'White away kit with navy trim.', price: 55, category: 'Jerseys', imageKey: '', stock: 20, active: true, createdAt: '2025-01-01' },
  { id: 'prod-3', name: 'Club Hoodie', description: 'Navy hoodie with embroidered crest. Fleece-lined.', price: 45, category: 'Apparel', imageKey: '', stock: 30, active: true, createdAt: '2025-01-01' },
  { id: 'prod-4', name: 'Training Shorts', description: 'Quick-dry shorts with club logo.', price: 25, category: 'Apparel', imageKey: '', stock: 40, active: true, createdAt: '2025-01-01' },
  { id: 'prod-5', name: 'Club Basketball', description: 'Size 7 composite leather ball.', price: 35, category: 'Equipment', imageKey: '', stock: 15, active: true, createdAt: '2025-01-01' },
  { id: 'prod-6', name: 'Club Cap', description: 'Curved-brim snapback — navy with gold lion.', price: 20, category: 'Accessories', imageKey: '', stock: 50, active: true, createdAt: '2025-01-01' },
  { id: 'prod-7', name: 'Club Scarf', description: 'Navy and gold supporter scarf.', price: 15, category: 'Accessories', imageKey: '', stock: 35, active: true, createdAt: '2025-01-01' },
  { id: 'prod-8', name: 'Water Bottle', description: '750ml insulated stainless steel with crest.', price: 18, category: 'Accessories', imageKey: '', stock: 60, active: true, createdAt: '2025-01-01' },
  { id: 'prod-9', name: 'Gym Bag', description: 'Medium duffel with shoe compartment.', price: 30, category: 'Equipment', imageKey: '', stock: 12, active: true, createdAt: '2025-01-01' },
  { id: 'prod-10', name: 'Youth Starter Kit', description: 'Jersey, shorts, basketball, water bottle bundle.', price: 95, category: 'Kits', imageKey: '', stock: 10, active: true, createdAt: '2025-01-01' },
]

export const getProducts = () => getStore<Product[]>('dlbc_products', defaultProducts)
export const setProducts = (v: Product[]) => setStore('dlbc_products', v)
export const getOrders = () => getStore<Order[]>('dlbc_orders', [])
export const setOrders = (v: Order[]) => setStore('dlbc_orders', v)

const CART_KEY_PREFIX = 'dlbc_cart'
const LEGACY_CART_KEY = 'dlbc_cart'

/** Stable cart owner — one cart per signed-in email, or a shared guest cart. */
export function getCartOwnerKey(): string {
  const email = getLoggedInContact()?.email?.trim().toLowerCase()
  return email || 'guest'
}

function getCartStorageKey(): string {
  return `${CART_KEY_PREFIX}:${getCartOwnerKey()}`
}

function readCartItems(key: string): CartItem[] {
  try {
    let raw = localStorage.getItem(key)
    if (!raw && key === `${CART_KEY_PREFIX}:guest`) {
      const legacy = localStorage.getItem(LEGACY_CART_KEY)
      if (legacy) {
        localStorage.setItem(key, legacy)
        localStorage.removeItem(LEGACY_CART_KEY)
        raw = legacy
      }
    }
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

export const getCart = (): CartItem[] => readCartItems(getCartStorageKey())

export function setCart(v: CartItem[]) {
  localStorage.setItem(getCartStorageKey(), JSON.stringify(v))
  window.dispatchEvent(new Event('dlbc-cart-change'))
}
export function addToCart(productId: string): { ok: boolean; reason?: string } {
  const check = canAddToCart(productId, 1)
  if (!check.ok) return check
  const cart = getCart()
  const existing = cart.find((c) => c.productId === productId)
  if (existing) existing.quantity += 1
  else cart.push({ productId, quantity: 1 })
  setCart(cart)
  return { ok: true }
}
export function removeFromCart(productId: string) { setCart(getCart().filter((c) => c.productId !== productId)) }
export function updateCartQuantity(productId: string, quantity: number): { ok: boolean; reason?: string } {
  if (quantity <= 0) {
    removeFromCart(productId)
    return { ok: true }
  }
  const product = getProductById(productId)
  if (!product) return { ok: false, reason: 'Product unavailable.' }
  if (product.stock <= 0) return { ok: false, reason: `${product.name} is out of stock.` }
  if (quantity > product.stock) {
    return { ok: false, reason: `Only ${product.stock} of ${product.name} left in stock.` }
  }
  const cart = getCart()
  const item = cart.find((c) => c.productId === productId)
  if (item) {
    item.quantity = quantity
    setCart(cart)
  }
  return { ok: true }
}
export function clearCart() { setCart([]) }
export function getCartCount(): number { return getCart().reduce((s, c) => s + c.quantity, 0) }
export function getCartTotal(): number { const products = getProducts(); return getCart().reduce((s, c) => { const p = products.find((pr) => pr.id === c.productId); return s + (p ? p.price * c.quantity : 0) }, 0) }
export function createPendingOrder(customerName: string, customerEmail: string): { order: Order | null; errors?: string[] } {
  const validation = validateCartStock()
  if (!validation.ok) return { order: null, errors: validation.errors }
  const products = getProducts(); const cart = getCart(); if (cart.length === 0) return { order: null, errors: ['Your cart is empty.'] }
  const items = cart.map((c) => { const p = products.find((pr) => pr.id === c.productId); return { productId: c.productId, productName: p?.name || 'Unknown', price: p?.price || 0, quantity: c.quantity } })
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const order: Order = { id: `ord-${Date.now()}`, customerName, customerEmail, items, total, status: 'pending', date: new Date().toISOString().split('T')[0] }
  setOrders([order, ...getOrders()])
  return { order }
}

export function placeOrder(customerName: string, customerEmail: string): { order: Order | null; errors?: string[] } {
  const result = createPendingOrder(customerName, customerEmail)
  if (!result.order) return result
  clearCart()
  return result
}

export function markOrderPaid(orderId: string, cardLast4?: string) {
  const orders = getOrders()
  const idx = orders.findIndex((o) => o.id === orderId)
  if (idx === -1) return null
  const order = orders[idx]
  if (order.status === 'paid') return order

  const products = getProducts()
  const updatedProducts = products.map((p) => {
    const item = order.items.find((i) => i.productId === p.id)
    return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
  })
  setProducts(updatedProducts)

  orders[idx] = { ...order, status: 'paid' }
  setOrders(orders)
  recordGuestCardPayment({
    payerName: order.customerName,
    payerEmail: order.customerEmail,
    amount: order.total,
    plan: `Store order ${order.id}`,
    cardLast4,
    referenceId: order.id,
    method: 'Stripe',
  })
  clearCart()
  return orders[idx]
}
