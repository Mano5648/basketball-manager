import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { easeOut } from '@/components/motion/presets'
import { asset, useSiteImage } from '@/hooks/useSiteImages'
import {
  getPlayers as getClubPlayers,
  getTeams as getClubTeams,
  getChatMessages,
  addChatMessage,
  deleteOwnChatMessage,
  getChatSendStatusMap,
  setChatSendStatus,
  type ChatSendStatus,
  getAnnouncements as getClubAnnouncements,
  getPayments,
  getOrders,
  findPlayerByEmail,
  getFeeConfigForPlayer,
  getSelfFeeConfigForPlayer,
  hasPaidThisMonth,
  hasPaidOneTimeFee,
  recordCardPayment,
  isMembershipPaidForCurrentMonth,
  isPlayerAccountActive,
  upsertPlayerFromAuth,
  needsPlayerOnboarding,
  completePlayerOnboarding,
  getMemberPaymentFocus,
  hasTeamAssignment,
  getSessionsForPlayer,
  calcAgeFromBirthYear,
  isValidBirthYear,
  isValidChildDob,
  getRegisteredChildren,
  getFeeConfigForBirthYear,
  getPlayerBirthYear,
  updateRegisteredChildren,
  getAccessibleChatTeams,
  ensureChatMembership,
  publishChatNow,
  pullMergedChatState,
  calcAge,
  reconcileClubRoster,
  ensureClubRosterSynced,
  whenClubDataReady,
  syncPlayerProfileFromAuthMetadata,
  getChildRosterPlayersForParent,
  childRosterPlayerId,
  getTeamAgeDivisionLabel,
  getTeamIdsForMember,
  type RegisteredChild,
  type Player as ClubPlayer,
  type ChatMessage,
  type Payment,
  type Order,
  type Session,
  type Team as ClubTeam,
} from '@/lib/clubData'
import { PaymentCheckout } from '@/components/PaymentCheckout'
import { redirectToStripeCheckout, isStripeCheckoutConfigured } from '@/lib/stripeCheckout'
import { sendPurchaseConfirmationEmail } from '@/lib/purchaseEmail'
import { toAbsoluteImageUrl } from '@/lib/imageUrl'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { BirthYearPicker, ChildDobPicker } from '@/components/forms/BirthDateFields'
import { TeamChatUI } from '@/components/chat/TeamChatUI'
import { ScheduleTimeGrid } from '@/components/dashboard/ScheduleTimeGrid'
import Store from '@/pages/Store'
import {
  LayoutDashboard,
  CreditCard,
  Calendar,
  CheckCircle,
  Bell,
  ShoppingBag,
  ChevronDown,
  LogOut,
  User,
  Shield,
  Clock,
  Loader2,
  MessageSquare,
  Trash2,
  CalendarDays,
  MapPin,
  Home,
  ArrowRight,
  Menu,
  Users,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'

interface PlayerUser {
  id: number
  email: string
  password: string
  name: string
  team: string
  position: string
  jersey: number
  membershipStatus: 'paid' | 'pending' | 'overdue'
  paymentPlan: 'monthly' | 'full' | 'per-session' | null
  phone?: string
  emergencyContact?: string
  jerseySize?: string
  role: 'player'
}

interface SessionEvent {
  id: string
  teamId: string
  date: string
  time: string
  title: string
  venue: string
  type: 'Training' | 'Match' | 'Social'
  attended?: boolean
  excused?: boolean
}

interface NotificationItem {
  id: string
  title: string
  message: string
  date: string
  read: boolean
  type: 'payment' | 'session' | 'announcement'
}

type TabKey = 'overview' | 'payments' | 'schedule' | 'children' | 'profile' | 'chat' | 'shop'

function getUser(): PlayerUser | null {
  const raw = localStorage.getItem('dlbc_user')
  if (!raw) return null
  try {
    const u = JSON.parse(raw)
    if (u.role !== 'player') return null
    return u as PlayerUser
  } catch {
    return null
  }
}

function saveUser(user: PlayerUser) {
  localStorage.setItem('dlbc_user', JSON.stringify(user))
}

function getPlayers(): PlayerUser[] {
  const raw = localStorage.getItem('dlbc_players')
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function savePlayers(players: PlayerUser[]) {
  localStorage.setItem('dlbc_players', JSON.stringify(players))
}

function syncUserFromRoster(user: PlayerUser): PlayerUser {
  const monthlyPaid = isMembershipPaidForCurrentMonth(user.email)
  return {
    ...user,
    team: '',
    position: '',
    jersey: 0,
    membershipStatus: monthlyPaid ? 'paid' : 'pending',
  }
}

function memberLine(user: PlayerUser): string {
  return user.email
}

function currentMonthLabel(now = new Date()) {
  return now.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })
}

function clubSessionToEvent(session: Session): SessionEvent {
  return {
    id: session.id,
    teamId: session.teamId,
    date: session.date,
    time: session.time,
    title: session.title,
    venue: session.location,
    type: session.type === 'Event' ? 'Social' : session.type,
  }
}

/* ponytail: local date helper for attendance compare */
function schedIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadClubScheduleForPlayer(player: ClubPlayer | null): SessionEvent[] {
  if (!player || !hasTeamAssignment(player)) return []
  return getSessionsForPlayer(player.id)
    .map(clubSessionToEvent)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

function getAttendanceStore(): Record<string, { attended?: boolean; excused?: boolean }> {
  const raw = localStorage.getItem('dlbc_session_attendance')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveAttendanceStore(store: Record<string, { attended?: boolean; excused?: boolean }>) {
  localStorage.setItem('dlbc_session_attendance', JSON.stringify(store))
}

const NOTIF_READ_KEY = 'dlbc_player_notif_read'
const NOTIF_DELETED_KEY = 'dlbc_player_notif_deleted'

function getNotifIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveNotifIdSet(key: string, ids: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...ids]))
}

async function updateAuthUserData(data: Record<string, unknown>): Promise<void> {
  if (!supabase) return
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { error } = await supabase.auth.updateUser({ data })
      if (!error) return
    } catch {
      /* transient network error — retry */
    }
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
  }
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const diffMs = Date.now() - d.getTime()
  const day = 24 * 60 * 60 * 1000
  if (diffMs < 0) return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
  if (diffMs < day) return 'Today'
  if (diffMs < 2 * day) return 'Yesterday'
  const days = Math.floor(diffMs / day)
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Build the member's notifications from REAL club data (no placeholders). */
function buildPlayerNotifications(clubPlayer: ClubPlayer | null): NotificationItem[] {
  const readIds = getNotifIdSet(NOTIF_READ_KEY)
  const deletedIds = getNotifIdSet(NOTIF_DELETED_KEY)
  const items: NotificationItem[] = []

  // 1) Outstanding membership fee.
  if (clubPlayer && !needsPlayerOnboarding(clubPlayer)) {
    const focus = getMemberPaymentFocus(clubPlayer)
    if (focus && !isMemberFeePaid(clubPlayer)) {
      const id = focus === 'monthly' ? `fee-monthly-${currentMonthLabel()}` : 'fee-registration'
      items.push({
        id,
        title: focus === 'monthly' ? 'Membership payment due' : 'Registration fee due',
        message:
          focus === 'monthly'
            ? `Your membership fee for ${currentMonthLabel()} hasn't been recorded yet. Pay it from the Payments tab.`
            : 'Your one-time registration fee is outstanding. Pay it from the Payments tab.',
        date: 'Now',
        read: readIds.has(id),
        type: 'payment',
      })
    }
  }

  // 2) Next upcoming session for the member's team.
  if (clubPlayer && hasTeamAssignment(clubPlayer)) {
    const todayIso = new Date().toISOString().split('T')[0]
    const next = loadClubScheduleForPlayer(clubPlayer).find((s) => s.date >= todayIso)
    if (next) {
      const id = `session-${next.id}`
      items.push({
        id,
        title: next.type === 'Match' ? 'Upcoming match' : `Upcoming ${next.type.toLowerCase()}`,
        message: `${next.title} on ${new Date(next.date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })} at ${next.time}, ${next.venue}.`,
        date: relativeDate(next.date),
        read: readIds.has(id),
        type: 'session',
      })
    }
  }

  // 3) Club announcements broadcast by the manager.
  for (const a of getClubAnnouncements()) {
    if (a.status !== 'Sent') continue
    const id = `ann-${a.id}`
    items.push({
      id,
      title: a.subject,
      message: a.message,
      date: relativeDate(a.date),
      read: readIds.has(id),
      type: 'announcement',
    })
  }

  return items.filter((n) => !deletedIds.has(n.id))
}


const TAB_CONFIG: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'My Dashboard', icon: LayoutDashboard },
  { key: 'payments', label: 'My Payments', icon: CreditCard },
  { key: 'schedule', label: 'My Schedule', icon: Calendar },
  { key: 'children', label: 'My Children', icon: Users },
  { key: 'chat', label: 'Team Chat', icon: MessageSquare },
  { key: 'shop', label: 'Club Shop', icon: ShoppingBag },
]

function tabTitle(key: TabKey): string {
  if (key === 'profile') return 'My Profile'
  if (key === 'children') return 'My Children'
  return TAB_CONFIG.find((t) => t.key === key)?.label ?? key
}

function isMemberFeePaid(player: ClubPlayer): boolean {
  const focus = getMemberPaymentFocus(player)
  if (!focus) return false
  return focus === 'monthly' ? hasPaidThisMonth(player.id) : hasPaidOneTimeFee(player.id)
}

/* ───────── First-login onboarding ───────── */
type ChildDraft = { id: string; name: string; dob: string; gender: 'Male' | 'Female' }

const MIN_CHILD_AGE = 10

function newChildDraft(): ChildDraft {
  return { id: `child-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name: '', dob: '', gender: 'Male' }
}

function OnboardingScreen({
  user,
  clubPlayer,
  onComplete,
}: {
  user: PlayerUser
  clubPlayer: ClubPlayer
  onComplete: (player: ClubPlayer) => void
}) {
  const reduceMotion = useReducedMotion()
  const [memberType, setMemberType] = useState<'player' | 'parent' | null>(null)
  const [children, setChildren] = useState<ChildDraft[]>([newChildDraft()])
  const [birthYear, setBirthYear] = useState('')
  const [alsoPlays, setAlsoPlays] = useState(false)
  const [parentBirthYear, setParentBirthYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!memberType) {
      setError('Please choose how you are registering.')
      return
    }
    if (memberType === 'parent') {
      const validChildren = children
        .map((c) => ({
          id: c.id,
          name: c.name.trim(),
          dob: c.dob.trim(),
          gender: c.gender,
        }))
        .filter((c) => c.name && isValidChildDob(c.dob))

      if (validChildren.length === 0) {
        setError(`Please add at least one child with a name and full date of birth (minimum age ${MIN_CHILD_AGE}).`)
        return
      }
      if (alsoPlays && !isValidBirthYear(parseInt(parentBirthYear, 10))) {
        setError('Please enter your year of birth if you are also playing.')
        return
      }
      setError('')
      setSaving(true)
      try {
        const updated = completePlayerOnboarding(clubPlayer.id, {
          memberType,
          registeredChildren: validChildren,
          birthYear: alsoPlays ? parseInt(parentBirthYear, 10) : undefined,
          alsoPlays,
        })
        if (!updated) {
          setError('Could not save your details. Please try again.')
          return
        }
        if (supabase) {
          await updateAuthUserData({
            memberType,
            registeredChildren: updated.registeredChildren ?? [],
            childrenUpdatedAt: updated.childrenUpdatedAt ?? Date.now(),
            alsoPlays: updated.alsoPlays ?? false,
            birthYear: updated.birthYear ?? null,
            onboardingCompletedAt: updated.onboardingCompletedAt ?? new Date().toISOString(),
          })
        }
        await ensureClubRosterSynced()
        onComplete(updated)
      } finally {
        setSaving(false)
      }
      return
    }

    const year = parseInt(birthYear, 10)
    if (!isValidBirthYear(year)) {
      setError('Please select your year of birth.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const updated = completePlayerOnboarding(clubPlayer.id, {
        memberType: 'player',
        birthYear: year,
      })
      if (!updated) {
        setError('Could not save your details. Please try again.')
        return
      }
      if (supabase) {
        await updateAuthUserData({
          memberType: 'player',
          birthYear: year,
          onboardingCompletedAt: updated.onboardingCompletedAt ?? new Date().toISOString(),
        })
      }
      await ensureClubRosterSynced()
      onComplete(updated)
    } finally {
      setSaving(false)
    }
  }

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: easeOut },
        }

  return (
    <div className="dashboard-shell player-dash player-onboarding min-h-[100dvh] flex items-center justify-center p-6 bg-[#f4f7fc]">
      <motion.div className="player-onboarding__card dash-card w-full max-w-lg p-8 md:p-10" {...fade(0)}>
        <p className="font-inter text-[11px] uppercase tracking-[0.28em] text-lions-600 font-semibold">Welcome</p>
        <h2 className="font-oswald font-bold text-3xl text-slate-900 mt-2">Hi {user.name.split(' ')[0]}</h2>
        <p className="font-inter text-slate-600 mt-2 leading-relaxed">
          Tell us a bit about who is joining Dublin Lions so we can set up your account.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setMemberType('parent'); setError('') }}
            className={`player-onboarding__choice ${memberType === 'parent' ? 'player-onboarding__choice--active' : ''}`}
          >
            <Users size={22} className="text-lions-600" />
            <span className="font-inter font-semibold text-slate-900">I&apos;m a parent</span>
            <span className="font-inter text-xs text-slate-500">Registering my child or children</span>
          </button>
          <button
            type="button"
            onClick={() => { setMemberType('player'); setError(''); setAlsoPlays(false) }}
            className={`player-onboarding__choice ${memberType === 'player' ? 'player-onboarding__choice--active' : ''}`}
          >
            <User size={22} className="text-lions-600" />
            <span className="font-inter font-semibold text-slate-900">I&apos;m a player</span>
            <span className="font-inter text-xs text-slate-500">Registering myself</span>
          </button>
        </div>

        {memberType === 'parent' && (
          <motion.div className="mt-5 space-y-4" {...fade(0.05)}>
            <div className="space-y-3">
              <p className="font-inter text-sm font-medium text-slate-800">Your children</p>
              {children.map((child, index) => (
                <div key={child.id} className="player-onboarding__child-row rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-inter text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Child {index + 1}
                    </p>
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setChildren((prev) => prev.filter((c) => c.id !== child.id))}
                        className="font-inter text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block font-inter text-sm font-medium text-slate-700 mb-1.5">Name</label>
                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, name: e.target.value } : c)))}
                      placeholder="e.g. Jamie O'Brien"
                      className="dash-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-sm font-medium text-slate-700 mb-1.5">Date of birth</label>
                    <ChildDobPicker
                      key={child.id}
                      id={`child-dob-${child.id}`}
                      value={child.dob}
                      onChange={(dob) => setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, dob } : c)))}
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-sm font-medium text-slate-700 mb-1.5">Gender</label>
                    <select
                      value={child.gender}
                      onChange={(e) => setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, gender: e.target.value as 'Male' | 'Female' } : c)))}
                      className="dash-input w-full"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setChildren((prev) => [...prev, newChildDraft()])}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-lions-400 hover:text-lions-700 font-inter text-sm transition-colors"
              >
                <Plus size={16} /> Add another child
              </button>
            </div>
            <label className="player-onboarding__checkbox flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={alsoPlays}
                onChange={(e) => {
                  setAlsoPlays(e.target.checked)
                  if (!e.target.checked) setParentBirthYear('')
                }}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-lions-600 focus:ring-lions-500"
              />
              <span className="font-inter text-sm text-slate-700 leading-snug">
                I also want to play myself
              </span>
            </label>
            {alsoPlays && (
              <div>
                <label className="block font-inter text-sm font-medium text-slate-700 mb-1.5">Your year of birth</label>
                <BirthYearPicker value={parentBirthYear} onChange={setParentBirthYear} />
              </div>
            )}
          </motion.div>
        )}

        {memberType === 'player' && (
          <motion.div className="mt-5" {...fade(0.05)}>
            <label className="block font-inter text-sm font-medium text-slate-700 mb-1.5">Your year of birth</label>
            <BirthYearPicker value={birthYear} onChange={setBirthYear} />
          </motion.div>
        )}

        {error && (
          <p className="mt-4 font-inter text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !memberType}
          className="mt-8 w-full btn-gold font-inter font-semibold text-sm uppercase tracking-wider py-3.5 rounded-xl disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Continue to my dashboard'}
        </button>
      </motion.div>
    </div>
  )
}

function formatChildDob(dob: string): string {
  const d = new Date(dob)
  if (isNaN(d.getTime())) return dob
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getRegisteredChildrenSummary(parent: ClubPlayer) {
  const registered = getRegisteredChildren(parent)
  if (registered.length === 0) return []

  const rosterChildren = getChildRosterPlayersForParent(parent.id)
  const teams = getClubTeams()

  return registered.map((child) => {
    const rosterId = childRosterPlayerId(parent.id, child.id)
    const rosterPlayer =
      rosterChildren.find((c) => c.id === rosterId || c.registeredChildId === child.id) ?? null
    const team = rosterPlayer?.teamIds[0]
      ? teams.find((t) => t.id === rosterPlayer.teamIds[0]) ?? null
      : null

    return {
      id: child.id,
      name: child.name,
      dob: child.dob,
      gender: child.gender || 'Male',
      age: calcAge(child.dob),
      teamName: team?.name ?? null,
      teamLabel: team ? getTeamAgeDivisionLabel(team) : null,
      assigned: !!team,
    }
  })
}

/* ───────── Overview Tab ───────── */
function OverviewTab({
  clubPlayer,
  onNavigate,
}: {
  clubPlayer: ClubPlayer | null
  onNavigate: (tab: TabKey) => void
}) {
  const reduceMotion = useReducedMotion()
  const paymentFocus = clubPlayer ? getMemberPaymentFocus(clubPlayer) : null
  const feePaid = clubPlayer ? isMemberFeePaid(clubPlayer) : false
  const hasSchedule = clubPlayer ? hasTeamAssignment(clubPlayer) : false
  const monthLabel = currentMonthLabel()
  const schedule = loadClubScheduleForPlayer(clubPlayer)
  const todayIso = new Date().toISOString().split('T')[0]
  const nextSession = hasSchedule ? schedule.find((s) => s.date >= todayIso) ?? schedule[0] : undefined
  const registeredChildren = clubPlayer ? getRegisteredChildrenSummary(clubPlayer) : []
  const clubNews = getClubAnnouncements()
    .filter((a) => a.status === 'Sent')
    .slice(0, 3)
    .map((a) => ({ id: a.id, title: a.subject, preview: a.message, date: relativeDate(a.date) }))

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: easeOut },
        }

  return (
    <div className="player-overview space-y-6">
      <motion.div className="player-welcome__meta flex flex-wrap items-center gap-3" {...fade(0)}>
          {paymentFocus ? (
            <span className={`player-membership-pill ${feePaid ? 'player-membership-pill--paid' : 'player-membership-pill--due'}`}>
              {feePaid
                ? paymentFocus === 'monthly'
                  ? `Paid · ${monthLabel}`
                  : 'Registration paid'
                : paymentFocus === 'monthly'
                  ? `Due · ${monthLabel}`
                  : 'Registration due'}
            </span>
          ) : (
            <span className="player-membership-pill player-membership-pill--due">Setup needed</span>
          )}
          <time className="player-welcome__date">
            {new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </time>
      </motion.div>

      <div className="player-bento">
        <motion.section className="player-bento__next dash-card" {...fade(0.06)}>
          <div className="player-bento__label">
            <Calendar size={16} />
            Next up
          </div>
          {hasSchedule && nextSession ? (
            <>
              <h3 className="player-bento__title">{nextSession.title}</h3>
              <p className="player-bento__detail">
                {new Date(nextSession.date).toLocaleDateString('en-IE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}{' '}
                · {nextSession.time}
              </p>
              <p className="player-bento__venue">
                <MapPin size={14} className="inline mr-1 -mt-0.5" />
                {nextSession.venue}
              </p>
              <span className={`player-type-tag player-type-tag--${nextSession.type.toLowerCase()}`}>
                {nextSession.type}
              </span>
            </>
          ) : hasSchedule ? (
            <p className="player-bento__detail">No upcoming sessions for your team yet.</p>
          ) : (
            <p className="player-bento__detail">
              Your training and match schedule will appear here once a coach assigns you to a team.
            </p>
          )}
          {hasSchedule && (
            <button type="button" onClick={() => onNavigate('schedule')} className="player-text-btn">
              Full schedule <ArrowRight size={14} />
            </button>
          )}
        </motion.section>

        {registeredChildren.length > 0 && (
          <motion.section className="player-bento__children dash-card" {...fade(0.08)}>
            <div className="player-bento__label">
              <Users size={16} />
              My children
            </div>
            <ul className="player-children-list">
              {registeredChildren.map((child) => (
                <li key={child.id} className="player-child-card">
                  <div className="player-child-card__avatar" aria-hidden>
                    <User size={18} />
                  </div>
                  <div className="player-child-card__body">
                    <p className="player-child-card__name">{child.name}</p>
                    <p className="player-child-card__meta">
                      {child.age !== null ? `Age ${child.age}` : 'Age pending'}
                      {' · '}
                      {formatChildDob(child.dob)}
                      {' · '}
                      {child.gender}
                    </p>
                    <p className="player-child-card__team">
                      {child.assigned ? (
                        <>
                          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                          <span>
                            {child.teamName}
                            {child.teamLabel ? ` · ${child.teamLabel}` : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock size={14} className="shrink-0" />
                          <span>Awaiting team assignment from your coach</span>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => onNavigate('children')} className="player-text-btn mt-4">
              Manage children <ArrowRight size={14} />
            </button>
          </motion.section>
        )}

        <motion.section className="player-bento__membership dash-card" {...fade(0.1)}>
          <div className="player-bento__label">
            <Shield size={16} />
            Membership
          </div>
          <h3 className="player-bento__title">{feePaid ? 'You\'re covered' : 'Payment needed'}</h3>
          <p className="player-bento__detail">
            {!paymentFocus
              ? 'Complete setup to see your membership fees.'
              : feePaid
                ? paymentFocus === 'monthly'
                  ? `Your fee for ${monthLabel} is recorded.`
                  : 'Your registration fee is on file.'
                : paymentFocus === 'monthly'
                  ? `No payment on file for ${monthLabel} yet.`
                  : 'Registration fee not paid yet.'}
          </p>
          {paymentFocus && !feePaid ? (
            <button type="button" onClick={() => onNavigate('payments')} className="club-store-cta w-full mt-4 font-inter font-semibold text-sm px-4 py-3 rounded-xl active:scale-[0.98] transition-all">
              Pay now
            </button>
          ) : paymentFocus && feePaid ? (
            <button type="button" onClick={() => onNavigate('payments')} className="player-text-btn">
              Payment history <ArrowRight size={14} />
            </button>
          ) : null}
        </motion.section>

        <motion.section className="player-bento__actions dash-card" {...fade(0.14)}>
          <div className="player-bento__label">Shortcuts</div>
          <div className="player-action-list">
            {[
              { label: 'Make a payment', icon: CreditCard, tab: 'payments' as TabKey, primary: true },
              ...(hasSchedule ? [{ label: 'My schedule', icon: Calendar, tab: 'schedule' as TabKey, primary: false }] : []),
              { label: 'My children', icon: Users, tab: 'children' as TabKey, primary: false },
              { label: 'Edit profile', icon: User, tab: 'profile' as TabKey, primary: false },
              { label: 'Club shop', icon: ShoppingBag, tab: 'shop' as TabKey, primary: false },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => onNavigate(action.tab)}
                className={action.primary ? 'player-action-item player-action-item--primary' : 'player-action-item'}
              >
                <action.icon size={18} />
                <span>{action.label}</span>
                <ArrowRight size={14} className="ml-auto opacity-50" />
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section className="player-bento__news dash-card" {...fade(0.18)}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="player-bento__label mb-0">
              <Bell size={16} />
              Club news
            </div>
          </div>
          <ul className="player-news-list">
            {clubNews.length === 0 ? (
              <li className="player-news-item">
                <div>
                  <p className="player-news-item__preview">No club announcements yet. Check back soon.</p>
                </div>
              </li>
            ) : (
              clubNews.map((item) => (
                <li key={item.id} className="player-news-item">
                  <div>
                    <p className="player-news-item__title">{item.title}</p>
                    <p className="player-news-item__preview">{item.preview}</p>
                  </div>
                  <span className="player-news-item__date">{item.date}</span>
                </li>
              ))
            )}
          </ul>
        </motion.section>
      </div>

      <motion.aside className="player-parent-note dash-card" {...fade(0.22)}>
        <p className="font-inter text-sm text-slate-600 leading-relaxed">
          {registeredChildren.length > 0 ? (
            <>
              <strong className="text-slate-800 font-semibold">Your registered children</strong> are listed above.
              Pay fees under Payments. Your coach will assign teams and schedules when ready.
            </>
          ) : (
            <>
              <strong className="text-slate-800 font-semibold">Registering a child?</strong>{' '}
              <button type="button" onClick={() => onNavigate('children')} className="text-lions-600 hover:text-lions-700 font-medium underline-offset-2 hover:underline">
                Add them under My Children
              </button>
              , then pay fees here. Your coach will assign a team and schedule when ready.
            </>
          )}
        </p>
      </motion.aside>
    </div>
  )
}

/* ───────── Receipt / statement helpers ───────── */
function formatPaymentDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function resolveClubPlayer(email: string, name: string) {
  return findPlayerByEmail(email) ?? upsertPlayerFromAuth({ email, name })
}

/* ───────── Payments Tab ───────── */
type PayHistoryFilter = 'all' | 'membership' | 'store'

function storeOrdersForEmail(email: string): Order[] {
  const key = email.trim().toLowerCase()
  return getOrders()
    .filter((o) => o.customerEmail.trim().toLowerCase() === key)
    .sort((a, b) => b.date.localeCompare(a.date))
}

function PaymentsTab({ user, onUpdateUser }: { user: PlayerUser; onUpdateUser: (u: PlayerUser) => void }) {
  const [clubPlayer, setClubPlayer] = useState(() => resolveClubPlayer(user.email, user.name))
  const monthLabel = currentMonthLabel()
  const [historyFilter, setHistoryFilter] = useState<PayHistoryFilter>('all')

  const [payments, setPayments] = useState<Payment[]>(() =>
    clubPlayer ? getPayments().filter((p) => p.playerId === clubPlayer.id) : [],
  )
  const [storeOrders, setStoreOrders] = useState<Order[]>(() => storeOrdersForEmail(user.email))
  const [checkout, setCheckout] = useState<{ plan: 'monthly' | 'oneTime'; amount: number; label: string } | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const membershipImageUrl = toAbsoluteImageUrl(useSiteImage('logo'))

  useEffect(() => {
    const sync = () => {
      if (!isPlayerAccountActive(user.email)) return
      const player = resolveClubPlayer(user.email, user.name)
      setClubPlayer(player)
      if (player) {
        setPayments(getPayments().filter((p) => p.playerId === player.id))
      }
      setStoreOrders(storeOrdersForEmail(user.email))
    }
    window.addEventListener('storage', sync)
    window.addEventListener('dlbc-auth-change', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('dlbc-auth-change', sync)
    }
  }, [user.email, user.name])

  if (!clubPlayer || !isPlayerAccountActive(user.email)) {
    return (
      <div className="dash-card p-8 text-center">
        <p className="font-inter text-slate-600">Your club membership is no longer active.</p>
      </div>
    )
  }

  if (needsPlayerOnboarding(clubPlayer)) {
    return (
      <div className="dash-card p-8 text-center max-w-md mx-auto">
        <p className="font-inter text-slate-600">Complete the welcome setup to see your membership fees.</p>
      </div>
    )
  }

  const fees = getFeeConfigForPlayer(clubPlayer.id)
  const registeredChildren = getRegisteredChildren(clubPlayer)
  const selfFees = clubPlayer.alsoPlays ? getSelfFeeConfigForPlayer(clubPlayer) : null
  const paymentFocus = getMemberPaymentFocus(clubPlayer)!
  const monthlyPaid = hasPaidThisMonth(clubPlayer.id)
  const oneTimePaid = hasPaidOneTimeFee(clubPlayer.id)
  const feePaid = paymentFocus === 'monthly'
    ? monthlyPaid && (!clubPlayer.alsoPlays || oneTimePaid)
    : oneTimePaid

  const startMembershipCheckout = async (plan: 'monthly' | 'oneTime', amount: number, label: string) => {
    setPayError('')
    const referenceId = `mem-${clubPlayer.id}-${plan}-${Date.now()}`
    setPaying(true)
    try {
      const redirected = await redirectToStripeCheckout({
        purchaseType: 'membership',
        referenceId,
        customerName: user.name || clubPlayer.name,
        customerEmail: user.email,
        playerId: clubPlayer.id,
        lineItems: [{ name: label, amountCents: Math.round(amount * 100), quantity: 1, imageUrl: membershipImageUrl }],
        metadata: {
          player_id: clubPlayer.id,
          plan_label: label,
          plan_type: plan,
        },
      })
      if (!redirected) {
        setCheckout({ plan, amount, label })
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Could not start payment')
    } finally {
      setPaying(false)
    }
  }

  const handleCheckoutSuccess = (plan: 'monthly' | 'oneTime', amount: number, cardLast4: string, cardholderName: string) => {
    if (!clubPlayer) return
    const planLabel = plan === 'monthly' ? 'Monthly membership' : 'One-time registration'
    const referenceId = `mem-${clubPlayer.id}-${plan}-${Date.now()}`
    recordCardPayment({
      playerId: clubPlayer.id,
      amount,
      plan: planLabel,
      cardLast4,
      payerName: cardholderName,
    })
    void sendPurchaseConfirmationEmail({
      customerName: cardholderName || user.name || clubPlayer.name,
      customerEmail: user.email,
      purchaseType: 'membership',
      referenceId,
      amountCents: Math.round(amount * 100),
      items: [{ name: planLabel, quantity: 1, amountCents: Math.round(amount * 100), imageUrl: membershipImageUrl }],
      planLabel,
    })
    setPayments(getPayments().filter((p) => p.playerId === clubPlayer.id))
    onUpdateUser(syncUserFromRoster({
      ...user,
      paymentPlan: plan === 'monthly' ? 'monthly' : user.paymentPlan,
    }))
    setCheckout(null)
  }

  const history = [
    ...payments.map((tx) => ({
      id: `pay-${tx.id}`,
      kind: 'membership' as const,
      title: tx.plan,
      detail: `${formatPaymentDate(tx.date)} · ${tx.method}`,
      amount: tx.amount,
      status: tx.status,
      date: tx.date,
    })),
    ...storeOrders.map((order) => ({
      id: `ord-${order.id}`,
      kind: 'store' as const,
      title: 'Club store order',
      detail: `${formatPaymentDate(order.date)} · ${order.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}`,
      amount: order.total,
      status: order.status,
      date: order.date,
      orderId: order.id,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const filteredHistory = history.filter((h) => {
    if (historyFilter === 'all') return true
    return h.kind === historyFilter
  })

  const statusTone = (status: string) => {
    if (status === 'succeeded' || status === 'paid' || status === 'shipped') return 'text-emerald-600'
    if (status === 'pending') return 'text-amber-600'
    return 'text-red-600'
  }

  const intro = clubPlayer.alsoPlays
    ? 'Monthly fee for your child, plus a one-time registration fee for you as a player.'
    : paymentFocus === 'monthly'
      ? 'As a parent, you pay the monthly membership fee for your child.'
      : 'As a player, you pay the one-time registration fee for the season.'

  return (
    <div className="space-y-6">
      <p className="font-inter text-sm text-slate-600 max-w-2xl">{intro}</p>

      <div
        className={`rounded-2xl p-5 ${
          feePaid
            ? 'bg-emerald-50 ring-1 ring-emerald-200/80'
            : 'bg-amber-50 ring-1 ring-amber-200/80'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            feePaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
          }`}>
            {feePaid ? <CheckCircle size={20} /> : <CreditCard size={20} />}
          </div>
          <div>
            <h3 className={`font-inter font-semibold text-base ${feePaid ? 'text-emerald-800' : 'text-amber-900'}`}>
              {feePaid
                ? paymentFocus === 'monthly'
                  ? `Paid for ${monthLabel}`
                  : 'Registration paid'
                : paymentFocus === 'monthly'
                  ? `Not paid for ${monthLabel}`
                  : 'Registration not paid'}
            </h3>
            <p className="font-inter text-sm text-slate-600 mt-1">
              {feePaid
                ? 'Your membership is up to date.'
                : paymentFocus === 'monthly'
                  ? 'Pay your monthly fee below to stay eligible for training and matches.'
                  : 'Pay your registration fee below to complete your sign-up.'}
            </p>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${registeredChildren.length > 1 || clubPlayer.alsoPlays ? 'md:grid-cols-2 max-w-3xl' : 'max-w-md'}`}>
        {paymentFocus === 'monthly' ? (
          registeredChildren.length > 0 ? (
            registeredChildren.map((child) => {
              const childFees = getFeeConfigForBirthYear(parseInt(child.dob.slice(0, 4), 10))
              return (
                <div key={child.id} className="club-store-card p-5">
                  <p className="font-inter text-xs font-medium text-slate-500">Monthly membership</p>
                  <p className="font-oswald font-bold text-3xl text-slate-900 mt-2 tabular-nums tracking-tight">
                    €{childFees.monthly}
                    <span className="text-base font-inter text-slate-500 font-normal">/month</span>
                  </p>
                  <p className="font-inter text-sm text-slate-600 mt-2">
                    For {child.name} (age {calcAge(child.dob)})
                  </p>
                  {monthlyPaid ? (
                    <p className="mt-4 inline-flex items-center gap-2 font-inter text-sm text-emerald-600">
                      <CheckCircle size={16} /> Paid this month
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startMembershipCheckout('monthly', childFees.monthly, `Monthly membership - ${child.name}`)}
                      disabled={paying}
                      className="club-store-cta mt-4 w-full font-inter text-sm font-semibold px-4 py-3 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all"
                    >
                      {paying ? 'Redirecting…' : isStripeCheckoutConfigured() ? 'Pay with Stripe' : 'Pay monthly fee'}
                    </button>
                  )}
                </div>
              )
            })
          ) : (
            <div className="club-store-card p-5">
              <p className="font-inter text-xs font-medium text-slate-500">Monthly membership</p>
              <p className="font-oswald font-bold text-3xl text-slate-900 mt-2 tabular-nums tracking-tight">
                €{fees.monthly}
                <span className="text-base font-inter text-slate-500 font-normal">/month</span>
              </p>
              <p className="font-inter text-sm text-slate-600 mt-2">Recurring fee for your child&apos;s age group.</p>
              {monthlyPaid ? (
                <p className="mt-4 inline-flex items-center gap-2 font-inter text-sm text-emerald-600">
                  <CheckCircle size={16} /> Paid this month
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => startMembershipCheckout('monthly', fees.monthly, 'Monthly membership')}
                  disabled={paying}
                  className="club-store-cta mt-4 w-full font-inter text-sm font-semibold px-4 py-3 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  {paying ? 'Redirecting…' : isStripeCheckoutConfigured() ? 'Pay with Stripe' : 'Pay monthly fee'}
                </button>
              )}
            </div>
          )
        ) : (
          <div className="club-store-card p-5">
            <p className="font-inter text-xs font-medium text-slate-500">One-time registration</p>
            <p className="font-oswald font-bold text-3xl text-slate-900 mt-2 tabular-nums tracking-tight">€{fees.oneTime}</p>
            <p className="font-inter text-sm text-slate-600 mt-2">Single registration fee for the season.</p>
            {oneTimePaid ? (
              <p className="mt-4 inline-flex items-center gap-2 font-inter text-sm text-emerald-600">
                <CheckCircle size={16} /> Already paid
              </p>
            ) : (
              <button
                type="button"
                onClick={() => startMembershipCheckout('oneTime', fees.oneTime, 'One-time registration')}
                disabled={paying}
                className="club-store-cta mt-4 w-full font-inter text-sm font-semibold px-4 py-3 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {paying ? 'Redirecting…' : isStripeCheckoutConfigured() ? 'Pay with Stripe' : 'Pay registration fee'}
              </button>
            )}
          </div>
        )}
        {clubPlayer.alsoPlays && selfFees && (
          <div className="club-store-card p-5">
            <p className="font-inter text-xs font-medium text-slate-500">Your player registration</p>
            <p className="font-oswald font-bold text-3xl text-slate-900 mt-2 tabular-nums tracking-tight">€{selfFees.oneTime}</p>
            <p className="font-inter text-sm text-slate-600 mt-2">
              Your registration
              {getPlayerBirthYear(clubPlayer) ? ` (age ${calcAgeFromBirthYear(getPlayerBirthYear(clubPlayer)!)}).` : '.'}
            </p>
            {oneTimePaid ? (
              <p className="mt-4 inline-flex items-center gap-2 font-inter text-sm text-emerald-600">
                <CheckCircle size={16} /> Already paid
              </p>
            ) : (
              <button
                type="button"
                onClick={() => startMembershipCheckout('oneTime', selfFees.oneTime, 'One-time registration (parent player)')}
                disabled={paying}
                className="club-store-cta mt-4 w-full font-inter text-sm font-semibold px-4 py-3 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {paying ? 'Redirecting…' : isStripeCheckoutConfigured() ? 'Pay with Stripe' : 'Pay registration fee'}
              </button>
            )}
          </div>
        )}
      </div>

      {payError && (
        <p className="font-inter text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{payError}</p>
      )}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="font-inter font-semibold text-lg text-slate-900">Activity</h3>
          <div className="dash-segment">
            {([
              ['all', 'All'],
              ['membership', 'Membership'],
              ['store', 'Store'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-selected={historyFilter === key}
                onClick={() => setHistoryFilter(key)}
                className={`px-3 py-1.5 font-inter text-sm font-medium ${
                  historyFilter === key ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="club-store-card overflow-hidden">
          {filteredHistory.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                {historyFilter === 'store' ? <ShoppingBag size={20} className="text-slate-400" /> : <CreditCard size={20} className="text-slate-400" />}
              </div>
              <p className="font-inter font-medium text-slate-900">
                {historyFilter === 'store' ? 'No store orders yet' : historyFilter === 'membership' ? 'No membership payments yet' : 'No activity yet'}
              </p>
              <p className="font-inter text-sm text-slate-500 mt-1">
                {historyFilter === 'store'
                  ? 'Orders from the Club Shop will show up here.'
                  : 'Membership fees and store purchases appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredHistory.map((tx) => (
                <div key={tx.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.kind === 'store' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-lions-600'
                    }`}>
                      {tx.kind === 'store' ? <ShoppingBag size={16} /> : <CreditCard size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-inter text-sm font-medium text-slate-900">{tx.title}</p>
                      <p className="font-inter text-xs text-slate-500 mt-0.5 line-clamp-2">{tx.detail}</p>
                      {tx.kind === 'store' && 'orderId' in tx && (
                        <p className="font-mono text-[11px] text-slate-400 mt-1">{tx.orderId}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-inter font-semibold text-slate-900 tabular-nums">€{tx.amount.toFixed(2)}</p>
                    <p className={`font-inter text-xs capitalize mt-0.5 ${statusTone(tx.status)}`}>{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {checkout && (
        <PaymentCheckout
          open
          title={checkout.label}
          description="Enter your card details to complete payment"
          amount={checkout.amount}
          onClose={() => setCheckout(null)}
          onSuccess={({ cardLast4, cardholderName }) =>
            handleCheckoutSuccess(checkout.plan, checkout.amount, cardLast4, cardholderName)
          }
        />
      )}
    </div>
  )
}

/* ───────── Schedule Tab ───────── */
function ScheduleTab({ clubPlayer }: { clubPlayer: ClubPlayer | null }) {
  const attendance = getAttendanceStore()
  const [sessions, setSessions] = useState<SessionEvent[]>(() =>
    loadClubScheduleForPlayer(clubPlayer).map((s) => ({
      ...s,
      attended: attendance[s.id]?.attended,
      excused: attendance[s.id]?.excused,
    })),
  )
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => {
      const attendanceStore = getAttendanceStore()
      setSessions(
        loadClubScheduleForPlayer(clubPlayer).map((s) => ({
          ...s,
          attended: attendanceStore[s.id]?.attended,
          excused: attendanceStore[s.id]?.excused,
        })),
      )
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [clubPlayer])

  const playerTeams = useMemo((): ClubTeam[] => {
    if (!clubPlayer) return []
    const ids = new Set(getTeamIdsForMember(clubPlayer))
    return getClubTeams().filter((t) => ids.has(t.id))
  }, [clubPlayer])

  const gridItems = useMemo(() => {
    return sessions.map((s) => {
      const team = playerTeams.find((t) => t.id === s.teamId)
      return {
        id: s.id,
        title: s.title,
        date: s.date,
        time: s.time,
        type: s.type,
        subtitle: team ? `${team.name} · ${s.venue}` : s.venue,
      }
    })
  }, [sessions, playerTeams])

  const todayIso = schedIso(new Date())

  const persistAttendance = (updated: SessionEvent[]) => {
    const store = getAttendanceStore()
    for (const s of updated) {
      store[s.id] = { attended: s.attended, excused: s.excused }
    }
    saveAttendanceStore(store)
  }

  const handleAttend = (id: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, attended: true, excused: false } : s))
    setSessions(updated)
    persistAttendance(updated)
  }

  const handleExcuse = (id: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, attended: false, excused: true } : s))
    setSessions(updated)
    persistAttendance(updated)
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null
  const hasTeams = playerTeams.length > 0

  return (
    <div className="space-y-5">
      <ScheduleTimeGrid
        items={gridItems}
        onEventClick={(id) => setActiveSessionId(id)}
        hint={
          hasTeams
            ? undefined
            : 'Waiting for a team assignment — sessions will appear here once a coach assigns you.'
        }
      />

      {activeSession && (
        <div className="dash-card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="font-inter font-semibold text-slate-900">{activeSession.title}</h4>
                <span className="text-xs font-inter font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {activeSession.type}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-slate-400" />
                  {new Date(activeSession.date + 'T12:00:00').toLocaleDateString('en-IE', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  {activeSession.time}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-400" />
                  {activeSession.venue}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeSession.date < todayIso ? (
                activeSession.attended ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 font-inter text-sm font-medium">
                    <CheckCircle size={16} /> Attended
                  </span>
                ) : activeSession.excused ? (
                  <span className="flex items-center gap-1.5 text-amber-700 font-inter text-sm font-medium">
                    <Clock size={16} /> Excused
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAttend(activeSession.id)}
                    className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 px-3 py-2 rounded-xl font-inter text-sm transition-colors active:scale-[0.98]"
                  >
                    Check In
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => handleExcuse(activeSession.id)}
                  className="bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl font-inter text-sm transition-colors active:scale-[0.98]"
                >
                  Can&apos;t Make It
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSessionId(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────── Profile Tab ───────── */
function ProfileTab({
  user,
  onUpdateUser,
}: {
  user: PlayerUser
  onUpdateUser: (u: PlayerUser) => void
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    emergencyContact: user.emergencyContact || '',
    jerseySize: user.jerseySize || 'M',
  })
  const [saved, setSaved] = useState(false)

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    const updated: PlayerUser = syncUserFromRoster({
      ...user,
      name: form.name,
      email: form.email,
      phone: form.phone,
      emergencyContact: form.emergencyContact,
      jerseySize: form.jerseySize,
    })
    onUpdateUser(updated)

    const players = getPlayers()
    const idx = players.findIndex((p) => p.id === user.id)
    if (idx >= 0) {
      players[idx] = { ...updated }
      savePlayers(players)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <p className="font-inter text-sm text-slate-600 max-w-2xl">
        Keep your contact details up to date so coaches can reach you.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="club-store-card p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <User size={32} className="text-slate-600" />
          </div>
          <h3 className="font-inter font-semibold text-lg text-slate-900">{user.name}</h3>
          <p className="font-inter text-sm text-slate-500 mt-1">{user.email}</p>
          <p className="mt-4 font-inter text-xs text-slate-500 leading-relaxed">
            Dublin Lions member. Coaches handle roster details behind the scenes.
          </p>
        </div>

        <div className="lg:col-span-2 club-store-card p-6 md:p-8">
          <h3 className="font-inter font-semibold text-lg text-slate-900 mb-5">Contact details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-inter font-medium text-xs text-slate-600">Full name</label>
              <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="club-store-input" />
            </div>
            <div className="space-y-1.5">
              <label className="block font-inter font-medium text-xs text-slate-600">Email</label>
              <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className="club-store-input" />
            </div>
            <div className="space-y-1.5">
              <label className="block font-inter font-medium text-xs text-slate-600">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+353 1 234 5678" className="club-store-input" />
            </div>
            <div className="space-y-1.5">
              <label className="block font-inter font-medium text-xs text-slate-600">Emergency contact</label>
              <input type="text" value={form.emergencyContact} onChange={(e) => handleChange('emergencyContact', e.target.value)} placeholder="Name and phone" className="club-store-input" />
            </div>
            <div className="space-y-1.5">
              <label className="block font-inter font-medium text-xs text-slate-600">Jersey size</label>
              <select value={form.jerseySize} onChange={(e) => handleChange('jerseySize', e.target.value)} className="club-store-input">
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button type="button" onClick={handleSave} className="club-store-cta font-inter font-semibold text-sm px-6 py-3 rounded-xl active:scale-[0.98] transition-all">
              Save changes
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-emerald-600 font-inter text-sm">
                <CheckCircle size={16} /> Saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChildrenTab({
  clubPlayer,
  onClubPlayerUpdate,
}: {
  clubPlayer: ClubPlayer | null
  onClubPlayerUpdate: (p: ClubPlayer) => void
}) {
  const canManage = clubPlayer ? !needsPlayerOnboarding(clubPlayer) : false
  const summary = clubPlayer ? getRegisteredChildrenSummary(clubPlayer) : []
  const [children, setChildren] = useState<ChildDraft[]>([])
  const [childrenError, setChildrenError] = useState('')
  const [childrenSaved, setChildrenSaved] = useState(false)
  const [childrenSaving, setChildrenSaving] = useState(false)
  const childrenDirtyRef = useRef(false)

  const loadChildrenFromPlayer = useCallback((player: ClubPlayer) => {
    const registered = getRegisteredChildren(player)
    setChildren(
      registered.length > 0
        ? registered.map((c) => ({
            id: c.id,
            name: c.name,
            dob: c.dob,
            gender: c.gender || 'Male',
          }))
        : [],
    )
  }, [])

  const markChildrenDirty = () => {
    childrenDirtyRef.current = true
  }

  useEffect(() => {
    if (!clubPlayer) {
      setChildren([])
      childrenDirtyRef.current = false
      return
    }
    if (childrenDirtyRef.current) return
    loadChildrenFromPlayer(clubPlayer)
  }, [clubPlayer, loadChildrenFromPlayer])

  const handleSaveChildren = async () => {
    if (!clubPlayer) return

    const hasPartialChild = children.some(
      (c) => (c.name.trim() && !isValidChildDob(c.dob.trim())) || (!c.name.trim() && c.dob.trim()),
    )
    if (hasPartialChild) {
      setChildrenError(`Each child needs a name and full date of birth (minimum age ${MIN_CHILD_AGE}).`)
      return
    }

    const validChildren: RegisteredChild[] = children
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        dob: c.dob.trim(),
        gender: c.gender,
      }))
      .filter((c) => c.name && isValidChildDob(c.dob))

    setChildrenError('')
    setChildrenSaving(true)
    try {
      const updated = updateRegisteredChildren(clubPlayer.id, validChildren)
      if (!updated) {
        setChildrenError('Could not save children. Please try again.')
        return
      }

      if (supabase) {
        await updateAuthUserData({
          memberType: updated.memberType ?? 'player',
          registeredChildren: updated.registeredChildren ?? [],
          childrenUpdatedAt: updated.childrenUpdatedAt ?? Date.now(),
          alsoPlays: updated.alsoPlays ?? false,
          birthYear: updated.birthYear ?? null,
        })
      }

      reconcileClubRoster()
      await ensureClubRosterSynced()
      onClubPlayerUpdate(updated)
      childrenDirtyRef.current = false
      loadChildrenFromPlayer(updated)
      setChildrenSaved(true)
      setTimeout(() => setChildrenSaved(false), 3000)
    } finally {
      setChildrenSaving(false)
    }
  }

  if (!clubPlayer || !canManage) {
    return (
      <div className="club-store-card p-8 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Users size={22} className="text-slate-400" />
        </div>
        <p className="font-inter font-medium text-slate-900">Finish welcome setup first</p>
        <p className="font-inter text-sm text-slate-500 mt-1">Then you can register and manage children here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="font-inter text-sm text-slate-600">
        Register children linked to your account, or update their details. Coaches assign teams from the roster.
      </p>

      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {summary.map((child) => (
            <div key={child.id} className="club-store-card p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 font-inter font-semibold text-sm text-slate-700">
                {(child.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-inter font-medium text-sm text-slate-900 truncate">{child.name}</p>
                <p className="font-inter text-xs text-slate-500 mt-0.5">
                  {child.age !== null ? `Age ${child.age}` : 'Age pending'}
                  {' · '}
                  {child.gender}
                </p>
                <p className="font-inter text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  {child.assigned ? (
                    <>
                      <CheckCircle size={12} className="text-emerald-600" />
                      {child.teamName}{child.teamLabel ? ` · ${child.teamLabel}` : ''}
                    </>
                  ) : (
                    <>
                      <Clock size={12} />
                      Awaiting team assignment
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="club-store-card p-5 md:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Users size={18} className="text-slate-700" />
          </div>
          <div>
            <h3 className="font-inter font-semibold text-slate-900">Edit registrations</h3>
            <p className="font-inter text-sm text-slate-500 mt-0.5">
              Add or update children any time. Save when you are done.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {children.length === 0 && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 px-5 py-8 text-center">
              <p className="font-inter font-medium text-slate-900">No children registered yet</p>
              <p className="font-inter text-sm text-slate-500 mt-1">Add your first player below. You can add more later.</p>
            </div>
          )}
          {children.map((child, index) => {
            const initial = (child.name || '?').trim().charAt(0).toUpperCase() || '?'
            const namePreview = child.name?.trim() || `Child ${index + 1}`
            return (
              <div key={child.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-4" data-testid={`child-card-${index}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-inter font-semibold text-sm text-slate-700 shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="font-inter text-xs text-slate-500">Child {index + 1}</p>
                      <p className="font-inter font-medium text-sm text-slate-900 truncate">{namePreview}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { markChildrenDirty(); setChildren((prev) => prev.filter((c) => c.id !== child.id)) }}
                    className="inline-flex items-center gap-1.5 text-xs font-inter text-slate-500 hover:text-red-600 transition-colors"
                    aria-label={`Remove ${namePreview}`}
                    data-testid={`remove-child-${index}`}
                  >
                    <Trash2 size={13} strokeWidth={2.3} />
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block font-inter font-medium text-xs text-slate-600" htmlFor={`kid-name-${child.id}`}>Player name</label>
                    <input
                      id={`kid-name-${child.id}`}
                      type="text"
                      value={child.name}
                      placeholder="First and last name"
                      onChange={(e) => { markChildrenDirty(); setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, name: e.target.value } : c))) }}
                      className="club-store-input"
                      data-testid={`child-name-${index}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-inter font-medium text-xs text-slate-600">Date of birth</p>
                    <ChildDobPicker
                      key={child.id}
                      id={`children-tab-dob-${child.id}`}
                      value={child.dob}
                      onChange={(dob) => { markChildrenDirty(); setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, dob } : c))) }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-inter font-medium text-xs text-slate-600">Gender</p>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
                      {(['Male', 'Female'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          role="radio"
                          aria-checked={child.gender === g}
                          onClick={() => { markChildrenDirty(); setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, gender: g } : c))) }}
                          className={`rounded-xl px-3 py-2.5 font-inter text-sm border transition-all active:scale-[0.98] ${
                            child.gender === g
                              ? 'club-store-seg-on'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                          data-testid={`child-gender-${g.toLowerCase()}-${index}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => { markChildrenDirty(); setChildren((prev) => [...prev, newChildDraft()]) }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 hover:bg-slate-100 text-slate-700 font-inter text-sm font-medium px-4 py-3 transition-colors active:scale-[0.99]"
            data-testid="add-child-btn"
          >
            <Plus size={16} strokeWidth={2.6} />
            {children.length === 0 ? 'Add a child' : 'Add another child'}
          </button>
        </div>

        {childrenError && (
          <p className="mt-4 font-inter text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
            {childrenError}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => void handleSaveChildren()}
            disabled={childrenSaving}
            className="club-store-cta font-inter font-semibold text-sm px-6 py-3 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-all"
            data-testid="save-children-btn"
          >
            {childrenSaving ? 'Saving…' : 'Save children'}
          </button>
          {childrenSaved && (
            <span className="flex items-center gap-1 text-emerald-600 font-inter text-sm">
              <CheckCircle size={16} /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatTab({ user }: { user: PlayerUser | null }) {
  const clubPlayer = user
    ? getClubPlayers().find((p) => p.email.toLowerCase() === user.email.toLowerCase())
    : undefined

  const [myTeams, setMyTeams] = useState(() => (clubPlayer ? getAccessibleChatTeams(clubPlayer) : []))
  const [teamId, setTeamId] = useState<string>(() => (clubPlayer ? getAccessibleChatTeams(clubPlayer)[0]?.id ?? '' : ''))
  const [messages, setMessages] = useState<ChatMessage[]>(getChatMessages())
  const [statuses, setStatuses] = useState<Record<string, ChatSendStatus>>(() => getChatSendStatusMap())

  const refreshChatState = useCallback(() => {
    if (!clubPlayer) {
      setMyTeams([])
      return
    }
    const teams = getAccessibleChatTeams(clubPlayer)
    setMyTeams(teams)
    setTeamId((prev) => (prev && teams.some((t) => t.id === prev) ? prev : teams[0]?.id ?? ''))
    setMessages(getChatMessages())
    setStatuses(getChatSendStatusMap())
  }, [clubPlayer])

  useEffect(() => {
    refreshChatState()
    void whenClubDataReady().then(() => {
      void pullMergedChatState().then(refreshChatState)
    })
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      if (
        e.key === 'dlbc_chat_messages' ||
        e.key === 'dlbc_chat_members' ||
        e.key === 'dlbc_chat_deleted_ids' ||
        e.key === 'dlbc_chat_status' ||
        e.key === 'dlbc_players' ||
        e.key === 'dlbc_teams'
      ) {
        refreshChatState()
      }
    }
    window.addEventListener('storage', onStorage)
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('dlbc_chat')
      bc.onmessage = () => refreshChatState()
    } catch { /* unavailable */ }
    const pullTimer = setInterval(() => {
      void pullMergedChatState().then(refreshChatState)
    }, 1500)
    return () => {
      window.removeEventListener('storage', onStorage)
      bc?.close()
      clearInterval(pullTimer)
    }
  }, [refreshChatState])

  if (!clubPlayer) {
    return (
      <div className="space-y-6 animate-[fade-in-up_0.4s_ease-out]">
        <div className="dash-card p-6">
          <p className="font-inter text-sm text-slate-600">
            Your account (<span className="text-slate-900 font-medium">{user?.email}</span>) isn't linked to a
            roster player yet, so Team Chat isn't available. Ask your manager to make sure a player record
            exists with this exact email address.
          </p>
        </div>
      </div>
    )
  }

  if (myTeams.length === 0) {
    return (
      <div className="space-y-6 animate-[fade-in-up_0.4s_ease-out]">
        <div className="dash-card p-6">
          <p className="font-inter text-sm text-slate-600">
            You're not in a team chat yet. Ask your manager to add you to the team or invite you to the chat.
          </p>
        </div>
      </div>
    )
  }

  const activeTeamId = teamId || myTeams[0].id
  const canSend = myTeams.some((t) => t.id === activeTeamId)
  const teamMessages = messages
    .filter((m) => m.teamId === activeTeamId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const lastPreview = (teamId: string) => {
    const last = messages
      .filter((m) => m.teamId === teamId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    return last?.text
  }

  const chatTeams = myTeams.map((t) => ({
    id: t.id,
    name: t.name,
    subtitle: getTeamAgeDivisionLabel(t),
    preview: lastPreview(t.id),
  }))

  const publishWithTimeout = async (messageId: string) => {
    // Watchdog: if publishChatNow doesn't resolve in 8s, mark as failed so the
    // user isn't stuck staring at a "sending…" tick forever.
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000))
    let ok = false
    try {
      ok = await Promise.race([publishChatNow(), timeout])
    } catch {
      ok = false
    }
    if (!ok) {
      setChatSendStatus(messageId, 'failed')
    }
    setStatuses(getChatSendStatusMap())
    setMessages(getChatMessages())
  }

  const handleSend = (body: string) => {
    if (!body.trim() || !canSend || !activeTeamId) return
    ensureChatMembership(activeTeamId, clubPlayer.id)
    const message = addChatMessage(activeTeamId, clubPlayer.name, 'player', body.trim())
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]))
      byId.set(message.id, message)
      return [...byId.values()].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
    })
    setStatuses(getChatSendStatusMap())
    void publishWithTimeout(message.id)
  }

  const handleRetry = (messageId: string) => {
    setChatSendStatus(messageId, 'pending')
    setStatuses(getChatSendStatusMap())
    void publishWithTimeout(messageId)
  }

  const handleDelete = (messageId: string) => {
    if (!deleteOwnChatMessage(messageId, clubPlayer.name, 'player')) return
    setMessages(getChatMessages())
    setStatuses(getChatSendStatusMap())
    void publishChatNow()
  }

  return (
    <div className="space-y-4 animate-[fade-in-up_0.4s_ease-out]">
      <TeamChatUI
        variant="player"
        teams={chatTeams}
        activeTeamId={activeTeamId}
        onTeamChange={setTeamId}
        messages={teamMessages}
        currentSenderName={clubPlayer.name}
        currentSenderRole="player"
        canSend={canSend}
        sendBlockedReason="Ask your manager to add you to this team chat"
        onSend={handleSend}
        onDeleteMessage={handleDelete}
        onRetryMessage={handleRetry}
        messageStatuses={statuses}
        emptyTeamsMessage="Ask your manager to add you to a team or invite you to the chat."
      />
    </div>
  )
}

/* ───────── Main PlayerDashboard Component ───────── */
export default function PlayerDashboard() {
  const navigate = useNavigate()
  const { signOut, user: authUser } = useAuth()
  const logoUrl = useSiteImage('logo')
  const [user, setUser] = useState<PlayerUser | null>(null)
  const [clubPlayer, setClubPlayer] = useState<ClubPlayer | null>(null)
  // Persist activeTab across the session so any incidental remount (e.g. a
  // brief auth flicker on token refresh) doesn't bounce the user back to the
  // Overview tab while they were mid-flow on Schedule / Payments / Chat.
  const [activeTab, setActiveTabState] = useState<TabKey>(() => {
    const saved = sessionStorage.getItem('dlbc_player_tab')
    if (saved && ['overview', 'payments', 'schedule', 'children', 'profile', 'chat', 'shop'].includes(saved)) {
      return saved as TabKey
    }
    return 'overview'
  })
  const setActiveTab = useCallback((tab: TabKey) => {
    sessionStorage.setItem('dlbc_player_tab', tab)
    setActiveTabState(tab)
  }, [])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('dlbc_player_sidebar_collapsed') === '1')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [, setNotifTick] = useState(0)

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('dlbc_player_sidebar_collapsed', next ? '1' : '0')
      return next
    })
  }, [])

  const [dataReady, setDataReady] = useState(false)

  const refreshClubPlayer = useCallback((email: string, name: string) => {
    if (!isPlayerAccountActive(email)) {
      setClubPlayer(null)
      return
    }
    let player = findPlayerByEmail(email) ?? upsertPlayerFromAuth({ email, name })
    if (player && authUser?.user_metadata) {
      player =
        syncPlayerProfileFromAuthMetadata(
          email,
          authUser.user_metadata as Record<string, unknown>,
        ) ?? player
    }
    setClubPlayer(player)
  }, [authUser?.user_metadata])

  useEffect(() => {
    let cancelled = false
    void whenClubDataReady().then(() => {
      if (cancelled) return
      setDataReady(true)
      const u = getUser()
      if (!u) {
        navigate('/player/login')
        return
      }
      const synced = syncUserFromRoster(u)
      setUser(synced)
      if (JSON.stringify(synced) !== JSON.stringify(u)) {
        saveUser(synced)
      }
      refreshClubPlayer(synced.email, synced.name)
    })
    return () => { cancelled = true }
    // Run ONCE per mount. Depending on `refreshClubPlayer` here caused this
    // effect to re-run every time Supabase issued a new user_metadata reference
    // (~every token refresh), which in turn called navigate('/player/login') if
    // any race made `dlbc_user` briefly empty — that's the "screen goes white
    // and dumps me back on the Dashboard" bug the user reported. Metadata-sync
    // is already handled by the separate effect below (deps include authUser).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  useEffect(() => {
    if (!user || !dataReady) return
    const onSync = () => refreshClubPlayer(user.email, user.name)
    window.addEventListener('storage', onSync)
    return () => window.removeEventListener('storage', onSync)
  }, [user, dataReady, refreshClubPlayer])

  useEffect(() => {
    if (!user || !dataReady || !authUser?.user_metadata) return
    refreshClubPlayer(user.email, user.name)
  }, [authUser?.user_metadata, user, dataReady, refreshClubPlayer])

  const needsOnboarding = clubPlayer ? needsPlayerOnboarding(clubPlayer) : false

  // Players should always see the Schedule tab — the ScheduleTab component
  // shows a friendly "waiting for team assignment" message when a coach has
  // not yet placed the player on a team, so hiding it left members wondering
  // where the tab went.
  const sidebarTabs = TAB_CONFIG

  const handleUpdateUser = useCallback((updated: PlayerUser) => {
    const synced = syncUserFromRoster(updated)
    setUser(synced)
    saveUser(synced)
    if (supabase) {
      void supabase.auth.updateUser({
        data: {
          name: synced.name,
          paymentPlan: synced.paymentPlan,
          phone: synced.phone,
          emergencyContact: synced.emergencyContact,
          jerseySize: synced.jerseySize,
        },
      })
    }
  }, [])

  const handleLogout = async () => {
    await signOut()
    navigate('/player/login')
  }

  if (!user || !dataReady) {
    return (
      <div className="dashboard-shell player-dash min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-lions-500 animate-spin mx-auto mb-4" />
          <p className="font-inter text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (clubPlayer && needsOnboarding) {
    return (
      <OnboardingScreen
        user={user}
        clubPlayer={clubPlayer}
        onComplete={(player) => setClubPlayer(player)}
      />
    )
  }

  if (!clubPlayer && isPlayerAccountActive(user.email)) {
    return (
      <div className="dashboard-shell player-dash min-h-[100dvh] flex items-center justify-center">
        <Loader2 size={40} className="text-lions-500 animate-spin" />
      </div>
    )
  }

  // notifTick forces rebuild after dismiss/clear
  const notifications = buildPlayerNotifications(clubPlayer)
  const isRail = sidebarCollapsed

  const dismissNotification = (id: string) => {
    const deletedIds = getNotifIdSet(NOTIF_DELETED_KEY)
    deletedIds.add(id)
    saveNotifIdSet(NOTIF_DELETED_KEY, deletedIds)
    setNotifTick((t) => t + 1)
  }

  const clearNotifications = () => {
    const deletedIds = getNotifIdSet(NOTIF_DELETED_KEY)
    for (const n of notifications) deletedIds.add(n.id)
    saveNotifIdSet(NOTIF_DELETED_KEY, deletedIds)
    setNotifTick((t) => t + 1)
    setShowNotifications(false)
  }

  const notifIcon = (type: NotificationItem['type']) => {
    if (type === 'payment') return <CreditCard size={14} className="text-amber-500" />
    if (type === 'session') return <CalendarDays size={14} className="text-blue-500" />
    return <Bell size={14} className="text-amber-500" />
  }

  return (
    <div className="dashboard-shell player-dash min-h-[100dvh] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden mobile-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`dash-sidebar fixed md:sticky inset-y-0 left-0 z-50 flex flex-col py-6 transition-[transform,width,padding] duration-300 md:translate-x-0 ${
          isRail ? 'dash-sidebar--rail w-64 md:w-[4.75rem] px-4 md:px-2.5' : 'w-64 px-4'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className={`flex items-center mb-5 ${isRail ? 'md:justify-center justify-between' : 'justify-between'} gap-2`}>
          <Link
            to="/"
            className={`flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity group ${isRail ? 'md:justify-center' : ''}`}
            title="Back to Dublin Lions home"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-lions-100 to-lions-50 ring-1 ring-lions-200 group-hover:ring-lions-400 transition-all shrink-0">
              <img src={logoUrl || asset('logo-lions-emblem.png')} alt="Dublin Lions" className="h-7 w-auto" />
            </div>
            <div className={isRail ? 'md:hidden' : ''}>
              <p className="font-oswald font-bold text-lg text-slate-900 tracking-wide leading-none">DUBLIN LIONS</p>
              <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-lions-600 mt-1">Player Portal</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={toggleCollapse}
            className={`dash-rail-toggle hidden md:flex shrink-0 ${isRail ? 'md:hidden' : ''}`}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {isRail && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="dash-rail-toggle hidden md:flex mx-auto mb-4"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}

        <Link
          to="/"
          className={`flex items-center gap-2 mb-5 rounded-lg bg-slate-100 hover:bg-lions-50 text-slate-600 hover:text-lions-700 font-inter text-xs transition-all border border-slate-200 ${
            isRail ? 'md:justify-center md:px-0 md:py-2.5 px-3 py-2 mx-1' : 'mx-1 px-3 py-2'
          }`}
        >
          <Home size={14} className="shrink-0" />
          <span className={isRail ? 'md:hidden' : ''}>Back to Site</span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto scroll-slim -mr-2 pr-2">
          <p className={`nav-section-label px-3 mb-2 ${isRail ? 'md:hidden' : ''}`}>My Club</p>
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <div key={tab.key} className="dash-nav-item">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key)
                    setSidebarOpen(false)
                  }}
                  title={tab.label}
                  className={`w-full flex items-center gap-3 rounded-xl font-inter text-sm font-medium transition-all duration-150 ${
                    isRail ? 'md:justify-center md:px-2.5 px-3 py-2.5' : 'px-3 py-2.5'
                  } ${
                    isActive
                      ? 'text-slate-900 nav-active'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} className={`shrink-0 ${isActive ? 'text-lions-600' : 'text-slate-400'}`} />
                  <span className={isRail ? 'md:hidden' : ''}>{tab.label}</span>
                </button>
                {isRail && <span className="dash-nav-tip hidden md:block">{tab.label}</span>}
              </div>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-4">
          <div className={`relative ${isRail ? 'md:hidden' : ''}`}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 hover:bg-white hover:ring-lions-200 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lions-500 to-lions-600 ring-2 ring-lions-200 flex items-center justify-center shrink-0 text-white font-inter font-semibold text-xs">
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-inter font-medium text-sm text-slate-900 truncate">{user.name}</p>
                <p className="font-inter text-xs text-slate-500 truncate">
                  {memberLine(user)}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-500 shrink-0 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 dash-card p-1 shadow-lg overflow-hidden">
                <button
                  onClick={() => {
                    setActiveTab('profile')
                    setUserMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 font-inter text-sm text-slate-600 hover:bg-slate-50 hover:text-lions-700 transition-colors rounded-lg"
                >
                  <User size={14} /> Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 font-inter text-sm text-red-600 hover:bg-red-50 transition-colors rounded-lg"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
          {isRail && (
            <div className="hidden md:flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab('profile'); setSidebarOpen(false) }}
                className="dash-rail-toggle"
                title="Profile"
                aria-label="Profile"
              >
                <User size={16} />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="dash-rail-toggle"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="dash-topbar h-auto min-h-16 flex items-center justify-between gap-4 px-4 md:px-8 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-slate-500 hover:text-slate-900 p-1 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h1 className="font-oswald font-bold text-xl md:text-2xl text-slate-900 tracking-tight capitalize truncate">
                {activeTab === 'overview' ? `Hello, ${user.name.split(' ')[0]}!` : tabTitle(activeTab)}
              </h1>
              {activeTab === 'overview' && (
                <p className="hidden sm:block font-inter text-sm text-slate-500 mt-0.5 truncate">
                  Explore information and activity about your membership.
                </p>
              )}
            </div>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="mgr-topbar-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 dash-card shadow-xl z-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-inter font-semibold text-sm text-slate-900">Notifications</p>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearNotifications}
                      className="font-inter text-xs text-slate-400 hover:text-red-500"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="font-inter text-sm text-slate-400 text-center py-4">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="flex gap-3 items-start">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          n.type === 'payment' ? 'bg-amber-500/10' : n.type === 'session' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                        }`}>
                          {notifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-inter text-sm text-slate-900">{n.title}</p>
                          <p className="font-inter text-xs text-slate-500">{n.message}</p>
                        </div>
                        <button type="button" onClick={() => dismissNotification(n.id)} className="text-slate-400 hover:text-slate-700">
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-slim">
          <div key={activeTab} className="max-w-6xl mx-auto dash-view-enter">
            {activeTab === 'overview' && <OverviewTab clubPlayer={clubPlayer} onNavigate={setActiveTab} />}
            {activeTab === 'payments' && <PaymentsTab user={user} onUpdateUser={handleUpdateUser} />}
            {activeTab === 'schedule' && <ScheduleTab clubPlayer={clubPlayer} />}
            {activeTab === 'children' && (
              <ChildrenTab clubPlayer={clubPlayer} onClubPlayerUpdate={setClubPlayer} />
            )}
            {activeTab === 'profile' && (
              <ProfileTab user={user} onUpdateUser={handleUpdateUser} />
            )}
            {activeTab === 'chat' && <ChatTab user={user} />}
            {activeTab === 'shop' && <Store embedded />}
          </div>
        </main>
      </div>
    </div>
  )
}
