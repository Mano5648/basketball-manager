import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { asset } from '@/hooks/useSiteImages'
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
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  X,
  MessageSquare,
  Trash2,
  CalendarDays,
  MapPin,
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

interface PaymentTx {
  id: string
  date: string
  description: string
  amount: string
  method: string
  status: 'Completed' | 'Pending' | 'Failed'
}

interface SessionEvent {
  id: number
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

type TabKey = 'overview' | 'payments' | 'schedule' | 'profile' | 'notifications'

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

function getMockSessions(): SessionEvent[] {
  const raw = localStorage.getItem('dlbc_sessions')
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      // fall through
    }
  }
  const sessions: SessionEvent[] = [
    { id: 1, date: '2025-01-20', time: '19:00', title: 'Senior Team Training', venue: 'Coláiste Bríde Sports Hall', type: 'Training' },
    { id: 2, date: '2025-01-22', time: '19:30', title: 'vs Neptune BC', venue: 'Coláiste Bríde Sports Hall', type: 'Match' },
    { id: 3, date: '2025-01-25', time: '10:00', title: 'Weekend Practice', venue: 'Coláiste Bríde Sports Hall', type: 'Training' },
    { id: 4, date: '2025-01-27', time: '19:00', title: 'Senior Team Training', venue: 'Coláiste Bríde Sports Hall', type: 'Training' },
    { id: 5, date: '2025-01-29', time: '20:00', title: 'Team Social - Pizza Night', venue: 'The Laurels Pub', type: 'Social' },
    { id: 6, date: '2025-02-01', time: '19:30', title: 'vs Killester BC', venue: 'Away - IWA Sports Hall', type: 'Match' },
  ]
  localStorage.setItem('dlbc_sessions', JSON.stringify(sessions))
  return sessions
}

function getMockPayments(): PaymentTx[] {
  const raw = localStorage.getItem('dlbc_payments')
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      // fall through
    }
  }
  const payments: PaymentTx[] = [
    { id: 'pay-1', date: '15 Dec 2024', description: 'Monthly Instalment', amount: '€50', method: 'Stripe', status: 'Completed' },
    { id: 'pay-2', date: '15 Nov 2024', description: 'Monthly Instalment', amount: '€50', method: 'Stripe', status: 'Completed' },
    { id: 'pay-3', date: '15 Oct 2024', description: 'Registration Fee', amount: '€50', method: 'Stripe', status: 'Completed' },
  ]
  localStorage.setItem('dlbc_payments', JSON.stringify(payments))
  return payments
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

function saveSessions(sessions: SessionEvent[]) {
  localStorage.setItem('dlbc_sessions', JSON.stringify(sessions))
}

function savePayments(payments: PaymentTx[]) {
  localStorage.setItem('dlbc_payments', JSON.stringify(payments))
}

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'My Dashboard', icon: LayoutDashboard },
  { key: 'payments', label: 'My Payments', icon: CreditCard },
  { key: 'schedule', label: 'My Schedule', icon: Calendar },
  { key: 'profile', label: 'My Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
]

/* ───────── Stripe Checkout Mock Modal ───────── */
function StripeCheckoutMock({
  plan,
  amount,
  onClose,
  onSuccess,
}: {
  plan: string
  amount: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [phase, setPhase] = useState<'loading' | 'form' | 'processing' | 'success'>('loading')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [showCvc, setShowCvc] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setPhase('form'), 1200)
    return () => clearTimeout(t)
  }, [])

  const handlePay = () => {
    setPhase('processing')
    setTimeout(() => {
      setPhase('success')
      onSuccess()
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#1E293B] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
              <CreditCard size={18} className="text-blue-400" />
            </div>
            <span className="font-inter font-semibold text-white">Stripe Checkout</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-8">
          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 size={40} className="text-blue-400 animate-spin" />
              <p className="font-inter text-white">Redirecting to Stripe...</p>
            </div>
          )}

          {phase === 'form' && (
            <div className="space-y-6">
              <div className="bg-[#0F172A] rounded-lg p-4 border border-white/5">
                <p className="font-inter text-sm text-slate-400">Plan</p>
                <p className="font-inter font-semibold text-white">{plan}</p>
                <p className="font-oswald font-bold text-2xl text-amber-400 mt-1">{amount}</p>
              </div>

              {/* Test mode badge */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 flex items-center gap-2">
                <span className="bg-amber-400 text-[#0A1628] text-[0.65rem] font-inter font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Test Mode
                </span>
                <span className="font-inter text-xs text-amber-400">
                  Use card: 4242 4242 4242 4242, any future date, any CVC
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-inter text-sm text-slate-300 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block font-inter text-sm text-slate-300 mb-1">Expiry</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="MM / YY"
                      className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block font-inter text-sm text-slate-300 mb-1">CVC</label>
                    <div className="relative">
                      <input
                        type={showCvc ? 'text' : 'password'}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        placeholder="123"
                        className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 pr-10 text-white font-inter text-base placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvc(!showCvc)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showCvc ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePay}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-base uppercase tracking-widest px-8 py-4 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
              >
                Pay {amount}
              </button>
            </div>
          )}

          {phase === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 size={40} className="text-blue-400 animate-spin" />
              <p className="font-inter text-white">Processing payment...</p>
            </div>
          )}

          {phase === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-400" />
              </div>
              <h3 className="font-oswald font-bold text-2xl text-white">Payment Successful!</h3>
              <p className="font-inter text-slate-400 text-center">
                Your payment of {amount} for {plan} has been processed.
              </p>
              <div className="bg-[#0F172A] rounded-lg p-4 w-full border border-white/5 mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400 font-inter">Transaction ID</span>
                  <span className="text-white font-inter font-mono">pi_{Math.random().toString(36).slice(2, 14)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400 font-inter">Date</span>
                  <span className="text-white font-inter">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-inter">Status</span>
                  <span className="text-green-400 font-inter font-semibold">Completed</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-base uppercase tracking-widest px-8 py-4 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────── Overview Tab ───────── */
function OverviewTab({ user }: { user: PlayerUser }) {
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const statusColor =
    user.membershipStatus === 'paid'
      ? 'text-green-400'
      : user.membershipStatus === 'pending'
        ? 'text-amber-400'
        : 'text-red-400'

  const statusBg =
    user.membershipStatus === 'paid'
      ? 'bg-green-500/10 border-green-500/20'
      : user.membershipStatus === 'pending'
        ? 'bg-amber-500/10 border-amber-500/20'
        : 'bg-red-500/10 border-red-500/20'

  const statusLabel =
    user.membershipStatus === 'paid'
      ? 'Membership Active'
      : user.membershipStatus === 'pending'
        ? 'Payment Pending'
        : 'Payment Overdue'

  return (
    <div className="space-y-6 animate-[fade-in-up_0.4s_ease-out]">
      {/* Welcome Banner */}
      <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <User size={28} className="text-blue-400" />
          </div>
          <div>
            <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-tight">
              Welcome back, {user.name.split(' ')[0]}
            </h2>
            <p className="font-inter text-base text-slate-400 mt-1">
              {user.team} · {user.position} · #{user.jersey}
            </p>
            <p className="font-inter text-sm text-slate-500 mt-0.5">{today}</p>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Membership Status */}
        <div className={`bg-[#1E293B] border rounded-xl p-6 ${statusBg}`}>
          <Shield size={24} className={statusColor} />
          <h3 className="font-inter font-semibold text-xl text-white mt-3">{statusLabel}</h3>
          <p className="font-inter text-sm text-slate-400 mt-1">
            {user.membershipStatus === 'paid'
              ? 'Adult Player · Expires 31 Aug 2025'
              : user.membershipStatus === 'pending'
                ? 'Awaiting first payment'
                : 'Payment overdue · action required'}
          </p>
          <button
            onClick={() => navigate('/player/dashboard', { state: { tab: 'payments' } })}
            className="font-inter text-sm text-blue-400 hover:text-blue-300 mt-3 transition-colors"
          >
            View Details →
          </button>
        </div>

        {/* Payment Status */}
        <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl p-6">
          <CreditCard size={24} className="text-amber-400" />
          <h3 className="font-inter font-semibold text-xl text-white mt-3">
            {user.membershipStatus === 'paid' ? 'Payment Up to Date' : 'Payment Due'}
          </h3>
          <p className="font-inter text-sm text-slate-400 mt-1">
            {user.membershipStatus === 'paid'
              ? user.paymentPlan === 'monthly'
                ? 'Next payment: 15 Feb 2025'
                : 'Season paid in full'
              : 'Monthly instalment: €50 due 15 Jan'}
          </p>
          {user.membershipStatus !== 'paid' && (
            <button
              onClick={() => navigate('/player/dashboard', { state: { tab: 'payments' } })}
              className="mt-3 w-full bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm uppercase tracking-wider px-4 py-2.5 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
            >
              Pay Now
            </button>
          )}
        </div>

        {/* Next Fixture */}
        <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl p-6">
          <Calendar size={24} className="text-blue-400" />
          <h3 className="font-inter font-semibold text-xl text-white mt-3">vs Neptune BC</h3>
          <p className="font-inter text-sm text-slate-400 mt-1">Home · Sat 18 Jan · 19:00</p>
          <button
            onClick={() => navigate('/player/dashboard', { state: { tab: 'schedule' } })}
            className="font-inter text-sm text-blue-400 hover:text-blue-300 mt-3 transition-colors"
          >
            View Fixtures →
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Announcements */}
        <div className="lg:col-span-3 bg-[#1E293B] border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="font-inter font-semibold text-xl text-white">Announcements</h3>
          </div>
          <div className="divide-y divide-white/5">
            {[
              {
                title: 'Fundraiser Event - 25 February',
                preview: 'The club is organising a major fundraising event. All players and families welcome.',
                date: '3 days ago',
              },
              {
                title: 'New Kit Ordering Open',
                preview: 'Pre-order your 2025/26 season kit now. Discounted rates for early orders.',
                date: '1 week ago',
              },
              {
                title: 'Coach White - Mid-Season Review',
                preview: 'Coach Rob White will be conducting individual mid-season reviews next week.',
                date: '2 weeks ago',
              },
            ].map((item, i) => (
              <div key={i} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                <h4 className="font-inter font-medium text-sm text-white">{item.title}</h4>
                <p className="font-inter text-xs text-slate-400 mt-1 line-clamp-1">{item.preview}</p>
                <p className="font-inter text-xs text-slate-500 mt-2">{item.date}</p>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-white/5 text-center">
            <button className="font-inter text-sm text-blue-400 hover:text-blue-300 transition-colors">
              View All →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-white/[0.08] rounded-xl p-6">
          <h3 className="font-inter font-semibold text-xl text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/player/dashboard', { state: { tab: 'payments' } })}
              className="w-full flex items-center gap-3 bg-transparent border-2 border-blue-500 text-blue-400 font-inter font-semibold text-sm uppercase tracking-wider px-4 py-3 rounded hover:bg-blue-500 hover:text-white transition-all duration-200"
            >
              <CreditCard size={18} />
              Make a Payment
            </button>
            <button
              onClick={() => navigate('/player/dashboard', { state: { tab: 'schedule' } })}
              className="w-full flex items-center gap-3 bg-transparent border-2 border-blue-500 text-blue-400 font-inter font-semibold text-sm uppercase tracking-wider px-4 py-3 rounded hover:bg-blue-500 hover:text-white transition-all duration-200"
            >
              <Calendar size={18} />
              View Training Schedule
            </button>
            <button
              onClick={() => navigate('/player/dashboard', { state: { tab: 'profile' } })}
              className="w-full flex items-center gap-3 bg-transparent border-2 border-blue-500 text-blue-400 font-inter font-semibold text-sm uppercase tracking-wider px-4 py-3 rounded hover:bg-blue-500 hover:text-white transition-all duration-200"
            >
              <User size={18} />
              Update Profile
            </button>
            <button className="w-full flex items-center gap-3 bg-transparent border-2 border-blue-500 text-blue-400 font-inter font-semibold text-sm uppercase tracking-wider px-4 py-3 rounded hover:bg-blue-500 hover:text-white transition-all duration-200">
              <MessageSquare size={18} />
              Contact Coach
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────── Payments Tab ───────── */
function PaymentsTab({ user, onUpdateUser }: { user: PlayerUser; onUpdateUser: (u: PlayerUser) => void }) {
  const [payments, setPayments] = useState<PaymentTx[]>(getMockPayments)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState({ name: '', amount: '' })

  const statusColor =
    user.membershipStatus === 'paid'
      ? 'text-green-400'
      : user.membershipStatus === 'pending'
        ? 'text-amber-400'
        : 'text-red-400'

  const handlePaymentSuccess = (planName: string, amount: string) => {
    // Update user membership status
    const updatedUser = { ...user, membershipStatus: 'paid' as const }
    if (planName.includes('Monthly')) updatedUser.paymentPlan = 'monthly'
    if (planName.includes('Full')) updatedUser.paymentPlan = 'full'
    if (planName.includes('Per-Session')) updatedUser.paymentPlan = 'per-session'

    onUpdateUser(updatedUser)

    // Add to payment history
    const newTx: PaymentTx = {
      id: `pay-${Date.now()}`,
      date: new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }),
      description: planName,
      amount,
      method: 'Stripe',
      status: 'Completed',
    }
    const updatedPayments = [newTx, ...payments]
    setPayments(updatedPayments)
    savePayments(updatedPayments)

    // Update players array
    const players = getPlayers()
    const idx = players.findIndex((p) => p.id === user.id)
    if (idx >= 0) {
      players[idx] = { ...updatedUser }
      savePlayers(players)
    }
  }

  const openCheckout = (name: string, amount: string) => {
    setCheckoutPlan({ name, amount })
    setCheckoutOpen(true)
  }

  return (
    <div className="space-y-6 animate-[fade-in-up_0.4s_ease-out]">
      <div>
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">My Payments</h2>
        <p className="font-inter text-base text-slate-400 mt-1">
          Manage your membership payments and view your payment history.
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-xl p-6 border ${
          user.membershipStatus === 'paid'
            ? 'bg-green-500/10 border-green-500/20'
            : user.membershipStatus === 'pending'
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-red-500/10 border-red-500/20'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className={`font-inter font-semibold text-lg ${statusColor}`}>
              {user.membershipStatus === 'paid'
                ? 'Membership Active'
                : user.membershipStatus === 'pending'
                  ? 'Payment Pending'
                  : 'Payment Overdue'}
            </h3>
            <p className="font-inter text-sm text-slate-400 mt-1">
              {user.membershipStatus === 'paid'
                ? 'Your membership is up to date. Thank you!'
                : user.membershipStatus === 'pending'
                  ? 'Complete your first payment to activate your membership.'
                  : 'Your payment is overdue. Please settle to remain eligible for matches.'}
            </p>
          </div>
          {user.membershipStatus !== 'paid' && (
            <span className="bg-red-500/20 text-red-400 text-xs font-inter font-bold uppercase tracking-wider px-3 py-1.5 rounded">
              Action Required
            </span>
          )}
        </div>
      </div>

      {/* Payment Options */}
      <div>
        <h3 className="font-inter font-semibold text-xl text-white">Choose Payment Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Monthly */}
          <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl p-6 hover:border-blue-500/50 transition-colors">
            <h4 className="font-inter font-semibold text-lg text-white">Monthly Payment Plan</h4>
            <p className="font-oswald font-bold text-2xl text-white mt-2">€50<span className="text-base font-inter font-normal text-slate-400">/month</span></p>
            <p className="font-inter text-sm text-slate-400 mt-3">
              Spread your membership across the season. Automatic monthly billing.
            </p>
            <ul className="mt-3 space-y-1">
              <li className="font-inter text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={12} className="text-green-400" /> 5 monthly payments
              </li>
              <li className="font-inter text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={12} className="text-green-400" /> Auto-renews monthly
              </li>
              <li className="font-inter text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={12} className="text-green-400" /> Cancel anytime
              </li>
            </ul>
            <button
              onClick={() => openCheckout('Monthly Payment Plan', '€50')}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm uppercase tracking-widest px-4 py-3 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
            >
              Pay with Stripe
            </button>
          </div>

          {/* Full Season */}
          <div className="bg-[#1E293B] border-2 border-blue-500/50 rounded-xl p-6 relative">
            <span className="absolute -top-3 left-4 bg-blue-500 text-white text-[0.65rem] font-inter font-bold uppercase tracking-wider px-2 py-1 rounded">
              Best Value
            </span>
            <h4 className="font-inter font-semibold text-lg text-white">Full Season Payment</h4>
            <p className="font-oswald font-bold text-2xl text-white mt-2">€250</p>
            <p className="font-inter text-sm text-slate-400 mt-3">
              Pay once for the full 2025/26 season. Save €50 compared to monthly.
            </p>
            <ul className="mt-3 space-y-1">
              <li className="font-inter text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={12} className="text-green-400" /> One-time payment
              </li>
              <li className="font-inter text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={12} className="text-green-400" /> Save €50
              </li>
              <li className="font-inter text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={12} className="text-green-400" /> Immediate full access
              </li>
            </ul>
            <button
              onClick={() => openCheckout('Full Season Payment', '€250')}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm uppercase tracking-widest px-4 py-3 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
            >
              Pay with Stripe
            </button>
          </div>

          {/* Per-Session */}
          <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl p-6 hover:border-blue-500/50 transition-colors">
            <h4 className="font-inter font-semibold text-lg text-white">Per-Session Payment</h4>
            <p className="font-oswald font-bold text-2xl text-white mt-2">€15<span className="text-base font-inter font-normal text-slate-400">/session</span></p>
            <p className="font-inter text-sm text-slate-400 mt-3">
              Flexible pay-as-you-go option for casual players.
            </p>
            <ul className="mt-3 space-y-1">
              <li className="font-inter text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={12} className="text-green-400" /> No commitment
              </li>
              <li className="font-inter text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={12} className="text-green-400" /> Pay per attendance
              </li>
              <li className="font-inter text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle size={12} className="text-green-400" /> Perfect for trialists
              </li>
            </ul>
            <button
              onClick={() => openCheckout('Per-Session Payment', '€15')}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm uppercase tracking-widest px-4 py-3 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
            >
              Pay with Stripe
            </button>
          </div>
        </div>
      </div>

      {/* Stripe info card */}
      <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-inter font-semibold text-white">Secure Payments by Stripe</h4>
            <p className="font-inter text-sm text-slate-400 mt-1">
              All payments are processed securely through Stripe. We do not store your card details.
            </p>
          </div>
          <span className="bg-amber-400 text-[#0A1628] text-[0.65rem] font-inter font-bold uppercase tracking-wider px-2 py-1 rounded shrink-0">
            Test Mode
          </span>
        </div>
      </div>

      {/* Payment History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-inter font-semibold text-xl text-white">Payment History</h3>
          <button className="flex items-center gap-2 font-inter text-sm text-blue-400 hover:text-blue-300 transition-colors">
            <Download size={16} />
            Download Invoice
          </button>
        </div>
        <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-3 font-inter text-xs uppercase tracking-wider text-slate-400">Date</th>
                  <th className="text-left px-6 py-3 font-inter text-xs uppercase tracking-wider text-slate-400">Description</th>
                  <th className="text-left px-6 py-3 font-inter text-xs uppercase tracking-wider text-slate-400">Amount</th>
                  <th className="text-left px-6 py-3 font-inter text-xs uppercase tracking-wider text-slate-400">Method</th>
                  <th className="text-left px-6 py-3 font-inter text-xs uppercase tracking-wider text-slate-400">Status</th>
                  <th className="text-left px-6 py-3 font-inter text-xs uppercase tracking-wider text-slate-400">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-inter text-sm text-white">{tx.date}</td>
                    <td className="px-6 py-4 font-inter text-sm text-slate-300">{tx.description}</td>
                    <td className="px-6 py-4 font-inter text-sm text-white font-semibold">{tx.amount}</td>
                    <td className="px-6 py-4 font-inter text-sm text-slate-300">{tx.method}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-inter font-medium ${
                          tx.status === 'Completed'
                            ? 'bg-green-500/10 text-green-400'
                            : tx.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="font-inter text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {checkoutOpen && (
        <StripeCheckoutMock
          plan={checkoutPlan.name}
          amount={checkoutPlan.amount}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => handlePaymentSuccess(checkoutPlan.name, checkoutPlan.amount)}
        />
      )}
    </div>
  )
}

/* ───────── Schedule Tab ───────── */
function ScheduleTab() {
  const [sessions, setSessions] = useState<SessionEvent[]>(getMockSessions)
  const [filter, setFilter] = useState<'All' | 'Training' | 'Match' | 'Social'>('All')

  const filtered = filter === 'All' ? sessions : sessions.filter((s) => s.type === filter)

  const today = new Date().toISOString().split('T')[0]

  const handleAttend = (id: number) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, attended: true, excused: false } : s))
    setSessions(updated)
    saveSessions(updated)
  }

  const handleExcuse = (id: number) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, attended: false, excused: true } : s))
    setSessions(updated)
    saveSessions(updated)
  }

  return (
    <div className="space-y-6 animate-[fade-in-up_0.4s_ease-out]">
      <div>
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">My Schedule</h2>
        <p className="font-inter text-base text-slate-400 mt-1">
          View upcoming training sessions, matches, and club events.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['All', 'Training', 'Match', 'Social'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded font-inter text-sm font-medium transition-all ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-[#1E293B] text-slate-400 border border-white/[0.08] hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {filtered.map((session) => {
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
              className="bg-[#1E293B] border border-white/[0.08] rounded-xl p-5 hover:border-blue-500/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Date badge */}
                <div className="flex flex-col items-center justify-center bg-[#0F172A] rounded-lg px-4 py-3 min-w-[72px]">
                  <span className="font-oswald font-bold text-lg text-white">
                    {new Date(session.date).getDate()}
                  </span>
                  <span className="font-inter text-xs text-slate-400 uppercase">
                    {new Date(session.date).toLocaleDateString('en-IE', { month: 'short' })}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-inter font-semibold text-white">{session.title}</h4>
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
                      <span className="flex items-center gap-1 text-amber-400 font-inter text-sm">
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
        })}
      </div>
    </div>
  )
}

/* ───────── Profile Tab ───────── */
function ProfileTab({ user, onUpdateUser }: { user: PlayerUser; onUpdateUser: (u: PlayerUser) => void }) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    emergencyContact: user.emergencyContact || '',
    position: user.position,
    jersey: String(user.jersey),
    jerseySize: user.jerseySize || 'M',
    team: user.team,
  })
  const [saved, setSaved] = useState(false)

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    const updated: PlayerUser = {
      ...user,
      name: form.name,
      email: form.email,
      phone: form.phone,
      emergencyContact: form.emergencyContact,
      position: form.position,
      jersey: parseInt(form.jersey) || 0,
      jerseySize: form.jerseySize,
      team: form.team,
    }
    onUpdateUser(updated)

    // Update in players array too
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
    <div className="space-y-6 animate-[fade-in-up_0.4s_ease-out]">
      <div>
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">My Profile</h2>
        <p className="font-inter text-base text-slate-400 mt-1">
          Update your personal details and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Photo + Team */}
        <div className="space-y-4">
          <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl p-6 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
              <User size={40} className="text-blue-400" />
            </div>
            <h3 className="font-inter font-semibold text-lg text-white">{user.name}</h3>
            <p className="font-inter text-sm text-slate-400">{user.email}</p>
            <div className="mt-3 bg-blue-500/10 text-blue-400 text-xs font-inter font-medium uppercase tracking-wider px-3 py-1.5 rounded">
              {user.team}
            </div>
          </div>

          <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl p-6">
            <h4 className="font-inter font-semibold text-white mb-3">Team Assignment</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-inter">Team</span>
                <span className="text-white font-inter">{user.team}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-inter">Position</span>
                <span className="text-white font-inter">{user.position}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-inter">Jersey #</span>
                <span className="text-white font-inter">{user.jersey}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Form */}
        <div className="lg:col-span-2 bg-[#1E293B] border border-white/[0.08] rounded-xl p-6 md:p-8">
          <h3 className="font-inter font-semibold text-xl text-white mb-6">Edit Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+353 1 234 5678"
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">Emergency Contact</label>
              <input
                type="text"
                value={form.emergencyContact}
                onChange={(e) => handleChange('emergencyContact', e.target.value)}
                placeholder="Name & Phone"
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">Position</label>
              <select
                value={form.position}
                onChange={(e) => handleChange('position', e.target.value)}
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
              >
                <option value="Guard">Guard</option>
                <option value="Forward">Forward</option>
                <option value="Center">Center</option>
                <option value="Point Guard">Point Guard</option>
                <option value="Shooting Guard">Shooting Guard</option>
                <option value="Small Forward">Small Forward</option>
                <option value="Power Forward">Power Forward</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">Jersey Number</label>
              <input
                type="number"
                value={form.jersey}
                onChange={(e) => handleChange('jersey', e.target.value)}
                min={0}
                max={99}
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">Jersey Size</label>
              <select
                value={form.jerseySize}
                onChange={(e) => handleChange('jerseySize', e.target.value)}
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">Team</label>
              <select
                value={form.team}
                onChange={(e) => handleChange('team', e.target.value)}
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
              >
                <option value="Men's Senior">Men&apos;s Senior</option>
                <option value="Women's Senior">Women&apos;s Senior</option>
                <option value="Men's U20">Men&apos;s U20</option>
                <option value="Women's U20">Women&apos;s U20</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSave}
              className="bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm uppercase tracking-widest px-8 py-3 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
            >
              Save Changes
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-green-400 font-inter text-sm">
                <CheckCircle size={16} /> Saved successfully
              </span>
            )}
          </div>
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

/* ───────── Main PlayerDashboard Component ───────── */
export default function PlayerDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<PlayerUser | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const u = getUser()
    if (!u) {
      navigate('/player/login')
      return
    }
    setUser(u)
  }, [navigate])

  const handleUpdateUser = useCallback((updated: PlayerUser) => {
    setUser(updated)
    saveUser(updated)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('dlbc_user')
    navigate('/player/login')
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-blue-400 animate-spin mx-auto mb-4" />
          <p className="font-inter text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  const unreadCount = getMockNotifications().filter((n) => !n.read).length

  return (
    <div className="min-h-[100dvh] bg-[#0F172A] flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#0A1628] border-r border-white/[0.08] flex flex-col transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
          <img src={asset('logo-lions-emblem.png')} alt="Dublin Lions" className="h-9 w-auto brightness-0 invert" />
          <div>
            <p className="font-inter font-semibold text-sm text-white leading-tight">Dublin Lions</p>
            <p className="font-inter text-xs text-slate-400 leading-tight">Player Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-inter text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-slate-400 hover:bg-white/[0.03] hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                {tab.key === 'notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
          <button
            onClick={() => navigate('/#membership')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-inter text-sm font-medium text-slate-400 hover:bg-white/[0.03] hover:text-white transition-all"
          >
            <ShoppingBag size={18} />
            Club Shop
          </button>
        </nav>

        {/* Bottom user card */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <User size={16} className="text-blue-400" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-inter font-medium text-sm text-white truncate">{user.name}</p>
                <p className="font-inter text-xs text-slate-500 truncate">
                  {user.team} — {user.position}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-500 shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1E293B] border border-white/[0.08] rounded-lg shadow-xl overflow-hidden">
                <button
                  onClick={() => {
                    setActiveTab('profile')
                    setUserMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 font-inter text-sm text-slate-300 hover:bg-white/[0.03] hover:text-white transition-colors"
                >
                  <User size={14} /> Profile
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    // settings could open a modal
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 font-inter text-sm text-slate-300 hover:bg-white/[0.03] hover:text-white transition-colors"
                >
                  <Shield size={14} /> Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 font-inter text-sm text-red-400 hover:bg-white/[0.03] transition-colors"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-[#0A1628]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-white p-1"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="font-oswald font-bold text-xl md:text-2xl text-white capitalize">
              {activeTab === 'overview' ? 'My Dashboard' : activeTab.replace('-', ' ')}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {user.membershipStatus !== 'paid' && (
              <button
                onClick={() => setActiveTab('payments')}
                className="hidden sm:block bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded hover:scale-[1.03] transition-all duration-150"
              >
                Pay Membership
              </button>
            )}
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && <OverviewTab user={user} />}
            {activeTab === 'payments' && <PaymentsTab user={user} onUpdateUser={handleUpdateUser} />}
            {activeTab === 'schedule' && <ScheduleTab />}
            {activeTab === 'profile' && <ProfileTab user={user} onUpdateUser={handleUpdateUser} />}
            {activeTab === 'notifications' && <NotificationsTab />}
          </div>
        </main>
      </div>
    </div>
  )
}
