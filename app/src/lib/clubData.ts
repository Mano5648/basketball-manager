/* ───────────────────────────────────────────────────────────
   Dublin Lions Basketball Club — Data Layer
   All data persists to localStorage. No hardcoded mock data.
   ─────────────────────────────────────────────────────────── */

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
}

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
}

export function clearStore(key: string) {
  localStorage.removeItem(key)
  window.dispatchEvent(new StorageEvent('storage', { key }))
}

/* ─────────────────── Typed Getters / Setters ─────────────────── */

export const getAgeGroups = () => getStore(KEYS.ageGroups, defaultAgeGroups)
export const setAgeGroups = (v: AgeGroup[]) => setStore(KEYS.ageGroups, v)

export const getTeams = () => getStore(KEYS.teams, defaultTeams)
export const setTeams = (v: Team[]) => setStore(KEYS.teams, v)

export const getPlayers = () => getStore(KEYS.players, defaultPlayers)
export const setPlayers = (v: Player[]) => setStore(KEYS.players, v)

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

/* ─────────────────── Stats ─────────────────── */

export function computeClubStats() {
  const players = getPlayers()
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

export function getChatRoom(teamId: string): ChatRoomMembership {
  const map = getChatMembersMap()
  if (map[teamId]) return map[teamId]
  // Default: seed from the team's roster, no admins yet.
  const team = getTeams().find((t) => t.id === teamId)
  return { memberIds: team ? [...team.players] : [], adminIds: [] }
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

export const getCart = (): CartItem[] => { try { return JSON.parse(localStorage.getItem('dlbc_cart') || '[]') } catch { return [] } }
export function setCart(v: CartItem[]) { localStorage.setItem('dlbc_cart', JSON.stringify(v)); window.dispatchEvent(new Event('dlbc-cart-change')) }
export function addToCart(productId: string) { const cart = getCart(); const e = cart.find((c) => c.productId === productId); if (e) e.quantity += 1; else cart.push({ productId, quantity: 1 }); setCart(cart) }
export function removeFromCart(productId: string) { setCart(getCart().filter((c) => c.productId !== productId)) }
export function updateCartQuantity(productId: string, quantity: number) { if (quantity <= 0) { removeFromCart(productId); return }; const cart = getCart(); const item = cart.find((c) => c.productId === productId); if (item) { item.quantity = quantity; setCart(cart) } }
export function clearCart() { setCart([]) }
export function getCartCount(): number { return getCart().reduce((s, c) => s + c.quantity, 0) }
export function getCartTotal(): number { const products = getProducts(); return getCart().reduce((s, c) => { const p = products.find((pr) => pr.id === c.productId); return s + (p ? p.price * c.quantity : 0) }, 0) }
export function placeOrder(customerName: string, customerEmail: string) {
  const products = getProducts(); const cart = getCart(); if (cart.length === 0) return null
  const items = cart.map((c) => { const p = products.find((pr) => pr.id === c.productId); return { productId: c.productId, productName: p?.name || 'Unknown', price: p?.price || 0, quantity: c.quantity } })
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const order: Order = { id: `ord-${Date.now()}`, customerName, customerEmail, items, total, status: 'pending', date: new Date().toISOString().split('T')[0] }
  const updated = products.map((p) => { const ci = cart.find((c) => c.productId === p.id); return ci ? { ...p, stock: Math.max(0, p.stock - ci.quantity) } : p })
  setProducts(updated); setOrders([order, ...getOrders()]); clearCart(); return order
}
