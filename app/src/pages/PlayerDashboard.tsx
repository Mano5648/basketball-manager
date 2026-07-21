import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { easeOut } from '@/components/motion/presets'
import { asset, useSiteImage } from '@/hooks/useSiteImages'
import {
  getPlayers as getClubPlayers,
  getTeams as getClubTeams,
  getChatMessages,
  addChatMessage,
  getChatRoom,
  getPayments,
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
  getTeamIdsForMember,
  calcAge,
  reconcileClubRoster,
  ensureClubRosterSynced,
  whenClubDataReady,
  syncPlayerProfileFromAuthMetadata,
  getChildRosterPlayersForParent,
  childRosterPlayerId,
  getTeamAgeDivisionLabel,
  type RegisteredChild,
  type Player as ClubPlayer,
  type ChatMessage,
  type Payment,
  type Session,
} from '@/lib/clubData'
import { PaymentCheckout } from '@/components/PaymentCheckout'
import { redirectToStripeCheckout, isStripeCheckoutConfigured } from '@/lib/stripeCheckout'
import { sendPurchaseConfirmationEmail } from '@/lib/purchaseEmail'
import { toAbsoluteImageUrl } from '@/lib/imageUrl'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { BirthYearPicker, ChildDobPicker } from '@/components/forms/BirthDateFields'
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
  date: string
  time: string
  title: string
  venue: string
  type: 'Training' | 'Match' | 'Social'
  attended?: boolean
  excused?: boolean
}

interface NotificationItem {
  id: number
  title: string
  message: string
  date: string
  read: boolean
  type: 'payment' | 'session' | 'announcement'
}

type TabKey = 'overview' | 'payments' | 'schedule' | 'profile' | 'notifications' | 'chat'

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
    date: session.date,
    time: session.time,
    title: session.title,
    venue: session.location,
    type: session.type === 'Event' ? 'Social' : session.type,
  }
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

function getMockNotifications(): NotificationItem[] {
  const raw = localStorage.getItem('dlbc_notifications')
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      // fall through
    }
  }
  const notifications: NotificationItem[] = [
    { id: 1, title: 'Payment Reminder', message: 'Your monthly membership payment of €50 is due on 15 January 2025.', date: '2 hours ago', read: false, type: 'payment' },
    { id: 2, title: 'Training Update', message: 'Tuesday training has been moved to 20:00 this week due to hall maintenance.', date: '1 day ago', read: false, type: 'session' },
    { id: 3, title: 'New Club Announcement', message: 'The club is organising a fundraising event on 25 February. All players welcome!', date: '3 days ago', read: true, type: 'announcement' },
    { id: 4, title: 'Match Day Info', message: 'Please arrive 30 minutes early for the match against Neptune BC this Saturday.', date: '5 days ago', read: true, type: 'session' },
  ]
  localStorage.setItem('dlbc_notifications', JSON.stringify(notifications))
  return notifications
}

function saveNotifications(notifications: NotificationItem[]) {
  localStorage.setItem('dlbc_notifications', JSON.stringify(notifications))
}

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'My Dashboard', icon: LayoutDashboard },
  { key: 'payments', label: 'My Payments', icon: CreditCard },
  { key: 'schedule', label: 'My Schedule', icon: Calendar },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'chat', label: 'Team Chat', icon: MessageSquare },
]

function tabTitle(key: TabKey): string {
  if (key === 'profile') return 'My Profile'
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
          await supabase.auth.updateUser({
            data: {
              memberType,
              registeredChildren: updated.registeredChildren ?? [],
              alsoPlays: updated.alsoPlays ?? false,
              birthYear: updated.birthYear ?? null,
              onboardingCompletedAt: updated.onboardingCompletedAt ?? new Date().toISOString(),
            },
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
        await supabase.auth.updateUser({
          data: {
            memberType: 'player',
            birthYear: year,
            onboardingCompletedAt: updated.onboardingCompletedAt ?? new Date().toISOString(),
          },
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
                    <p className="mt-1 font-inter text-xs text-slate-500">Must be at least {MIN_CHILD_AGE} years old.</p>
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
  user,
  clubPlayer,
  onNavigate,
}: {
  user: PlayerUser
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
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name.split(' ')[0]
  const registeredChildren = clubPlayer ? getRegisteredChildrenSummary(clubPlayer) : []

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
      <motion.header className="player-welcome" {...fade(0)}>
        <div className="player-welcome__copy">
          <p className="player-welcome__eyebrow">Member hub</p>
          <h2 className="player-welcome__title">
            {greeting}, {firstName}
          </h2>
          <p className="player-welcome__sub">
            Everything you need as a Dublin Lions member — fees, schedule, and club updates.
          </p>
        </div>
        <div className="player-welcome__meta">
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
        </div>
      </motion.header>

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
                      {child.age !== null ? `Age ${child.age}` : 'Age —'}
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
            <button type="button" onClick={() => onNavigate('profile')} className="player-text-btn mt-4">
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
            <button type="button" onClick={() => onNavigate('payments')} className="btn-accent w-full mt-4 font-inter font-semibold text-sm uppercase tracking-wider px-4 py-3 rounded-xl">
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
              { label: 'Edit profile', icon: User, tab: 'profile' as TabKey, primary: false },
              { label: 'Club shop', icon: ShoppingBag, tab: null, primary: false },
            ].map((action) => (
              action.tab ? (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onNavigate(action.tab!)}
                  className={action.primary ? 'player-action-item player-action-item--primary' : 'player-action-item'}
                >
                  <action.icon size={18} />
                  <span>{action.label}</span>
                  <ArrowRight size={14} className="ml-auto opacity-50" />
                </button>
              ) : (
                <Link key={action.label} to="/store" className="player-action-item">
                  <action.icon size={18} />
                  <span>{action.label}</span>
                  <ArrowRight size={14} className="ml-auto opacity-50" />
                </Link>
              )
            ))}
          </div>
        </motion.section>

        <motion.section className="player-bento__news dash-card" {...fade(0.18)}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="player-bento__label mb-0">
              <Bell size={16} />
              Club news
            </div>
            <button type="button" onClick={() => onNavigate('notifications')} className="player-text-btn text-xs">
              View all
            </button>
          </div>
          <ul className="player-news-list">
            {[
              {
                title: 'Fundraiser — 25 February',
                preview: 'All players and families welcome at our winter fundraiser.',
                date: '3 days ago',
              },
              {
                title: 'Kit pre-orders open',
                preview: 'Early orders for the 2025/26 season kit are now available.',
                date: '1 week ago',
              },
              {
                title: 'Mid-season check-ins',
                preview: 'Coaches will reach out to arrange short progress chats.',
                date: '2 weeks ago',
              },
            ].map((item) => (
              <li key={item.title} className="player-news-item">
                <div>
                  <p className="player-news-item__title">{item.title}</p>
                  <p className="player-news-item__preview">{item.preview}</p>
                </div>
                <span className="player-news-item__date">{item.date}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>

      <motion.aside className="player-parent-note dash-card" {...fade(0.22)}>
        <p className="font-inter text-sm text-slate-600 leading-relaxed">
          {registeredChildren.length > 0 ? (
            <>
              <strong className="text-slate-800 font-semibold">Your registered children</strong> are listed above.
              Pay fees under Payments — your coach will assign teams and schedules when ready.
            </>
          ) : (
            <>
              <strong className="text-slate-800 font-semibold">Registering a child?</strong> Add them in your profile,
              then pay fees here — your coach will assign a team and schedule when ready.
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
function PaymentsTab({ user, onUpdateUser }: { user: PlayerUser; onUpdateUser: (u: PlayerUser) => void }) {
  const [clubPlayer, setClubPlayer] = useState(() => resolveClubPlayer(user.email, user.name))
  const monthLabel = currentMonthLabel()

  const [payments, setPayments] = useState<Payment[]>(() =>
    clubPlayer ? getPayments().filter((p) => p.playerId === clubPlayer.id) : [],
  )
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
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.25rem)] text-slate-900">My payments</h2>
        <p className="font-inter text-base text-slate-600 mt-1">
          {clubPlayer.alsoPlays
            ? 'Monthly fee for your child, plus a one-time registration fee for you as a player.'
            : paymentFocus === 'monthly'
              ? 'As a parent, you pay the monthly membership fee for your child.'
              : 'As a player, you pay the one-time registration fee for the season.'}
        </p>
      </div>

      <div
        className={`rounded-xl p-5 border ${
          feePaid ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'
        }`}
      >
        <h3 className={`font-inter font-semibold text-lg ${feePaid ? 'text-emerald-700' : 'text-orange-700'}`}>
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
            ? 'Thank you — your membership is up to date.'
            : paymentFocus === 'monthly'
              ? 'Pay your monthly fee below to stay eligible for training and matches.'
              : 'Pay your registration fee below to complete your sign-up.'}
        </p>
      </div>

      <div className={`grid grid-cols-1 ${registeredChildren.length > 1 || clubPlayer.alsoPlays ? 'md:grid-cols-2 max-w-3xl' : 'max-w-md'} gap-4`}>
        {paymentFocus === 'monthly' ? (
          registeredChildren.length > 0 ? (
            registeredChildren.map((child) => {
              const childFees = getFeeConfigForBirthYear(parseInt(child.dob.slice(0, 4), 10))
              return (
                <div key={child.id} className="dash-card p-6">
                  <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Monthly membership</p>
                  <p className="font-oswald font-bold text-3xl text-lions-700 mt-2">
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
                      onClick={() => startMembershipCheckout('monthly', childFees.monthly, `Monthly membership — ${child.name}`)}
                      disabled={paying}
                      className="mt-4 w-full btn-accent font-inter text-sm font-semibold uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-50"
                    >
                      {paying ? 'Redirecting to Stripe…' : isStripeCheckoutConfigured() ? 'Pay with Stripe' : 'Pay monthly fee'}
                    </button>
                  )}
                </div>
              )
            })
          ) : (
        <div className="dash-card p-6">
          <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Monthly membership</p>
          <p className="font-oswald font-bold text-3xl text-lions-700 mt-2">
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
              className="mt-4 w-full btn-accent font-inter text-sm font-semibold uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-50"
            >
              {paying ? 'Redirecting to Stripe…' : isStripeCheckoutConfigured() ? 'Pay with Stripe' : 'Pay monthly fee'}
            </button>
          )}
        </div>
          )
        ) : (
        <div className="dash-card p-6">
          <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">One-time registration</p>
          <p className="font-oswald font-bold text-3xl text-lions-700 mt-2">€{fees.oneTime}</p>
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
              className="mt-4 w-full btn-gold font-inter text-sm font-semibold uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-50"
            >
              {paying ? 'Redirecting to Stripe…' : isStripeCheckoutConfigured() ? 'Pay with Stripe' : 'Pay registration fee'}
            </button>
          )}
        </div>
        )}
        {clubPlayer.alsoPlays && selfFees && (
        <div className="dash-card p-6">
          <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Your player registration</p>
          <p className="font-oswald font-bold text-3xl text-lions-700 mt-2">€{selfFees.oneTime}</p>
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
              className="mt-4 w-full btn-gold font-inter text-sm font-semibold uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-50"
            >
              {paying ? 'Redirecting to Stripe…' : isStripeCheckoutConfigured() ? 'Pay with Stripe' : 'Pay registration fee'}
            </button>
          )}
        </div>
        )}
      </div>

      {payError && (
        <p className="font-inter text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{payError}</p>
      )}

      <div>
        <h3 className="font-inter font-semibold text-xl text-slate-900 mb-4">Payment history</h3>
        <div className="dash-card overflow-hidden">
          {payments.length === 0 ? (
            <p className="p-6 font-inter text-sm text-slate-500 text-center">No payments yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {payments.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-inter text-sm font-medium text-slate-900">{tx.plan}</p>
                    <p className="font-inter text-xs text-slate-500">{formatPaymentDate(tx.date)} · {tx.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-inter font-semibold text-slate-900">€{tx.amount}</p>
                    <p
                      className={`font-inter text-xs capitalize ${
                        tx.status === 'succeeded' ? 'text-emerald-600' : tx.status === 'pending' ? 'text-amber-600' : 'text-red-600'
                      }`}
                    >
                      {tx.status}
                    </p>
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
  const hasSchedule = clubPlayer ? hasTeamAssignment(clubPlayer) : false
  const attendance = getAttendanceStore()
  const [sessions, setSessions] = useState<SessionEvent[]>(() =>
    loadClubScheduleForPlayer(clubPlayer).map((s) => ({
      ...s,
      attended: attendance[s.id]?.attended,
      excused: attendance[s.id]?.excused,
    })),
  )
  const [filter, setFilter] = useState<'All' | 'Training' | 'Match' | 'Social'>('All')

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

  if (!hasSchedule) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.25rem)] text-slate-900">My schedule</h2>
          <p className="font-inter text-base text-slate-600 mt-1">
            Your team schedule isn&apos;t available yet.
          </p>
        </div>
        <div className="dash-card p-8 text-center max-w-lg">
          <Calendar size={32} className="mx-auto text-lions-500 mb-3" />
          <p className="font-inter text-slate-700 font-medium">Waiting for team assignment</p>
          <p className="font-inter text-sm text-slate-500 mt-2 leading-relaxed">
            Once your coach assigns you to a team, training sessions and matches will show up here automatically.
          </p>
        </div>
      </div>
    )
  }

  const filtered = filter === 'All' ? sessions : sessions.filter((s) => s.type === filter)

  const today = new Date().toISOString().split('T')[0]

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.25rem)] text-slate-900">My schedule</h2>
        <p className="font-inter text-base text-slate-600 mt-1">
          Training sessions and matches for your assigned team.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['All', 'Training', 'Match', 'Social'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-inter text-sm font-medium transition-all ${
              filter === f
                ? 'bg-lions-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-lions-300 hover:text-lions-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="font-inter text-sm text-slate-500 text-center py-8">No sessions scheduled yet. Check back soon.</p>
        ) : (
        filtered.map((session) => {
          const isPast = session.date < today
          const typeColors =
            session.type === 'Training'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : session.type === 'Match'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'

          return (
            <div
              key={session.id}
              className="dash-card p-5 hover:border-blue-500/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Date badge */}
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg px-4 py-3 min-w-[72px] border border-slate-200">
                  <span className="font-oswald font-bold text-lg text-slate-900">
                    {new Date(session.date).getDate()}
                  </span>
                  <span className="font-inter text-xs text-slate-500 uppercase">
                    {new Date(session.date).toLocaleDateString('en-IE', { month: 'short' })}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-inter font-semibold text-slate-900">{session.title}</h4>
                    <span className={`text-xs font-inter font-medium px-2 py-0.5 rounded border ${typeColors}`}>
                      {session.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {session.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {session.venue}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isPast ? (
                    session.attended ? (
                      <span className="flex items-center gap-1 text-green-400 font-inter text-sm">
                        <CheckCircle size={16} /> Attended
                      </span>
                    ) : session.excused ? (
                      <span className="flex items-center gap-1 text-warn-400 font-inter text-sm">
                        <Clock size={16} /> Excused
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAttend(session.id)}
                        className="bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-3 py-2 rounded font-inter text-sm transition-colors"
                      >
                        Check In
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleExcuse(session.id)}
                      className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-3 py-2 rounded font-inter text-sm transition-colors"
                    >
                      Can&apos;t Make It
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })
        )}
      </div>
    </div>
  )
}

/* ───────── Profile Tab ───────── */
function ProfileTab({
  user,
  clubPlayer,
  onUpdateUser,
  onClubPlayerUpdate,
}: {
  user: PlayerUser
  clubPlayer: ClubPlayer | null
  onUpdateUser: (u: PlayerUser) => void
  onClubPlayerUpdate: (p: ClubPlayer) => void
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    emergencyContact: user.emergencyContact || '',
    jerseySize: user.jerseySize || 'M',
  })
  const [saved, setSaved] = useState(false)
  const canManageChildren = clubPlayer ? !needsPlayerOnboarding(clubPlayer) : false
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
        await supabase.auth.updateUser({
          data: {
            memberType: updated.memberType ?? 'player',
            registeredChildren: updated.registeredChildren ?? [],
            alsoPlays: updated.alsoPlays ?? false,
            birthYear: updated.birthYear ?? null,
          },
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.25rem)] text-slate-900">My profile</h2>
        <p className="font-inter text-base text-slate-600 mt-1">
          Keep your contact details up to date for fees, kit orders, and club messages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dash-card p-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-lions-50 flex items-center justify-center mb-4 ring-2 ring-lions-100">
            <User size={40} className="text-lions-600" />
          </div>
          <h3 className="font-inter font-semibold text-lg text-slate-900">{user.name}</h3>
          <p className="font-inter text-sm text-slate-500 mt-1">{user.email}</p>
          <p className="mt-4 font-inter text-xs text-slate-500 leading-relaxed">
            Dublin Lions member — coaches handle roster details behind the scenes.
          </p>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="dash-card p-6 md:p-8">
            <h3 className="font-inter font-semibold text-xl text-slate-900 mb-6">Contact details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block font-inter font-medium text-sm text-slate-700">Full name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="dash-input w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="block font-inter font-medium text-sm text-slate-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="dash-input w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="block font-inter font-medium text-sm text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+353 1 234 5678"
                  className="dash-input w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="block font-inter font-medium text-sm text-slate-700">Emergency contact</label>
                <input
                  type="text"
                  value={form.emergencyContact}
                  onChange={(e) => handleChange('emergencyContact', e.target.value)}
                  placeholder="Name & phone"
                  className="dash-input w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="block font-inter font-medium text-sm text-slate-700">Jersey size</label>
                <select
                  value={form.jerseySize}
                  onChange={(e) => handleChange('jerseySize', e.target.value)}
                  className="dash-input w-full"
                >
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
              <button onClick={handleSave} className="btn-gold font-inter font-semibold text-sm uppercase tracking-wider px-8 py-3 rounded-xl">
                Save changes
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-emerald-600 font-inter text-sm">
                  <CheckCircle size={16} /> Saved
                </span>
              )}
            </div>
          </div>

          {canManageChildren && clubPlayer && (
            <div className="dash-card p-6 md:p-8">
              <h3 className="font-inter font-semibold text-xl text-slate-900 mb-2">Registered children</h3>
              <p className="font-inter text-sm text-slate-600 mb-5">
                Register a child at any time, or update existing children linked to your account.
              </p>
              <div className="space-y-3">
                {children.length === 0 && (
                  <p className="font-inter text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center">
                    No children registered yet. Add a child below when you are ready.
                  </p>
                )}
                {children.map((child, index) => (
                  <div key={child.id} className="player-onboarding__child-row rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-inter text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Child {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => { markChildrenDirty(); setChildren((prev) => prev.filter((c) => c.id !== child.id)) }}
                        className="font-inter text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-inter text-sm font-medium text-slate-700 mb-1.5">Name</label>
                        <input
                          type="text"
                          value={child.name}
                          onChange={(e) => { markChildrenDirty(); setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, name: e.target.value } : c))) }}
                          className="dash-input w-full"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block font-inter text-sm font-medium text-slate-700 mb-1.5">Date of birth</label>
                        <ChildDobPicker
                          key={child.id}
                          id={`profile-child-dob-${child.id}`}
                          value={child.dob}
                          onChange={(dob) => { markChildrenDirty(); setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, dob } : c))) }}
                        />
                      </div>
                      <div>
                        <label className="block font-inter text-sm font-medium text-slate-700 mb-1.5">Gender</label>
                        <select
                          value={child.gender}
                          onChange={(e) => { markChildrenDirty(); setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, gender: e.target.value as 'Male' | 'Female' } : c))) }}
                          className="dash-input w-full"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => { markChildrenDirty(); setChildren((prev) => [...prev, newChildDraft()]) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-lions-400 hover:text-lions-700 font-inter text-sm transition-colors"
                >
                  <Plus size={16} /> {children.length === 0 ? 'Add a child' : 'Add another child'}
                </button>
              </div>
              {childrenError && (
                <p className="mt-4 font-inter text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{childrenError}</p>
              )}
              <div className="mt-5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => void handleSaveChildren()}
                  disabled={childrenSaving}
                  className="btn-accent font-inter font-semibold text-sm uppercase tracking-wider px-8 py-3 rounded-xl disabled:opacity-60"
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
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────── Notifications Tab ───────── */
function NotificationsTab() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(getMockNotifications)

  const markRead = (id: number) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    setNotifications(updated)
    saveNotifications(updated)
  }

  const markUnread = (id: number) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: false } : n))
    setNotifications(updated)
    saveNotifications(updated)
  }

  const deleteNotif = (id: number) => {
    const updated = notifications.filter((n) => n.id !== id)
    setNotifications(updated)
    saveNotifications(updated)
  }

  const typeIcon = (type: NotificationItem['type']) => {
    if (type === 'payment') return <CreditCard size={16} className="text-amber-400" />
    if (type === 'session') return <CalendarDays size={16} className="text-blue-400" />
    return <Bell size={16} className="text-purple-400" />
  }

  return (
    <div className="space-y-6 animate-[fade-in-up_0.4s_ease-out]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Notifications</h2>
          <p className="font-inter text-base text-slate-400 mt-1">
            Stay up to date with club announcements and updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-500/10 text-blue-400 text-xs font-inter font-medium px-3 py-1.5 rounded">
            {notifications.filter((n) => !n.read).length} Unread
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`bg-[#1E293B] border rounded-xl p-5 transition-colors ${
              notif.read ? 'border-white/[0.08]' : 'border-l-4 border-l-blue-500 border-white/[0.08]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                {typeIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-inter font-semibold text-white">{notif.title}</h4>
                  <span className="font-inter text-xs text-slate-500 shrink-0">{notif.date}</span>
                </div>
                <p className="font-inter text-sm text-slate-300 mt-1">{notif.message}</p>
                <div className="flex items-center gap-3 mt-3">
                  {!notif.read ? (
                    <button
                      onClick={() => markRead(notif.id)}
                      className="font-inter text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Mark as Read
                    </button>
                  ) : (
                    <button
                      onClick={() => markUnread(notif.id)}
                      className="font-inter text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Mark as Unread
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotif(notif.id)}
                    className="font-inter text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatTab({ user }: { user: PlayerUser | null }) {
  const clubPlayer = user
    ? getClubPlayers().find((p) => p.email.toLowerCase() === user.email.toLowerCase())
    : undefined
  const teams = getClubTeams()
  const myTeamIds = clubPlayer ? getTeamIdsForMember(clubPlayer) : []
  const myTeams = clubPlayer ? teams.filter((t) => myTeamIds.includes(t.id)) : []

  const [teamId, setTeamId] = useState<string>(myTeams[0]?.id ?? '')
  const [messages, setMessages] = useState<ChatMessage[]>(getChatMessages())
  const [text, setText] = useState('')

  useEffect(() => {
    const sync = () => setMessages(getChatMessages())
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'dlbc_chat_messages') sync()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!clubPlayer) {
    return (
      <div className="space-y-6 animate-[fade-in-up_0.4s_ease-out]">
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Team Chat</h2>
        <div className="dash-card dash-card p-6">
          <p className="font-inter text-sm text-slate-300">
            Your account (<span className="text-white font-medium">{user?.email}</span>) isn't linked to a
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
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Team Chat</h2>
        <div className="dash-card dash-card p-6">
          <p className="font-inter text-sm text-slate-300">You're not assigned to a team yet.</p>
        </div>
      </div>
    )
  }

  const activeTeamId = teamId || myTeams[0].id
  const room = getChatRoom(activeTeamId)
  const isMember = room.memberIds.includes(clubPlayer.id)
  const teamMessages = messages
    .filter((m) => m.teamId === activeTeamId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const handleSend = () => {
    if (!text.trim() || !isMember) return
    addChatMessage(activeTeamId, clubPlayer.name, 'player', text.trim())
    setMessages(getChatMessages())
    setText('')
  }

  return (
    <div className="space-y-6 animate-[fade-in-up_0.4s_ease-out]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Team Chat</h2>
        {myTeams.length > 1 && (
          <select
            value={activeTeamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="bg-white/5 border border-[#334155] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      <div className="dash-card dash-card flex flex-col h-[28rem]">
        <div className="flex-1 overflow-y-auto scroll-slim p-4 space-y-3">
          {teamMessages.length === 0 ? (
            <p className="font-inter text-sm text-slate-500 text-center mt-8">No messages yet — say hello!</p>
          ) : (
            teamMessages.map((m) => {
              const mine = m.senderName === clubPlayer.name && m.senderRole === 'player'
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2 ${mine ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-200'}`}>
                    {!mine && (
                      <p className="font-inter text-xs font-semibold text-blue-300 mb-0.5">
                        {m.senderName}{m.senderRole === 'manager' ? ' (Manager)' : ''}
                      </p>
                    )}
                    <p className="font-inter text-sm">{m.text}</p>
                    <p className="font-inter text-[10px] text-white/50 mt-1">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="border-t border-white/[0.08] p-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            disabled={!isMember}
            placeholder={isMember ? 'Type a message…' : "You're not a member of this chat"}
            className="flex-1 bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!isMember || !text.trim()}
            className="btn-gradient text-white font-inter font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
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
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

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
  }, [navigate, refreshClubPlayer])

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
  const paymentFocus = clubPlayer ? getMemberPaymentFocus(clubPlayer) : null
  const feePaid = clubPlayer ? isMemberFeePaid(clubPlayer) : false
  const hasSchedule = clubPlayer ? hasTeamAssignment(clubPlayer) : false

  useEffect(() => {
    if (!hasSchedule && activeTab === 'schedule') {
      setActiveTab('overview')
    }
  }, [hasSchedule, activeTab])

  const sidebarTabs = TAB_CONFIG.filter((tab) => tab.key !== 'schedule' || hasSchedule)

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

  const unreadCount = getMockNotifications().filter((n) => !n.read).length

  return (
    <div className="dashboard-shell player-dash min-h-[100dvh] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden mobile-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`dash-sidebar fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col py-6 px-4 transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <Link to="/" className="flex items-center gap-3 mb-5 px-2 hover:opacity-90 transition-opacity group" title="Back to Dublin Lions home">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-lions-100 to-warn-50 ring-1 ring-lions-200 group-hover:ring-lions-400 transition-all">
            <img src={logoUrl || asset('logo-lions-emblem.png')} alt="Dublin Lions" className="h-7 w-auto" />
          </div>
          <div>
            <p className="font-oswald font-bold text-lg text-slate-900 tracking-wide leading-none">DUBLIN LIONS</p>
            <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-warn-600 mt-1">Player Portal</p>
          </div>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 mb-5 mx-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-lions-50 text-slate-600 hover:text-lions-700 font-inter text-xs transition-all border border-slate-200"
        >
          <Home size={14} />
          Back to Site
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto scroll-slim -mr-2 pr-2">
          <p className="nav-section-label px-3 mb-2">My Club</p>
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-inter text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-slate-900 nav-active'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-warn-500' : 'text-lions-500'} />
                {tab.label}
                {tab.key === 'notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-warn-500 text-white text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
          <button
            onClick={() => navigate('/store')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-inter text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-lions-700 transition-all"
          >
            <ShoppingBag size={18} className="text-lions-500" />
            Club Shop
          </button>
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-4">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 hover:bg-white hover:ring-lions-200 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lions-500 to-lions-600 ring-2 ring-warn-400/40 flex items-center justify-center shrink-0 text-white font-inter font-semibold text-xs">
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
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="dash-topbar h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-slate-500 hover:text-lions-600 p-1 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <span className="hidden md:block h-7 w-1.5 rounded-full accent-bar" />
            <h1 className="font-oswald font-bold text-xl md:text-2xl text-slate-900 tracking-wide capitalize">
              {tabTitle(activeTab)}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {!needsOnboarding && paymentFocus && !feePaid && (
              <button
                onClick={() => setActiveTab('payments')}
                className="hidden sm:inline-flex btn-accent font-inter font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-lg"
              >
                {paymentFocus === 'monthly' ? 'Pay membership' : 'Pay registration'}
              </button>
            )}
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 text-slate-500 hover:text-lions-600 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warn-500 rounded-full ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-slim">
          <div key={activeTab} className="max-w-6xl mx-auto dash-view-enter">
            {activeTab === 'overview' && <OverviewTab user={user} clubPlayer={clubPlayer} onNavigate={setActiveTab} />}
            {activeTab === 'payments' && <PaymentsTab user={user} onUpdateUser={handleUpdateUser} />}
            {activeTab === 'schedule' && <ScheduleTab clubPlayer={clubPlayer} />}
            {activeTab === 'profile' && (
              <ProfileTab
                user={user}
                clubPlayer={clubPlayer}
                onUpdateUser={handleUpdateUser}
                onClubPlayerUpdate={setClubPlayer}
              />
            )}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'chat' && <ChatTab user={user} />}
          </div>
        </main>
      </div>
    </div>
  )
}
