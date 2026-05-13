import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Trophy,
  Calendar,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Settings,
  Search,
  Bell,
  Plus,
  LogOut,
  ChevronDown,
  UserPlus,
  Banknote,
  Send,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Euro,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  Landmark,
  MapPin,
  ShieldAlert,
  Loader2,
  Home,
  Image,
  Upload,
  RotateCcw,
  X,
  Filter,
  Edit3,
  Pencil,
  ShieldCheck,
  StickyNote,
  ShoppingBag,
  Package,
  Camera,
  Check,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { useSiteImage } from '@/hooks/useSiteImages'
import {
  type Player,
  type Team,
  type Session,
  type Announcement,
  type Payment,
  type AgeGroup,
  type Division,
  getPlayers,
  setPlayers,
  getTeams,
  setTeams,
  getSessions,
  setSessions,
  getAnnouncements,
  setAnnouncements,
  getPayments,
  setPayments,
  getAgeGroups,
  setAgeGroups,
  computeClubStats,
  getTeamPlayers,
  getAgeGroupName,
  getTeamAgeDivisionLabel,
  getProducts,
  setProducts,
  getOrders,
  getChatMessages,
  addChatMessage,
  getChatRoom,
  addChatMember,
  removeChatMember,
  setChatAdmin,
  type ChatRoomMembership,
  getStripePaymentLink,
  setStripePaymentLink,
  getFixtures,
  upsertFixture,
  deleteFixture,
  setFixtureResult,
  type ClubFixture,
  getMembershipFees,
  setMembershipFees,
  type MembershipFeeMap,
  hasPaidThisMonth,
  recordCashPayment,
  getMonthlyFeeForPlayer,
  type Product,
  type ChatMessage,
} from '@/lib/clubData'

/* ─────────────────────── Types ─────────────────────── */

type NavItem = {
  key: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'teams', label: 'Teams', icon: Trophy },
  { key: 'schedule', label: 'Schedule', icon: Calendar },
  { key: 'chat', label: 'Team Chat', icon: MessageCircle },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'images', label: 'Images', icon: Image },
  { key: 'store', label: 'Store', icon: ShoppingBag },
]

/* ─────────────────────── useLiveData Hook ─────────────────────── */

function useLiveData() {
  const [players, setPlayersState] = useState<Player[]>(getPlayers)
  const [teams, setTeamsState] = useState<Team[]>(getTeams)
  const [sessions, setSessionsState] = useState<Session[]>(getSessions)
  const [announcements, setAnnouncementsState] = useState<Announcement[]>(getAnnouncements)
  const [payments, setPaymentsState] = useState<Payment[]>(getPayments)
  const [ageGroups, setAgeGroupsState] = useState<AgeGroup[]>(getAgeGroups)

  const refresh = useCallback(() => {
    setPlayersState(getPlayers())
    setTeamsState(getTeams())
    setSessionsState(getSessions())
    setAnnouncementsState(getAnnouncements())
    setPaymentsState(getPayments())
    setAgeGroupsState(getAgeGroups())
  }, [])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('dlbc_')) refresh()
    }
    window.addEventListener('storage', handler)
    const interval = setInterval(refresh, 3000)
    return () => {
      window.removeEventListener('storage', handler)
      clearInterval(interval)
    }
  }, [refresh])

  const savePlayers = useCallback((v: Player[]) => { setPlayers(v); setPlayersState(v) }, [])
  const saveTeams = useCallback((v: Team[]) => { setTeams(v); setTeamsState(v) }, [])
  const saveSessions = useCallback((v: Session[]) => { setSessions(v); setSessionsState(v) }, [])
  const saveAnnouncements = useCallback((v: Announcement[]) => { setAnnouncements(v); setAnnouncementsState(v) }, [])
  const savePayments = useCallback((v: Payment[]) => { setPayments(v); setPaymentsState(v) }, [])
  const saveAgeGroups = useCallback((v: AgeGroup[]) => { setAgeGroups(v); setAgeGroupsState(v) }, [])

  return {
    players, teams, sessions, announcements, payments, ageGroups,
    refresh,
    savePlayers, saveTeams, saveSessions, saveAnnouncements, savePayments, saveAgeGroups,
  }
}

/* ─────────────────────── Shared Helpers ─────────────────────── */

function formField(label: string, child: React.ReactNode) {
  return (
    <div>
      <label className="block font-inter text-sm text-slate-300 mb-1">{label}</label>
      {child}
    </div>
  )
}

/* ─────────────────────── Helper Components ─────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Paid: 'bg-green-500/10 text-green-400 border-green-500/20',
    Active: 'bg-green-500/10 text-green-400 border-green-500/20',
    'Completed': 'bg-green-500/10 text-green-400 border-green-500/20',
    Succeeded: 'bg-green-500/10 text-green-400 border-green-500/20',
    succeeded: 'bg-green-500/10 text-green-400 border-green-500/20',
    Sent: 'bg-green-500/10 text-green-400 border-green-500/20',
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Scheduled: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Overdue: 'bg-red-500/10 text-red-400 border-red-500/20',
    Expired: 'bg-red-500/10 text-red-400 border-red-500/20',
    Failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    Draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter font-medium border ${styles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'Paid' || status === 'Active' || status === 'Completed' || status === 'Succeeded' || status === 'succeeded' || status === 'Sent'
          ? 'bg-green-400'
          : status === 'Pending' || status === 'pending' || status === 'Scheduled'
          ? 'bg-amber-400'
          : status === 'Overdue' || status === 'Expired' || status === 'Failed' || status === 'failed'
          ? 'bg-red-400'
          : 'bg-slate-400'
      }`} />
      {status}
    </span>
  )
}

function TeamBadge({ team }: { team: string }) {
  const colors: Record<string, string> = {
    "Men's": 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    "Women's": 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    Both: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Boys: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Girls: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    Men: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Women: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  }
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-inter font-medium border ${colors[team] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
      {team}
    </span>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  change,
  changeType,
}: {
  label: string
  value: string
  icon: LucideIcon
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
}) {
  return (
    <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-inter text-sm text-slate-400">{label}</p>
          <p className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white mt-1">{value}</p>
        </div>
        <Icon size={24} className="text-slate-500" />
      </div>
      <div className="flex items-center gap-1 mt-3">
        {changeType === 'positive' ? (
          <ArrowUpRight size={14} className="text-green-400" />
        ) : changeType === 'negative' ? (
          <ArrowDownRight size={14} className="text-red-400" />
        ) : null}
        <span className={`font-inter text-xs font-medium ${
          changeType === 'positive' ? 'text-green-400' : changeType === 'negative' ? 'text-red-400' : 'text-slate-400'
        }`}>
          {change}
        </span>
      </div>
    </div>
  )
}

function InitialsAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="bg-blue-500 rounded-full flex items-center justify-center text-white font-inter font-semibold text-xs shrink-0"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}

/* ─────────────────────── Modal Component ─────────────────────── */

function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`bg-[#1E293B] border border-white/[0.06] rounded-xl w-full ${maxWidth} p-6 space-y-4 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-inter font-semibold text-xl text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><XCircle size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ─── Sidebar User Card — reads the signed-in user from localStorage ─── */
function SidebarUserCard({ onLogout }: { onLogout: () => void }) {
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(() => {
    try {
      const raw = localStorage.getItem('dlbc_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem('dlbc_user')
        setUser(raw ? JSON.parse(raw) : null)
      } catch { setUser(null) }
    }
    window.addEventListener('storage', sync)
    window.addEventListener('dlbc-auth-change', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('dlbc-auth-change', sync)
    }
  }, [])

  const name = user?.name || user?.email || 'Club Manager'
  const subtitle = user?.role === 'manager' ? 'Manager' : user?.role || 'Signed in'

  return (
    <div className="mt-3 px-3 py-3 rounded-lg bg-white/5 flex items-center gap-3">
      <InitialsAvatar name={name} size={32} />
      <div className="flex-1 min-w-0">
        <p className="font-inter font-medium text-sm text-white truncate">{name}</p>
        <p className="font-inter text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <button
        onClick={onLogout}
        className="text-slate-400 hover:text-red-400 transition-colors duration-150"
        title="Logout"
      >
        <LogOut size={18} />
      </button>
    </div>
  )
}

/* ─────────────────────── Sidebar ─────────────────────── */

function Sidebar({
  active,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}: {
  active: string
  onNavigate: (key: string) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  const navigate = useNavigate()
  const logoUrl = useSiteImage('logo')

  const handleLogout = () => {
    localStorage.removeItem('dlbc_user')
    localStorage.removeItem('dlbc_remember_email')
    navigate('/')
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0A1628] border-r border-white/[0.06] z-40 flex flex-col py-6 px-4 transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <Link to="/" className="flex items-center gap-3 mb-2 px-2 hover:opacity-80 transition-opacity" title="Back to Dublin Lions home">
          <img src={logoUrl} alt="Dublin Lions" className="h-9 w-auto brightness-0 invert" />
          <div>
            <p className="font-inter font-semibold text-sm text-white">Dublin Lions</p>
            <p className="font-inter text-xs text-slate-400">Manager Portal</p>
          </div>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 mb-6 mx-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 hover:text-white font-inter text-xs transition-all"
        >
          <Home size={14} />
          Back to Site
        </Link>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = active === item.key
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); onCloseMobile() }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-inter font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'text-white bg-blue-500/10 border-l-[3px] border-blue-500'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-[3px] border-transparent'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto">
          <div className="border-t border-white/[0.06] my-4" />
          <button
            onClick={() => { onNavigate('settings'); onCloseMobile() }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-inter font-medium text-sm transition-all duration-150 ${
              active === 'settings'
                ? 'text-white bg-blue-500/10 border-l-[3px] border-blue-500'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-[3px] border-transparent'
            }`}
          >
            <Settings size={20} />
            Settings
          </button>
          <SidebarUserCard onLogout={handleLogout} />
        </div>
      </aside>
    </>
  )
}

/* ─────────────────────── TopBar ─────────────────────── */

function TopBar({
  title,
  onMenuToggle,
  notifications,
  onDismissNotification,
  onClearNotifications,
  search,
  onSearch,
  onJumpToMembers,
  onQuickAction,
  showSearch,
}: {
  title: string
  onMenuToggle: () => void
  notifications: { id: string; text: string; detail: string; type: string }[]
  onDismissNotification: (id: string) => void
  onClearNotifications: () => void
  search: string
  onSearch: (s: string) => void
  onJumpToMembers: () => void
  onQuickAction: (action: 'add-member' | 'add-payment' | 'send-message' | 'add-fixture') => void
  showSearch: boolean
}) {
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-[rgba(15,23,42,0.95)] backdrop-blur-md border-b border-white/[0.06] z-30 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-slate-400 hover:text-white p-1 transition-colors duration-150"
        >
          <LayoutDashboard size={22} />
        </button>
        <div>
          <h2 className="font-oswald font-bold text-xl md:text-2xl text-white">{title}</h2>
        </div>
      </div>

      <div className="hidden md:flex items-center">
        {showSearch && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              onFocus={onJumpToMembers}
              placeholder="Search members..."
              className="w-64 lg:w-96 bg-white/5 border border-[#334155] rounded-lg pl-10 pr-4 py-2 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-200"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-slate-400 hover:text-white p-2 transition-colors duration-150"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#1E293B] border border-white/[0.06] rounded-xl shadow-xl z-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-inter font-semibold text-sm text-white">Notifications</p>
                {notifications.length > 0 && (
                  <button onClick={() => { onClearNotifications(); setShowNotifications(false) }} className="font-inter text-xs text-slate-400 hover:text-red-400">
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
                        n.type === 'success' ? 'bg-green-500/10' : n.type === 'alert' ? 'bg-red-500/10' : 'bg-amber-500/10'
                      }`}>
                        {n.type === 'success' ? <CheckCircle size={14} className="text-green-400" /> : n.type === 'alert' ? <AlertCircle size={14} className="text-red-400" /> : <Bell size={14} className="text-amber-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-inter text-sm text-white">{n.text}</p>
                        <p className="font-inter text-xs text-slate-400">{n.detail}</p>
                      </div>
                      <button onClick={() => onDismissNotification(n.id)} className="text-slate-400 hover:text-white"><X size={14} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded transition-all duration-150"
          >
            <Plus size={16} />
            Quick Action
            <ChevronDown size={14} />
          </button>
          {showQuickActions && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#1E293B] border border-white/[0.06] rounded-xl shadow-xl z-50 py-2">
              {([
                { label: 'Add Member', icon: UserPlus, action: 'add-member' as const },
                { label: 'Record Payment', icon: Banknote, action: 'add-payment' as const },
                { label: 'Send Message', icon: Send, action: 'send-message' as const },
                { label: 'Add Fixture', icon: Calendar, action: 'add-fixture' as const },
              ]).map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-2.5 font-inter text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors duration-150"
                  onClick={() => { setShowQuickActions(false); onQuickAction(item.action) }}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────── View: Dashboard ─────────────────────── */

function DashboardView({ data, onNavigate }: { data: ReturnType<typeof useLiveData>; onNavigate: (view: string) => void }) {
  const { sessions, announcements, payments } = data
  const stats = computeClubStats()

  const today = new Date().toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const recentActivity = useMemo(() => {
    const acts: { id: string; text: string; detail: string; time: string; type: string }[] = []
    payments.slice(0, 3).forEach((p) => {
      acts.push({
        id: `pay-${p.id}`,
        text: p.status === 'succeeded' ? `Payment received from ${p.playerName}` : `Payment ${p.status}: ${p.playerName}`,
        detail: `€${p.amount} via ${p.method}`,
        time: p.date,
        type: p.status === 'succeeded' ? 'payment' : 'alert',
      })
    })
    sessions.slice(0, 3).forEach((s) => {
      acts.push({
        id: `ses-${s.id}`,
        text: s.type === 'Match' ? `Match scheduled: ${s.title}` : `Session: ${s.title}`,
        detail: `${s.date} at ${s.time} — ${s.location}`,
        time: s.date,
        type: 'message',
      })
    })
    announcements.slice(0, 2).forEach((a) => {
      acts.push({
        id: `ann-${a.id}`,
        text: `Announcement: ${a.subject}`,
        detail: a.recipients,
        time: a.date,
        type: 'registration',
      })
    })
    return acts
  }, [payments, sessions, announcements])

  const activityIcons: Record<string, { icon: LucideIcon; color: string }> = {
    payment: { icon: CheckCircle, color: 'bg-green-500/10 text-green-400' },
    registration: { icon: UserPlus, color: 'bg-blue-500/10 text-blue-400' },
    alert: { icon: AlertCircle, color: 'bg-red-500/10 text-red-400' },
    message: { icon: MessageSquare, color: 'bg-amber-500/10 text-amber-400' },
  }

  const upcomingSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3)
  }, [sessions])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">
            Welcome back{(() => { try { const u = JSON.parse(localStorage.getItem('dlbc_user') || 'null'); return u?.name ? `, ${u.name.split(' ')[0]}` : '' } catch { return '' } })()}
          </h1>
          <p className="font-inter text-base text-slate-400 mt-1">
            Here&apos;s what&apos;s happening with the club today.
          </p>
        </div>
        <p className="font-inter text-sm text-slate-500">{today}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={String(stats.totalPlayers)} icon={Users} change="+5% from last month" changeType="positive" />
        <StatCard label="Active Teams" value={String(stats.totalTeams)} icon={Trophy} change="All teams registered" changeType="positive" />
        <StatCard label="Revenue (Monthly)" value={`€${stats.monthlyRevenue.toLocaleString()}`} icon={Euro} change="+8% from last month" changeType="positive" />
        <StatCard label="Overdue Payments" value={String(stats.overduePlayers)} icon={AlertCircle} change="-2 improving" changeType="positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-[#1E293B] border border-white/[0.06] rounded-xl">
          <div className="p-6 pb-4">
            <h3 className="font-inter font-semibold text-lg text-white">Recent Activity</h3>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <StickyNote size={32} className="text-slate-500 mx-auto mb-3" />
                <p className="font-inter text-sm text-slate-400">No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity) => {
                const { icon: ActIcon, color } = activityIcons[activity.type] || activityIcons.message
                return (
                  <div key={activity.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors duration-150">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                      <ActIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter font-medium text-sm text-white">{activity.text}</p>
                      <p className="font-inter text-xs text-slate-400">{activity.detail}</p>
                    </div>
                    <span className="font-inter text-xs text-slate-500 shrink-0">{activity.time}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
            <h3 className="font-inter font-semibold text-lg text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => { onNavigate('members'); setTimeout(() => window.dispatchEvent(new Event('dlbc-open-add-member')), 0) }}
                className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-4 py-3 rounded transition-all duration-200"
              >
                <UserPlus size={16} />
                Add New Member
              </button>
              <button
                onClick={() => onNavigate('payments')}
                className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-4 py-3 rounded transition-all duration-200"
              >
                <Banknote size={16} />
                Record Cash Payment
              </button>
              <button
                onClick={() => onNavigate('chat')}
                className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-4 py-3 rounded transition-all duration-200"
              >
                <Send size={16} />
                Send Announcement
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-4 py-3 rounded transition-all duration-200"
              >
                <FileText size={16} />
                Generate Report
              </button>
            </div>
          </div>

          <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
            <h3 className="font-inter font-semibold text-lg text-white mb-4">Upcoming Sessions</h3>
            <div className="space-y-4">
              {upcomingSessions.length === 0 ? (
                <p className="font-inter text-sm text-slate-400 text-center py-4">No upcoming sessions</p>
              ) : (
                upcomingSessions.map((s, i) => (
                  <div key={s.id} className={`${i > 0 ? 'border-t border-white/[0.06] pt-4' : ''}`}>
                    <p className="font-oswald font-bold text-base text-blue-400">{s.date}</p>
                    <p className="font-inter font-medium text-sm text-white mt-1">{s.title}</p>
                    <p className="font-inter text-xs text-slate-400 mt-0.5">{s.location} — {s.time}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <UnpaidThisMonthPanel data={data} onNavigate={onNavigate} />
    </div>
  )
}

/* ─── Dashboard widget: members who haven't paid this month ─── */
function UnpaidThisMonthPanel({
  data,
  onNavigate,
}: {
  data: ReturnType<typeof useLiveData>
  onNavigate: (view: string) => void
}) {
  const { players, refresh } = data
  const [unpaid, setUnpaid] = useState(() => players.filter((p) => !hasPaidThisMonth(p.id)))

  useEffect(() => {
    setUnpaid(players.filter((p) => !hasPaidThisMonth(p.id)))
  }, [players])

  const handleMarkPaid = (playerId: string) => {
    recordCashPayment(playerId)
    refresh()
  }

  if (unpaid.length === 0) {
    return (
      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6 flex items-center gap-3">
        <CheckCircle size={20} className="text-green-400" />
        <p className="font-inter text-sm text-slate-300">Every member has paid this month. Nice work.</p>
      </div>
    )
  }

  const monthLabel = new Date().toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl">
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h3 className="font-inter font-semibold text-lg text-white">Unpaid this month</h3>
          <p className="font-inter text-xs text-slate-500 mt-0.5">{unpaid.length} member{unpaid.length !== 1 ? 's' : ''} outstanding for {monthLabel}</p>
        </div>
        <button
          onClick={() => onNavigate('payments')}
          className="font-inter text-xs text-blue-400 hover:text-blue-300"
        >
          View all payments →
        </button>
      </div>
      <div className="divide-y divide-white/[0.06] max-h-96 overflow-y-auto">
        {unpaid.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.03]">
            <InitialsAvatar name={p.name} size={32} />
            <div className="flex-1 min-w-0">
              <p className="font-inter font-medium text-sm text-white truncate">{p.name}</p>
              <p className="font-inter text-xs text-slate-500 truncate">
                €{getMonthlyFeeForPlayer(p.id)} · last paid {p.lastPaymentDate || '—'}
              </p>
            </div>
            <StatusBadge status={p.status} />
            <button
              onClick={() => handleMarkPaid(p.id)}
              className="ml-2 inline-flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-300 border border-green-500/20 font-inter font-semibold text-xs px-3 py-1.5 rounded transition-colors"
              title="Record a cash payment for this month"
            >
              <Banknote size={14} /> Mark Paid (Cash)
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────── View: Members ─────────────────────── */

const POSITIONS = ['Guard', 'Forward', 'Center', 'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward']
const PAYMENT_PLANS = ['Monthly', 'Full Session', 'Per Session', 'None']

function MembersView({ data, initialSearch = '' }: { data: ReturnType<typeof useLiveData>; initialSearch?: string }) {
  const { players, teams, ageGroups, savePlayers, saveTeams } = data
  const [search, setSearch] = useState(initialSearch)

  useEffect(() => { setSearch(initialSearch) }, [initialSearch])

  useEffect(() => {
    const h = () => setShowAddModal(true)
    window.addEventListener('dlbc-open-add-member', h)
    return () => window.removeEventListener('dlbc-open-add-member', h)
  }, [])
  const [teamFilter, setTeamFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [ageGroupFilter, setAgeGroupFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [form, setForm] = useState<Partial<Player>>({
    name: '', email: '', phone: '', dob: '', gender: 'Male', teamIds: [], position: 'Guard', jerseyNumber: 0,
    status: 'Paid', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '', registrationDate: '',
    guardianName: '', guardianPhone: '', registeredWithBI: true,
  })

  const filtered = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter
      const matchesAge = ageGroupFilter === 'All' || p.teamIds.some((tid) => {
        const t = teams.find((tm) => tm.id === tid)
        return t?.ageGroupId === ageGroupFilter
      })
      const matchesTeam = teamFilter === 'All' || p.teamIds.includes(teamFilter)
      return matchesSearch && matchesStatus && matchesAge && matchesTeam
    })
  }, [search, teamFilter, statusFilter, ageGroupFilter, players, teams])

  const resetForm = () => {
    setForm({
      name: '', email: '', phone: '', dob: '', gender: 'Male', teamIds: [], position: 'Guard', jerseyNumber: 0,
      status: 'Paid', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '', registrationDate: '',
      guardianName: '', guardianPhone: '', registeredWithBI: true,
    })
  }

  const handleSave = () => {
    if (!form.name?.trim() || !form.email?.trim()) return
    const now = new Date().toISOString().split('T')[0]
    if (editingPlayer) {
      const updated: Player = {
        ...editingPlayer,
        ...(form as Player),
      }
      const next = players.map((p) => (p.id === updated.id ? updated : p))
      savePlayers(next)
      // Update team rosters
      const nextTeams = teams.map((t) => {
        const onTeam = updated.teamIds.includes(t.id)
        const wasOnTeam = t.players.includes(updated.id)
        if (onTeam && !wasOnTeam) return { ...t, players: [...t.players, updated.id] }
        if (!onTeam && wasOnTeam) return { ...t, players: t.players.filter((pid) => pid !== updated.id) }
        return t
      })
      saveTeams(nextTeams)
      setEditingPlayer(null)
    } else {
      const newPlayer: Player = {
        id: `p${Date.now()}`,
        name: form.name!,
        email: form.email!,
        phone: form.phone || '',
        dob: form.dob || '',
        gender: form.gender || 'Male',
        teamIds: form.teamIds || [],
        position: form.position || 'Guard',
        jerseyNumber: form.jerseyNumber || 0,
        status: form.status || 'Paid',
        paymentPlan: form.paymentPlan || 'Monthly',
        amount: form.amount || 50,
        lastPaymentDate: form.lastPaymentDate || now,
        registrationDate: form.registrationDate || now,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        registeredWithBI: form.registeredWithBI ?? true,
      }
      const next = [...players, newPlayer]
      savePlayers(next)
      const nextTeams = teams.map((t) =>
        newPlayer.teamIds.includes(t.id) ? { ...t, players: [...t.players, newPlayer.id] } : t
      )
      saveTeams(nextTeams)
    }
    setShowAddModal(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    const next = players.filter((p) => p.id !== id)
    savePlayers(next)
    const nextTeams = teams.map((t) => ({ ...t, players: t.players.filter((pid) => pid !== id) }))
    saveTeams(nextTeams)
    setConfirmDelete(null)
  }

  const openEdit = (player: Player) => {
    setForm({ ...player })
    setEditingPlayer(player)
    setShowAddModal(true)
  }

  const openAdd = () => {
    resetForm()
    setEditingPlayer(null)
    setShowAddModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Members</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
        >
          <Plus size={16} />
          Add Member
        </button>
      </div>

      <div className="bg-[#1E293B] rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="relative md:hidden">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 bg-white/5 border border-[#334155] rounded-lg pl-9 pr-3 py-2 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-200"
          />
        </div>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="bg-white/5 border border-[#334155] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-amber-400"
        >
          <option value="All">All Teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={ageGroupFilter}
          onChange={(e) => setAgeGroupFilter(e.target.value)}
          className="bg-white/5 border border-[#334155] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-amber-400"
        >
          <option value="All">All Age Groups</option>
          {ageGroups.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-[#334155] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-amber-400"
        >
          <option value="All">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>
        <button className="ml-auto flex items-center gap-2 bg-transparent border border-white/30 text-white font-inter font-medium text-sm px-3 py-2 rounded hover:bg-white/5 transition-colors duration-150">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Name', 'Teams', 'Status', 'Plan', 'Position', 'Jersey', 'BI Reg', 'Actions'].map((col) => (
                  <th key={col} className="px-6 py-4 font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 text-left">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((member) => (
                <tr key={member.id} className="hover:bg-white/5 transition-colors duration-150 cursor-pointer" onClick={() => openEdit(member)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar name={member.name} />
                      <div>
                        <p className="font-inter font-medium text-sm text-white">{member.name}</p>
                        <p className="font-inter text-xs text-slate-400">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {member.teamIds.map((tid) => {
                        const t = teams.find((tm) => tm.id === tid)
                        return t ? <span key={tid} className="text-xs font-inter text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{t.name}</span> : null
                      })}
                      {member.teamIds.length === 0 && <span className="text-xs font-inter text-slate-500">Unassigned</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={member.status} /></td>
                  <td className="px-6 py-4 font-inter text-sm text-slate-300">{member.paymentPlan}</td>
                  <td className="px-6 py-4 font-inter text-sm text-slate-300">{member.position}</td>
                  <td className="px-6 py-4 font-inter text-sm text-blue-400 font-oswald font-bold">#{member.jerseyNumber}</td>
                  <td className="px-6 py-4">
                    {member.registeredWithBI ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs font-inter"><ShieldCheck size={12} /> Yes</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-xs font-inter"><XCircle size={12} /> No</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {!hasPaidThisMonth(member.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Record a cash payment of €${getMonthlyFeeForPlayer(member.id)} for ${member.name}?`)) {
                              recordCashPayment(member.id)
                              data.refresh()
                            }
                          }}
                          className="inline-flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-300 border border-green-500/20 font-inter font-semibold text-xs px-2 py-1 rounded transition-colors"
                          title="Record a cash payment for this month"
                        >
                          <Banknote size={12} /> Mark Paid
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(member) }}
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(member.id) }}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06]">
          <p className="font-inter text-xs text-slate-400">
            Showing {filtered.length} of {players.length} members
          </p>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setEditingPlayer(null) }} title={editingPlayer ? 'Edit Member' : 'Add New Member'} maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formField('Full Name', <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="John Doe" />)}
          {formField('Email', <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="john@email.ie" />)}
          {formField('Phone', <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="+353 87 123 4567" />)}
          {formField('Date of Birth', <input type="date" value={form.dob || ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" />)}
          {formField('Gender', (
            <select value={form.gender || 'Male'} onChange={(e) => setForm({ ...form, gender: e.target.value as 'Male' | 'Female' })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          ))}
          {formField('Position', (
            <select value={form.position || 'Guard'} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400">
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ))}
          {formField('Jersey Number', <input type="number" value={form.jerseyNumber || 0} onChange={(e) => setForm({ ...form, jerseyNumber: parseInt(e.target.value) || 0 })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" />)}
          {formField('Payment Status', (
            <select value={form.status || 'Paid'} onChange={(e) => setForm({ ...form, status: e.target.value as 'Paid' | 'Pending' | 'Overdue' })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400">
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          ))}
          {formField('Payment Plan', (
            <select value={form.paymentPlan || 'Monthly'} onChange={(e) => setForm({ ...form, paymentPlan: e.target.value as Player['paymentPlan'] })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400">
              {PAYMENT_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ))}
          {formField('Amount (€)', <input type="number" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" />)}
          {formField('Last Payment Date', <input type="date" value={form.lastPaymentDate || ''} onChange={(e) => setForm({ ...form, lastPaymentDate: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" />)}
          {formField('Registration Date', <input type="date" value={form.registrationDate || ''} onChange={(e) => setForm({ ...form, registrationDate: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" />)}
          {formField('Guardian Name', <input value={form.guardianName || ''} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="Parent / Guardian" />)}
          {formField('Guardian Phone', <input value={form.guardianPhone || ''} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="+353 87 000 0000" />)}
          <div className="md:col-span-2">
            {formField('Teams', (
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 bg-white/5 border border-[#334155] rounded-lg px-3 py-2 cursor-pointer hover:bg-white/[0.08] transition-colors">
                    <input
                      type="checkbox"
                      checked={form.teamIds?.includes(t.id) || false}
                      onChange={(e) => {
                        const current = form.teamIds || []
                        const next = e.target.checked ? [...current, t.id] : current.filter((id) => id !== t.id)
                        setForm({ ...form, teamIds: next })
                      }}
                      className="accent-blue-500"
                    />
                    <span className="font-inter text-sm text-white">{t.name}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <input type="checkbox" id="bi-reg" checked={form.registeredWithBI || false} onChange={(e) => setForm({ ...form, registeredWithBI: e.target.checked })} className="accent-blue-500" />
            <label htmlFor="bi-reg" className="font-inter text-sm text-slate-300">Registered with Basketball Ireland</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
          <button onClick={() => { setShowAddModal(false); setEditingPlayer(null) }} className="px-4 py-2 font-inter text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} className="bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">
            {editingPlayer ? 'Save Changes' : 'Add Member'}
          </button>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Delete">
        <p className="font-inter text-sm text-slate-300">Are you sure you want to delete this member? This action cannot be undone.</p>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 font-inter text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={() => confirmDelete && handleDelete(confirmDelete)} className="bg-red-500 hover:bg-red-400 text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}

/* ─────────────────────── View: Teams ─────────────────────── */

function TeamsView({ data }: { data: ReturnType<typeof useLiveData> }) {
  const { teams, ageGroups, saveTeams, saveAgeGroups } = data
  const [activeAgeGroup, setActiveAgeGroup] = useState('senior')
  const [activeDivision, setActiveDivision] = useState<string | 'all'>('all')
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showAddDivision, setShowAddDivision] = useState(false)
  const [teamForm, setTeamForm] = useState({ name: '', gender: 'Men' as Team['gender'], divisionId: '', coach: '' })
  const [divisionName, setDivisionName] = useState('')

  const currentAgeGroup = ageGroups.find((ag) => ag.id === activeAgeGroup)
  const divisions = currentAgeGroup?.divisions || []

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (t.ageGroupId !== activeAgeGroup) return false
      if (activeDivision !== 'all' && t.divisionId !== activeDivision) return false
      return true
    })
  }, [teams, activeAgeGroup, activeDivision])

  const handleAddTeam = () => {
    if (!teamForm.name.trim() || !teamForm.divisionId) return
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: teamForm.name,
      gender: teamForm.gender,
      ageGroupId: activeAgeGroup,
      divisionId: teamForm.divisionId,
      coach: teamForm.coach || 'TBD',
      players: [],
      season: '2025/26',
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    }
    saveTeams([...teams, newTeam])
    setShowAddTeam(false)
    setTeamForm({ name: '', gender: 'Men', divisionId: '', coach: '' })
  }

  const handleAddDivision = () => {
    if (!divisionName.trim() || !currentAgeGroup) return
    const newDivision: Division = {
      id: `${activeAgeGroup}-${divisionName.toLowerCase().replace(/\s+/g, '-')}`,
      name: divisionName,
      level: divisions.length + 1,
    }
    const nextAgeGroups = ageGroups.map((ag) =>
      ag.id === activeAgeGroup ? { ...ag, divisions: [...ag.divisions, newDivision] } : ag
    )
    saveAgeGroups(nextAgeGroups)
    setShowAddDivision(false)
    setDivisionName('')
  }

  const handleDeleteTeam = (id: string) => {
    if (!confirm('Delete this team?')) return
    const next = teams.filter((t) => t.id !== id)
    saveTeams(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Teams</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAddDivision(true)} className="flex items-center gap-2 bg-transparent border border-white/30 text-white font-inter font-medium text-sm px-3 py-2 rounded hover:bg-white/5 transition-colors">
            <Plus size={14} />
            Add Division
          </button>
          <button onClick={() => setShowAddTeam(true)} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150">
            <Plus size={16} />
            Add Team
          </button>
        </div>
      </div>

      {/* Age Group Tabs */}
      <div className="flex gap-1 bg-[#1E293B] rounded-lg p-1 w-fit overflow-x-auto">
        {ageGroups.map((ag) => (
          <button
            key={ag.id}
            onClick={() => { setActiveAgeGroup(ag.id); setActiveDivision('all') }}
            className={`px-4 py-2 rounded-md font-inter text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              activeAgeGroup === ag.id ? 'bg-white/5 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
            }`}
          >
            {ag.name}
          </button>
        ))}
      </div>

      {/* Division Filter */}
      {divisions.length > 0 && (
        <div className="flex gap-2 items-center">
          <Filter size={14} className="text-slate-400" />
          <button
            onClick={() => setActiveDivision('all')}
            className={`px-3 py-1 rounded-md font-inter text-xs font-medium transition-all ${activeDivision === 'all' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
          >
            All Divisions
          </button>
          {divisions.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDivision(d.id)}
              className={`px-3 py-1 rounded-md font-inter text-xs font-medium transition-all ${activeDivision === d.id ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Team Cards */}
      {filteredTeams.length === 0 ? (
        <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-8 text-center">
          <Trophy size={40} className="text-slate-500 mx-auto mb-3" />
          <p className="font-inter text-lg text-slate-300">No teams in this age group yet.</p>
          <p className="font-inter text-sm text-slate-400 mt-1">Click "Add Team" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const teamPlayers = getTeamPlayers(team.id)
            const winPct = team.wins + team.losses > 0 ? Math.round((team.wins / (team.wins + team.losses)) * 100) : 0
            return (
              <div key={team.id} className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-inter font-semibold text-base text-white">{team.name}</h3>
                    <p className="font-inter text-xs text-slate-400 mt-0.5">{getTeamAgeDivisionLabel(team)}</p>
                  </div>
                  <div className="flex gap-1">
                    <TeamBadge team={team.gender} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0A1628] rounded-lg p-3 text-center">
                    <p className="font-oswald font-bold text-xl text-white">{team.wins}-{team.losses}</p>
                    <p className="font-inter text-xs text-slate-400 uppercase tracking-wider">Record</p>
                  </div>
                  <div className="bg-[#0A1628] rounded-lg p-3 text-center">
                    <p className="font-oswald font-bold text-xl text-blue-400">{winPct}%</p>
                    <p className="font-inter text-xs text-slate-400 uppercase tracking-wider">Win Rate</p>
                  </div>
                  <div className="bg-[#0A1628] rounded-lg p-3 text-center">
                    <p className="font-oswald font-bold text-xl text-white">{teamPlayers.length}</p>
                    <p className="font-inter text-xs text-slate-400 uppercase tracking-wider">Players</p>
                  </div>
                  <div className="bg-[#0A1628] rounded-lg p-3 text-center">
                    <p className="font-oswald font-bold text-xl text-amber-400">{team.pointsFor}</p>
                    <p className="font-inter text-xs text-slate-400 uppercase tracking-wider">Points For</p>
                  </div>
                </div>

                <div>
                  <p className="font-inter text-xs text-slate-400 uppercase tracking-wider mb-2">Coach</p>
                  <div className="flex items-center gap-2">
                    <InitialsAvatar name={team.coach} size={28} />
                    <span className="font-inter text-sm text-white">{team.coach}</span>
                  </div>
                </div>

                <div>
                  <p className="font-inter text-xs text-slate-400 uppercase tracking-wider mb-2">Roster</p>
                  <div className="flex flex-wrap gap-1">
                    {teamPlayers.slice(0, 6).map((p) => (
                      <span key={p.id} className="text-xs font-inter text-slate-300 bg-white/5 px-2 py-1 rounded border border-white/[0.06]">
                        #{p.jerseyNumber} {p.name.split(' ').pop()}
                      </span>
                    ))}
                    {teamPlayers.length > 6 && (
                      <span className="text-xs font-inter text-slate-400 bg-white/5 px-2 py-1 rounded">+{teamPlayers.length - 6} more</span>
                    )}
                    {teamPlayers.length === 0 && (
                      <span className="text-xs font-inter text-slate-500">No players assigned</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTeam(team.id)}
                  className="w-full flex items-center justify-center gap-2 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 font-inter font-medium text-xs px-3 py-2 rounded transition-all"
                >
                  <Trash2 size={14} />
                  Delete Team
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showAddTeam} onClose={() => setShowAddTeam(false)} title="Add New Team">
        <div className="space-y-4">
          {formField('Team Name', <input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="Dublin Lions U16 Boys A" />)}
          <div className="grid grid-cols-2 gap-4">
            {formField('Gender', (
              <select value={teamForm.gender} onChange={(e) => setTeamForm({ ...teamForm, gender: e.target.value as Team['gender'] })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400">
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
              </select>
            ))}
            {formField('Division', (
              <select value={teamForm.divisionId} onChange={(e) => setTeamForm({ ...teamForm, divisionId: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400">
                <option value="">Select Division</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ))}
          </div>
          {formField('Coach', <input value={teamForm.coach} onChange={(e) => setTeamForm({ ...teamForm, coach: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="Coach Name" />)}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setShowAddTeam(false)} className="px-4 py-2 font-inter text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleAddTeam} className="bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">Add Team</button>
        </div>
      </Modal>

      <Modal open={showAddDivision} onClose={() => setShowAddDivision(false)} title="Add Division">
        <div className="space-y-4">
          <p className="font-inter text-sm text-slate-400">Adding division to <span className="text-white font-medium">{currentAgeGroup?.name}</span></p>
          {formField('Division Name', <input value={divisionName} onChange={(e) => setDivisionName(e.target.value)} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="e.g., E or Development" />)}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setShowAddDivision(false)} className="px-4 py-2 font-inter text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleAddDivision} className="bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">Add Division</button>
        </div>
      </Modal>
    </div>
  )
}

/* ─────────────────────── View: Payments ─────────────────────── */

function PaymentsView({ data }: { data: ReturnType<typeof useLiveData> }) {
  const { payments, players } = data
  const [paymentTab, setPaymentTab] = useState('All')

  const filteredTransactions = useMemo(() => {
    if (paymentTab === 'All') return payments
    return payments.filter((t) => {
      const statusMap: Record<string, string[]> = {
        Completed: ['succeeded'],
        Pending: ['pending'],
        Failed: ['failed'],
        Overdue: ['failed'],
      }
      return statusMap[paymentTab]?.includes(t.status)
    })
  }, [paymentTab, payments])

  const revenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const byMonth = new Map<string, number>()
    payments.filter((p) => p.status === 'succeeded').forEach((p) => {
      const month = months[new Date(p.date).getMonth()]
      byMonth.set(month, (byMonth.get(month) || 0) + p.amount)
    })
    return months.map((m) => ({ month: m, revenue: byMonth.get(m) || 0 }))
  }, [payments])

  const paymentStatusData = useMemo(() => {
    const counts = [
      players.filter((p) => p.status === 'Paid').length,
      players.filter((p) => p.status === 'Pending').length,
      players.filter((p) => p.status === 'Overdue').length,
    ]
    return [
      { name: 'Paid', value: counts[0], color: '#22C55E' },
      { name: 'Pending', value: counts[1], color: '#F59E0B' },
      { name: 'Overdue', value: counts[2], color: '#EF4444' },
    ].filter((d) => d.value > 0)
  }, [players])

  const methodIcons: Record<string, LucideIcon> = {
    Stripe: CreditCard,
    Cash: Banknote,
    'Bank Transfer': Landmark,
  }

  const monthlyRevenue = payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0)
  const outstanding = players.filter((p) => p.status === 'Overdue').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Payments</h2>
        <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150">
          <Plus size={16} />
          Record Payment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="This Month" value={`€${monthlyRevenue.toLocaleString()}`} icon={TrendingUp} change="From live payments" changeType="positive" />
        <StatCard label="Outstanding" value={`€${outstanding.toLocaleString()}`} icon={AlertCircle} change={`${players.filter((p) => p.status === 'Overdue').length} members`} changeType="negative" />
        <StatCard label="Stripe Revenue" value={`€${payments.filter((p) => p.status === 'succeeded' && p.method === 'Stripe').reduce((s, p) => s + p.amount, 0).toLocaleString()}`} icon={CreditCard} change="Stripe processed" changeType="positive" />
        <StatCard label="Cash / Other" value={`€${payments.filter((p) => p.status === 'succeeded' && p.method !== 'Stripe').reduce((s, p) => s + p.amount, 0).toLocaleString()}`} icon={Banknote} change="Manual payments" changeType="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
          <h3 className="font-inter font-semibold text-lg text-white mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `€${v}`} />
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#fff' }} formatter={(value: number) => [`€${value}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
          <h3 className="font-inter font-semibold text-lg text-white mb-4">Payment Status Breakdown</h3>
          {paymentStatusData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center">
              <p className="font-inter text-sm text-slate-400">No payment data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={paymentStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-6 mt-2">
            {paymentStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-inter text-sm text-slate-300">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stripe Integration Panel */}
      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-inter font-semibold text-lg text-white">Stripe Connected</h3>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-inter font-medium rounded border border-amber-500/20">TEST MODE</span>
              </div>
              <p className="font-inter text-sm text-slate-400">Account: Dublin Lions BC — Last sync: 2 min ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-transparent border border-white/30 text-white font-inter font-medium text-sm px-4 py-2 rounded hover:bg-white/5 transition-colors duration-150">
              <RefreshCw size={14} />
              Sync Now
            </button>
            <a href="https://dashboard.stripe.com/test" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-transparent border border-white/30 text-white font-inter font-medium text-sm px-4 py-2 rounded hover:bg-white/5 transition-colors duration-150">
              <ExternalLink size={14} />
              View Stripe Dashboard
            </a>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-[#0A1628] border border-white/[0.06] rounded-lg p-4">
            <p className="font-inter text-xs text-slate-500 uppercase tracking-widest">Test API Key</p>
            <div className="flex items-center gap-2 mt-2">
              <code className="font-mono text-sm text-slate-300">pk_test_••••••••••••••••••••</code>
              <button className="text-slate-400 hover:text-white transition-colors"><Eye size={14} /></button>
            </div>
          </div>
          <div className="bg-[#0A1628] border border-white/[0.06] rounded-lg p-4">
            <p className="font-inter text-xs text-slate-500 uppercase tracking-widest">Payment Plans</p>
            <div className="flex gap-4 mt-2">
              <div className="flex-1 bg-white/5 rounded-lg p-3 text-center">
                <p className="font-oswald font-bold text-lg text-white">€50</p>
                <p className="font-inter text-xs text-slate-400">Monthly</p>
              </div>
              <div className="flex-1 bg-white/5 rounded-lg p-3 text-center">
                <p className="font-oswald font-bold text-lg text-white">€250</p>
                <p className="font-inter text-xs text-slate-400">Full Session</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-[#1E293B] rounded-lg p-1 w-fit">
        {['All', 'Completed', 'Pending', 'Failed', 'Overdue'].map((tab) => (
          <button
            key={tab}
            onClick={() => setPaymentTab(tab)}
            className={`px-4 py-2 rounded-md font-inter text-sm font-medium transition-all duration-150 ${paymentTab === tab ? 'bg-blue-500/10 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Date', 'Member', 'Type', 'Amount', 'Method', 'Status', 'Actions'].map((col) => (
                  <th key={col} className="px-6 py-4 font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredTransactions.map((t) => {
                const MethodIcon = methodIcons[t.method] || CreditCard
                return (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="px-6 py-4 font-inter text-sm text-slate-300">{t.date}</td>
                    <td className="px-6 py-4 font-inter font-medium text-sm text-white">{t.playerName}</td>
                    <td className="px-6 py-4 font-inter text-sm text-slate-300">Membership</td>
                    <td className="px-6 py-4 font-inter text-sm text-white">€{t.amount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MethodIcon size={14} className="text-slate-400" />
                        <span className="font-inter text-sm text-slate-300">{t.method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                    <td className="px-6 py-4">
                      {t.status === 'failed' ? (
                        <button className="text-blue-400 hover:text-blue-300 font-inter text-sm font-medium transition-colors">Retry</button>
                      ) : (
                        <button className="text-slate-400 hover:text-white font-inter text-sm transition-colors">View</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
        <h3 className="font-inter font-semibold text-lg text-white mb-4">Failed Payment Recovery</h3>
        <div className="space-y-3">
          {payments.filter((t) => t.status === 'failed').length === 0 ? (
            <p className="font-inter text-sm text-slate-400 text-center py-4">No failed payments</p>
          ) : (
            payments.filter((t) => t.status === 'failed').map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-[#0A1628] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center">
                    <XCircle size={14} className="text-red-400" />
                  </div>
                  <div>
                    <p className="font-inter font-medium text-sm text-white">{t.playerName}</p>
                    <p className="font-inter text-xs text-slate-400">{t.date} — €{t.amount} — {t.method}</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded transition-all duration-150">
                  <RefreshCw size={14} />
                  Retry
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── View: Schedule ─────────────────────── */

/* ─── Public Fixtures (with results) — embedded in Schedule view ─── */
function PublicFixturesPanel() {
  const [list, setList] = useState<ClubFixture[]>(() => getFixtures())
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ClubFixture | null>(null)
  const [resultFor, setResultFor] = useState<ClubFixture | null>(null)

  const refresh = useCallback(() => setList(getFixtures()), [])

  useEffect(() => {
    const h = (e: StorageEvent) => { if (e.key === 'dlbc_fixtures') refresh() }
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }, [refresh])

  const sorted = useMemo(
    () => [...list].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)),
    [list],
  )

  const handleDelete = (id: string) => {
    if (!confirm('Delete this fixture? This cannot be undone.')) return
    deleteFixture(id)
    refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Public Fixtures & Results</h2>
          <p className="font-inter text-sm text-slate-400 mt-1">Add upcoming games and record final scores. Visible on the homepage and Fixtures page.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150 shrink-0"
        >
          <Plus size={16} />
          Add Fixture
        </button>
      </div>

      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Date', 'Time', 'Opponent', 'Venue', 'Competition', 'Result', 'Actions'].map((col) => (
                  <th key={col} className="px-4 py-3 font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {sorted.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center font-inter text-sm text-slate-400">No fixtures yet. Click "Add Fixture" to create one.</td></tr>
              ) : sorted.map((f) => (
                <tr key={f.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-inter text-sm text-white">{f.date}</td>
                  <td className="px-4 py-3 font-inter text-sm text-slate-300">{f.time}</td>
                  <td className="px-4 py-3 font-inter text-sm text-white">{f.opponent}</td>
                  <td className="px-4 py-3 font-inter text-sm text-slate-300">{f.venue}</td>
                  <td className="px-4 py-3 font-inter text-sm text-slate-300">{f.competition}</td>
                  <td className="px-4 py-3 font-inter text-sm">
                    {f.result ? (
                      <span className={`font-mono font-semibold ${f.result.lionsScore > f.result.opponentScore ? 'text-green-400' : 'text-red-400'}`}>
                        {f.result.lionsScore}-{f.result.opponentScore}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setResultFor(f)}
                        title={f.result ? 'Edit result' : 'Record result'}
                        className="p-2 text-slate-400 hover:text-amber-400 rounded hover:bg-white/5"
                      >
                        <Trophy size={16} />
                      </button>
                      <button
                        onClick={() => { setEditing(f); setShowForm(true) }}
                        title="Edit fixture"
                        className="p-2 text-slate-400 hover:text-blue-400 rounded hover:bg-white/5"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        title="Delete"
                        className="p-2 text-slate-400 hover:text-red-400 rounded hover:bg-white/5"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <FixtureForm
          fixture={editing}
          onClose={() => setShowForm(false)}
          onSave={(f) => { upsertFixture(f); refresh(); setShowForm(false) }}
        />
      )}

      {resultFor && (
        <ResultForm
          fixture={resultFor}
          onClose={() => setResultFor(null)}
          onSave={(r) => { setFixtureResult(resultFor.id, r); refresh(); setResultFor(null) }}
          onClear={() => { setFixtureResult(resultFor.id, null); refresh(); setResultFor(null) }}
        />
      )}
    </div>
  )
}

function FixtureForm({ fixture, onClose, onSave }: { fixture: ClubFixture | null; onClose: () => void; onSave: (f: ClubFixture) => void }) {
  const [form, setForm] = useState<ClubFixture>(
    fixture ?? {
      id: `fx-${Date.now().toString(36)}`,
      date: new Date().toISOString().split('T')[0],
      time: '19:00',
      opponent: '',
      venue: 'Home',
      competition: "Domino's Division 1",
    },
  )
  const valid = form.opponent.trim() && form.date && form.time

  return (
    <Modal open onClose={onClose} title={fixture ? 'Edit Fixture' : 'Add Fixture'} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {formField('Date', (
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500" />
          ))}
          {formField('Tip-off', (
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500" />
          ))}
        </div>
        {formField('Opponent', (
          <input type="text" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} placeholder="e.g. Neptune BC" className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500" />
        ))}
        <div className="grid grid-cols-2 gap-3">
          {formField('Venue', (
            <select value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value as 'Home' | 'Away' })} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="Home">Home</option>
              <option value="Away">Away</option>
            </select>
          ))}
          {formField('Competition', (
            <input type="text" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500" />
          ))}
        </div>
        <div className="border-t border-white/[0.06] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-inter font-semibold text-sm text-white">Tickets</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.ticketsEnabled}
                onChange={(e) => setForm({ ...form, ticketsEnabled: e.target.checked })}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="font-inter text-xs text-slate-300">Sell tickets for this match</span>
            </label>
          </div>
          {form.ticketsEnabled && (
            <div className="grid grid-cols-2 gap-3">
              {formField('Adult price (€)', (
                <input
                  type="number"
                  min={0}
                  value={form.adultPrice ?? 0}
                  onChange={(e) => setForm({ ...form, adultPrice: Number(e.target.value) })}
                  className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500"
                />
              ))}
              {formField('Kid price (€)', (
                <input
                  type="number"
                  min={0}
                  value={form.kidPrice ?? 0}
                  onChange={(e) => setForm({ ...form, kidPrice: Number(e.target.value) })}
                  className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500"
                />
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!form.soldOut} onChange={(e) => setForm({ ...form, soldOut: e.target.checked })} className="w-4 h-4 accent-blue-500" />
            <span className="font-inter text-sm text-slate-300">Mark as sold out</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="bg-white/5 border border-white/[0.06] text-slate-300 font-inter text-sm px-4 py-2 rounded-lg hover:bg-white/10">Cancel</button>
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-inter font-semibold text-sm px-4 py-2 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  )
}

function ResultForm({ fixture, onClose, onSave, onClear }: { fixture: ClubFixture; onClose: () => void; onSave: (r: { lionsScore: number; opponentScore: number; mvp?: string }) => void; onClear: () => void }) {
  const [lionsScore, setLions] = useState(fixture.result?.lionsScore ?? 0)
  const [oppScore, setOpp] = useState(fixture.result?.opponentScore ?? 0)
  const [mvp, setMvp] = useState(fixture.result?.mvp ?? '')

  return (
    <Modal open onClose={onClose} title={`Result — Dublin Lions vs ${fixture.opponent}`} maxWidth="max-w-md">
      <p className="font-inter text-sm text-slate-400 mb-4">{fixture.date} · {fixture.time} · {fixture.venue}</p>
      <div className="grid grid-cols-2 gap-3">
        {formField('Dublin Lions', (
          <input type="number" min={0} value={lionsScore} onChange={(e) => setLions(Number(e.target.value))} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-base text-white text-center focus:outline-none focus:border-blue-500" />
        ))}
        {formField(fixture.opponent, (
          <input type="number" min={0} value={oppScore} onChange={(e) => setOpp(Number(e.target.value))} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-base text-white text-center focus:outline-none focus:border-blue-500" />
        ))}
      </div>
      <div className="mt-3">
        {formField('MVP (optional)', (
          <input type="text" value={mvp} onChange={(e) => setMvp(e.target.value)} placeholder="e.g. Kevin Anyanwu" className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500" />
        ))}
      </div>
      <div className="flex justify-between gap-2 pt-4">
        {fixture.result ? (
          <button onClick={onClear} className="text-red-400 hover:text-red-300 font-inter text-sm px-3 py-2 rounded-lg">Clear result</button>
        ) : <span />}
        <div className="flex gap-2">
          <button onClick={onClose} className="bg-white/5 border border-white/[0.06] text-slate-300 font-inter text-sm px-4 py-2 rounded-lg hover:bg-white/10">Cancel</button>
          <button onClick={() => onSave({ lionsScore, opponentScore: oppScore, mvp: mvp.trim() || undefined })} className="bg-amber-500 hover:bg-amber-400 text-deep-navy font-inter font-semibold text-sm px-4 py-2 rounded-lg">Save Result</button>
        </div>
      </div>
    </Modal>
  )
}

function ScheduleView({ data }: { data: ReturnType<typeof useLiveData> }) {
  const { sessions, teams, players, saveSessions } = data
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [attendanceSession, setAttendanceSession] = useState<string | null>(null)
  const [sessionForm, setSessionForm] = useState({
    title: '', teamId: '', date: '', time: '', location: 'Coláiste Bríde', type: 'Training' as Session['type'], opponent: ''
  })

  const handleCreateSession = () => {
    if (!sessionForm.title.trim() || !sessionForm.date || !sessionForm.time || !sessionForm.teamId) return
    const newSession: Session = {
      id: `s${Date.now()}`,
      title: sessionForm.title,
      teamId: sessionForm.teamId,
      date: sessionForm.date,
      time: sessionForm.time,
      location: sessionForm.location,
      type: sessionForm.type,
      opponent: sessionForm.opponent || undefined,
      attendance: [],
      notes: '',
    }
    const next = [...sessions, newSession]
    saveSessions(next)
    setShowCreateModal(false)
    setSessionForm({ title: '', teamId: '', date: '', time: '', location: 'Coláiste Bríde', type: 'Training', opponent: '' })
  }

  const handleDeleteSession = (id: string) => {
    if (!confirm('Delete this session?')) return
    const next = sessions.filter((s) => s.id !== id)
    saveSessions(next)
  }

  const toggleAttendance = (sessionId: string, playerId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (!session) return
    const nextAtt = session.attendance.includes(playerId)
      ? session.attendance.filter((pid) => pid !== playerId)
      : [...session.attendance, playerId]
    const next = sessions.map((s) => s.id === sessionId ? { ...s, attendance: nextAtt } : s)
    saveSessions(next)
  }

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [sessions])

  return (
    <div className="space-y-6">
      <PublicFixturesPanel />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Training Schedule</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
        >
          <Plus size={16} />
          Create Session
        </button>
      </div>

      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Date', 'Title', 'Team', 'Time', 'Location', 'Type', 'Attendance', 'Actions'].map((col) => (
                  <th key={col} className="px-6 py-4 font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {sortedSessions.map((s) => {
                const team = teams.find((t) => t.id === s.teamId)
                const totalPlayers = team?.players.length || 0
                return (
                  <tr key={s.id} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="px-6 py-4 font-inter text-sm text-slate-300">{s.date}</td>
                    <td className="px-6 py-4 font-inter font-medium text-sm text-white">{s.title}</td>
                    <td className="px-6 py-4">
                      {team ? <span className="text-xs font-inter text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{team.name}</span> : <span className="text-xs text-slate-500">Unknown</span>}
                    </td>
                    <td className="px-6 py-4 font-inter text-sm text-slate-300">{s.time}</td>
                    <td className="px-6 py-4 font-inter text-sm text-slate-300">{s.location}</td>
                    <td className="px-6 py-4"><StatusBadge status={s.type} /></td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setAttendanceSession(s.id)}
                        className="flex items-center gap-2"
                      >
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalPlayers > 0 ? (s.attendance.length / totalPlayers) * 100 : 0}%` }} />
                        </div>
                        <span className="font-inter text-xs text-slate-400">{s.attendance.length}/{totalPlayers}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete session"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {sortedSessions.length === 0 && (
          <div className="px-6 py-8 text-center">
            <Calendar size={32} className="text-slate-500 mx-auto mb-3" />
            <p className="font-inter text-sm text-slate-400">No sessions scheduled. Create one to get started.</p>
          </div>
        )}
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Session">
        <div className="space-y-4">
          {formField('Session Title', <input value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="Training Session" />)}
          <div className="grid grid-cols-2 gap-4">
            {formField('Team', (
              <select value={sessionForm.teamId} onChange={(e) => setSessionForm({ ...sessionForm, teamId: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400">
                <option value="">Select Team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            ))}
            {formField('Date', <input type="date" value={sessionForm.date} onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" />)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {formField('Time', <input type="time" value={sessionForm.time} onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" />)}
            {formField('Type', (
              <select value={sessionForm.type} onChange={(e) => setSessionForm({ ...sessionForm, type: e.target.value as Session['type'] })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400">
                <option>Training</option>
                <option>Match</option>
                <option>Event</option>
              </select>
            ))}
          </div>
          {sessionForm.type === 'Match' && (
            formField('Opponent', <input value={sessionForm.opponent} onChange={(e) => setSessionForm({ ...sessionForm, opponent: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="Neptune BC" />)
          )}
          {formField('Location', (
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={sessionForm.location} onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg pl-9 pr-4 py-2.5 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30" placeholder="Coláiste Bríde" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 font-inter text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleCreateSession} className="bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">Create Session</button>
        </div>
      </Modal>

      <Modal open={!!attendanceSession} onClose={() => setAttendanceSession(null)} title="Attendance" maxWidth="max-w-lg">
        {(() => {
          const session = sessions.find((s) => s.id === attendanceSession)
          const team = session ? teams.find((t) => t.id === session.teamId) : null
          const teamPlayers = team ? players.filter((p) => p.teamIds.includes(team.id)) : []
          return (
            <div className="space-y-3">
              {session && (
                <p className="font-inter text-sm text-slate-400">{session.date} at {session.time} — {session.location}</p>
              )}
              {teamPlayers.length === 0 ? (
                <p className="font-inter text-sm text-slate-400 text-center py-4">No players on this team</p>
              ) : (
                teamPlayers.map((p) => {
                  const attended = session?.attendance.includes(p.id) || false
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-[#0A1628] rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={p.name} size={28} />
                        <div>
                          <p className="font-inter text-sm text-white">{p.name}</p>
                          <p className="font-inter text-xs text-slate-400">#{p.jerseyNumber} — {p.position}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => attendanceSession && toggleAttendance(attendanceSession, p.id)}
                        className={`px-3 py-1 rounded font-inter text-xs font-medium transition-all ${
                          attended ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
                        }`}
                      >
                        {attended ? 'Present' : 'Absent'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

/* ─────────────────────── View: Reports ─────────────────────── */

function ReportsView({ data }: { data: ReturnType<typeof useLiveData> }) {
  const { payments, players, teams } = data

  const revenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const byMonth = new Map<string, number>()
    payments.filter((p) => p.status === 'succeeded').forEach((p) => {
      const month = months[new Date(p.date).getMonth()]
      byMonth.set(month, (byMonth.get(month) || 0) + p.amount)
    })
    return months.map((m) => ({ month: m, revenue: byMonth.get(m) || 0 }))
  }, [payments])

  const membershipGrowthData = useMemo(() => {
    const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']
    return months.map((m, i) => ({ month: m, members: Math.max(12, players.length - (5 - i) * 2) }))
  }, [players])

  const paymentStatusData = useMemo(() => [
    { name: 'Paid', value: players.filter((p) => p.status === 'Paid').length, color: '#22C55E' },
    { name: 'Pending', value: players.filter((p) => p.status === 'Pending').length, color: '#F59E0B' },
    { name: 'Overdue', value: players.filter((p) => p.status === 'Overdue').length, color: '#EF4444' },
  ].filter((d) => d.value > 0), [players])

  const ageGroupData = useMemo(() => {
    const counts = new Map<string, number>()
    players.forEach((p) => {
      p.teamIds.forEach((tid) => {
        const t = teams.find((tm) => tm.id === tid)
        if (t) {
          const agName = getAgeGroupName(t.ageGroupId)
          counts.set(agName, (counts.get(agName) || 0) + 1)
        }
      })
    })
    const colors = ['#3B82F6', '#FBBF24', '#22C55E', '#EF4444', '#A78BFA', '#F472B6', '#60A5FA']
    return Array.from(counts.entries()).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] })).filter((d) => d.value > 0)
  }, [players, teams])

  const teamPerformanceData = useMemo(() => {
    return teams.map((t) => ({
      name: t.name,
      wins: t.wins,
      losses: t.losses,
      pct: t.wins + t.losses > 0 ? Math.round((t.wins / (t.wins + t.losses)) * 100) : 0,
      pf: t.pointsFor,
      pa: t.pointsAgainst,
    }))
  }, [teams])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Reports</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-inter font-semibold text-lg text-white">Monthly Revenue Report</h3>
              <p className="font-inter text-sm text-slate-400">Last 12 months</p>
            </div>
            <button onClick={() => window.print()} className="no-print flex items-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-3 py-2 rounded transition-all duration-200">
              <Download size={14} />
              PDF
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `€${v}`} />
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#fff' }} />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member Growth */}
        <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-inter font-semibold text-lg text-white">Member Growth</h3>
              <p className="font-inter text-sm text-slate-400">Membership over time</p>
            </div>
            <button onClick={() => window.print()} className="no-print flex items-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-3 py-2 rounded transition-all duration-200">
              <Download size={14} />
              PDF
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={membershipGrowthData}>
              <defs>
                <linearGradient id="memberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#fff' }} />
              <Area type="monotone" dataKey="members" stroke="#3B82F6" fill="url(#memberGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status */}
        <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-inter font-semibold text-lg text-white">Payment Status Breakdown</h3>
              <p className="font-inter text-sm text-slate-400">Current snapshot</p>
            </div>
            <button onClick={() => window.print()} className="no-print flex items-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-3 py-2 rounded transition-all duration-200">
              <Download size={14} />
              PDF
            </button>
          </div>
          {paymentStatusData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center"><p className="font-inter text-sm text-slate-400">No data</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentStatusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}>
                  {paymentStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Age Group Breakdown */}
        <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-inter font-semibold text-lg text-white">Age Group Breakdown</h3>
              <p className="font-inter text-sm text-slate-400">Players by age group</p>
            </div>
            <button onClick={() => window.print()} className="no-print flex items-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-3 py-2 rounded transition-all duration-200">
              <Download size={14} />
              PDF
            </button>
          </div>
          {ageGroupData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center"><p className="font-inter text-sm text-slate-400">No data</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ageGroupData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}>
                  {ageGroupData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="font-inter font-semibold text-lg text-white">Team Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Team', 'Wins', 'Losses', 'Win %', 'Points For', 'Points Against', '+/-'].map((col) => (
                  <th key={col} className="px-6 py-4 font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {teamPerformanceData.map((t) => (
                <tr key={t.name} className="hover:bg-white/5 transition-colors duration-150">
                  <td className="px-6 py-4 font-inter font-medium text-sm text-white">{t.name}</td>
                  <td className="px-6 py-4 font-inter text-sm text-green-400">{t.wins}</td>
                  <td className="px-6 py-4 font-inter text-sm text-red-400">{t.losses}</td>
                  <td className="px-6 py-4 font-inter text-sm text-blue-400">{t.pct}%</td>
                  <td className="px-6 py-4 font-inter text-sm text-slate-300">{t.pf}</td>
                  <td className="px-6 py-4 font-inter text-sm text-slate-300">{t.pa}</td>
                  <td className="px-6 py-4 font-inter text-sm text-white">{t.pf - t.pa > 0 ? '+' : ''}{t.pf - t.pa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BI Registration */}
      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6">
        <h3 className="font-inter font-semibold text-lg text-white mb-4">Basketball Ireland Registration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0A1628] rounded-lg p-4 text-center">
            <p className="font-oswald font-bold text-2xl text-green-400">{players.filter((p) => p.registeredWithBI).length}</p>
            <p className="font-inter text-xs text-slate-400 uppercase tracking-wider mt-1">Registered</p>
          </div>
          <div className="bg-[#0A1628] rounded-lg p-4 text-center">
            <p className="font-oswald font-bold text-2xl text-red-400">{players.filter((p) => !p.registeredWithBI).length}</p>
            <p className="font-inter text-xs text-slate-400 uppercase tracking-wider mt-1">Not Registered</p>
          </div>
          <div className="bg-[#0A1628] rounded-lg p-4 text-center">
            <p className="font-oswald font-bold text-2xl text-blue-400">{Math.round((players.filter((p) => p.registeredWithBI).length / Math.max(1, players.length)) * 100)}%</p>
            <p className="font-inter text-xs text-slate-400 uppercase tracking-wider mt-1">Compliance Rate</p>
          </div>
        </div>
      </div>

      {/* Print-only report container */}
      <div className="print-only print-report">
        <h1>Dublin Lions BC — Reports</h1>
        <p className="meta">Generated: {new Date().toLocaleDateString()} | Total Players: {players.length} | Total Teams: {teams.length}</p>

        <h2>Monthly Revenue</h2>
        <table>
          <thead><tr><th>Month</th><th>Revenue (€)</th></tr></thead>
          <tbody>{revenueData.map((r) => <tr key={r.month}><td>{r.month}</td><td>€{r.revenue.toFixed(2)}</td></tr>)}</tbody>
        </table>

        <h2>Member Growth</h2>
        <table>
          <thead><tr><th>Month</th><th>Members</th></tr></thead>
          <tbody>{membershipGrowthData.map((r) => <tr key={r.month}><td>{r.month}</td><td>{r.members}</td></tr>)}</tbody>
        </table>

        <h2>Payment Status Breakdown</h2>
        <table>
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>{paymentStatusData.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.value}</td></tr>)}</tbody>
        </table>

        <h2>Age Group Breakdown</h2>
        <table>
          <thead><tr><th>Age Group</th><th>Players</th></tr></thead>
          <tbody>{ageGroupData.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.value}</td></tr>)}</tbody>
        </table>

        <h2>Team Performance</h2>
        <table>
          <thead><tr><th>Team</th><th>Wins</th><th>Losses</th><th>Win %</th><th>Points For</th><th>Points Against</th><th>+/-</th></tr></thead>
          <tbody>
            {teamPerformanceData.map((t) => (
              <tr key={t.name}>
                <td>{t.name}</td><td>{t.wins}</td><td>{t.losses}</td><td>{t.pct}%</td><td>{t.pf}</td><td>{t.pa}</td><td>{t.pf - t.pa > 0 ? '+' : ''}{t.pf - t.pa}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Basketball Ireland Registration</h2>
        <table>
          <thead><tr><th>Metric</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Registered</td><td>{players.filter((p) => p.registeredWithBI).length}</td></tr>
            <tr><td>Not Registered</td><td>{players.filter((p) => !p.registeredWithBI).length}</td></tr>
            <tr><td>Compliance Rate</td><td>{Math.round((players.filter((p) => p.registeredWithBI).length / Math.max(1, players.length)) * 100)}%</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────── View: Images ─────────────────────── */

const imageMeta: Record<string, { title: string; usedOn: string; defaultPath: string }> = {
  hero: { title: 'Homepage Hero Background', usedOn: 'Landing page hero section — full-screen banner', defaultPath: '/hero-team-celebration.jpg' },
  about: { title: 'About the Club', usedOn: 'About section on homepage — team huddle photo', defaultPath: '/about-team-huddle.jpg' },
  match1: { title: 'Gallery Photo 1', usedOn: 'Homepage gallery grid, position 1', defaultPath: '/match-action-1.jpg' },
  match2: { title: 'Gallery Photo 2', usedOn: 'Homepage gallery grid, position 2', defaultPath: '/match-action-2.jpg' },
  match3: { title: 'Gallery Photo 3', usedOn: 'Homepage gallery grid, position 3', defaultPath: '/match-action-3.jpg' },
  match4: { title: 'Gallery Photo 4', usedOn: 'Homepage gallery grid, position 4', defaultPath: '/match-action-4.jpg' },
  match5: { title: 'Gallery Photo 5', usedOn: 'Homepage gallery grid, position 5', defaultPath: '/match-action-5.jpg' },
  match6: { title: 'Gallery Photo 6', usedOn: 'Homepage gallery grid, position 6', defaultPath: '/match-action-6.jpg' },
  match7: { title: 'Gallery Photo 7', usedOn: 'Homepage gallery grid, position 7', defaultPath: '/match-action-7.jpg' },
  match8: { title: 'Gallery Photo 8', usedOn: 'Homepage gallery grid, position 8', defaultPath: '/match-action-8.jpg' },
  playerKevin: { title: "Men's Team: Kevin Anyanwu", usedOn: "Teams page / Homepage men's squad", defaultPath: '/player-kevin-anyanwu.jpg' },
  playerTiago: { title: "Men's Team: Tiago Pereira", usedOn: "Teams page / Homepage men's squad", defaultPath: '/player-tiago-pereira.jpg' },
  playerTara: { title: "Women's Team: Tara Nevin", usedOn: "Teams page / Homepage women's squad", defaultPath: '/player-tara-nevin.jpg' },
  playerEmily: { title: "Women's Team: Emily Smyth", usedOn: "Teams page / Homepage women's squad", defaultPath: '/player-emily-smyth.jpg' },
  coachRob: { title: "Head Coach: Rob White", usedOn: 'Teams page coach profile card', defaultPath: '/coach-rob-white.jpg' },
  venue: { title: 'Venue: Coláiste Bríde', usedOn: 'Contact page venue section', defaultPath: '/venue-colaiste-bride.jpg' },
  logo: { title: 'Club Logo', usedOn: 'Navbar, Footer, Login pages, Dashboard sidebar', defaultPath: '/logo-lions-emblem.png' },
}

function ImagesView() {
  const [images, setImages] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('dlbc_images')
    if (saved) return JSON.parse(saved)
    return Object.fromEntries(Object.entries(imageMeta).map(([k, v]) => [k, v.defaultPath]))
  })
  const [inputs, setInputs] = useState<Record<string, string>>(images)
  const [showBanner, setShowBanner] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const saveImages = useCallback((next: Record<string, string>) => {
    setImages(next)
    setInputs(next)
    localStorage.setItem('dlbc_images', JSON.stringify(next))
    setShowBanner(true)
    setTimeout(() => setShowBanner(false), 3000)
    window.dispatchEvent(new Event('dlbc-images-updated'))
  }, [])

  const handleFileUpload = useCallback((key: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed (JPG, PNG, GIF, WEBP)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be under 2MB')
      return
    }
    setUploading(key)
    setUploadError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      if (base64) {
        const next = { ...images, [key]: base64 }
        saveImages(next)
      }
      setUploading(null)
    }
    reader.onerror = () => {
      setUploadError('Failed to read image file')
      setUploading(null)
    }
    reader.readAsDataURL(file)
  }, [images, saveImages])

  const handleDrop = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(key, file)
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(key)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
  }, [])

  const handleUrlUpdate = useCallback((key: string) => {
    const url = inputs[key]?.trim()
    if (!url) return
    const next = { ...images, [key]: url }
    saveImages(next)
  }, [images, inputs, saveImages])

  const handleReset = useCallback((key: string) => {
    const next = { ...images, [key]: imageMeta[key].defaultPath }
    saveImages(next)
  }, [images, saveImages])

  const handleExport = useCallback(() => {
    const config = { club: 'Dublin Lions BC', exportedAt: new Date().toISOString(), images }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dublin-lions-images-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [images])

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string)
        if (config.images && typeof config.images === 'object') {
          const merged = Object.fromEntries(
            Object.keys(imageMeta).map((k) => [k, config.images[k] || imageMeta[k].defaultPath])
          )
          saveImages(merged)
        } else {
          setUploadError('Invalid config file format')
        }
      } catch {
        setUploadError('Failed to parse config file')
      }
    }
    reader.readAsText(file)
  }, [saveImages])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Image Manager</h2>
          <p className="font-inter text-sm text-slate-400 mt-1">
            Upload images from your computer or paste a URL. Changes apply instantly across the entire site.
          </p>
        </div>
        <div className="flex gap-3">
          <label className="cursor-pointer flex items-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-4 py-2 rounded transition-all duration-200">
            <Upload size={16} />
            Import Config
            <input type="file" accept=".json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImport(file); e.target.value = '' }} />
          </label>
          <button onClick={handleExport} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded transition-all duration-150">
            <Download size={16} />
            Export Config
          </button>
        </div>
      </div>

      {showBanner && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-400" />
          <p className="font-inter text-sm text-green-400">
            Images updated and synced across the site. All pages will display the new images immediately.
          </p>
        </div>
      )}
      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-400" />
          <p className="font-inter text-sm text-red-400">{uploadError}</p>
          <button onClick={() => setUploadError(null)} className="ml-auto text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Images', value: Object.keys(imageMeta).length },
          { label: 'Custom Uploads', value: Object.values(images).filter((v) => v.startsWith('data:')).length },
          { label: 'URL Images', value: Object.values(images).filter((v) => v.startsWith('http')).length },
          { label: 'Default Images', value: Object.values(images).filter((v) => v.startsWith('/')).length },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-4 text-center">
            <p className="font-oswald font-bold text-2xl text-blue-400">{stat.value}</p>
            <p className="font-inter text-xs text-slate-400 uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Object.entries(imageMeta).map(([key, meta]) => {
          const currentUrl = images[key] || meta.defaultPath
          const isDrag = dragOver === key
          const isUploading = uploading === key
          return (
            <div key={key} className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
              <div
                className={`aspect-video bg-[#0A1628] flex items-center justify-center overflow-hidden relative cursor-pointer transition-all duration-200 ${isDrag ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0A1628]' : ''}`}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, key)}
                onClick={() => fileInputRefs.current[key]?.click()}
              >
                <img src={currentUrl} alt={meta.title} className={`w-full h-full object-cover transition-opacity duration-200 ${isUploading ? 'opacity-40' : 'opacity-100'}`} onError={(e) => { (e.target as HTMLImageElement).src = '/logo-lions-emblem.png' }} />
                <div className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${isDrag ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                  <Upload size={28} className="text-white" />
                  <p className="font-inter text-sm text-white font-medium">Drop image here</p>
                  <p className="font-inter text-xs text-slate-300">or click to browse</p>
                </div>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 size={32} className="text-blue-400 animate-spin" />
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" ref={(el) => { fileInputRefs.current[key] = el }} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(key, file); e.target.value = '' }} />
              </div>
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div>
                  <p className="font-inter font-semibold text-sm text-white">{meta.title}</p>
                  <p className="font-inter text-xs text-slate-500 mt-0.5">{meta.usedOn}</p>
                </div>
                <div className="space-y-2">
                  <label className="font-inter text-xs text-slate-400 uppercase tracking-wider">Image URL</label>
                  <input
                    value={inputs[key] || ''}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-white/5 border border-[#334155] rounded-lg px-3 py-2 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                    placeholder="Paste image URL here..."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUrlUpdate(key)} className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-xs px-3 py-2 rounded transition-all duration-150">Update URL</button>
                    <button onClick={() => handleReset(key)} className="flex items-center justify-center gap-1 bg-transparent border border-white/30 text-slate-300 hover:text-white hover:bg-white/5 font-inter font-medium text-xs px-3 py-2 rounded transition-all duration-150" title="Reset to default">
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
                {currentUrl.startsWith('data:') && (
                  <div className="flex items-center gap-2 text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
                    <Image size={14} />
                    <span className="font-inter text-xs">Custom upload (base64)</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PRODUCT_CATS = ['Jerseys', 'Apparel', 'Equipment', 'Accessories', 'Kits']

/* ─── Store Manager View ─── */
function StoreManagerView() {
  const [products, setProductsState] = useState(getProducts)
  const [orders, setOrdersState] = useState(getOrders)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [tab, setTab] = useState<'products' | 'orders'>('products')

  useEffect(() => {
    const sync = () => { setProductsState(getProducts()); setOrdersState(getOrders()) }
    sync()
    const h = (e: StorageEvent) => { if (e.key === 'dlbc_products' || e.key === 'dlbc_orders') sync() }
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }, [])
  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))

  const saveProduct = (p: Product) => {
    const all = getProducts()
    const idx = all.findIndex((x) => x.id === p.id)
    if (idx >= 0) all[idx] = p; else all.unshift(p)
    setProducts(all); setShowAdd(false); setEditing(null)
    setProductsState(all)
  }
  const deleteProduct = (id: string) => { if (!confirm('Delete?')) return; const all = getProducts().filter((p) => p.id !== id); setProducts(all); setProductsState(all) }
  const toggleActive = (id: string) => { const all = getProducts().map((p) => p.id === id ? { ...p, active: !p.active } : p); setProducts(all); setProductsState(all) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Club Store</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded transition-all"><Plus size={16} /> Add Product</button>
      </div>
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('products')} className={`px-4 py-2 font-inter text-sm rounded-md transition-all ${tab === 'products' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>Products ({products.length})</button>
        <button onClick={() => setTab('orders')} className={`px-4 py-2 font-inter text-sm rounded-md transition-all ${tab === 'orders' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>Orders ({orders.length})</button>
      </div>
      {tab === 'products' && (
        <>
          <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-white/5 border border-[#334155] rounded-lg pl-10 pr-4 py-2.5 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500" /></div>
          <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.06]">{['Product','Category','Price','Stock','Status','Actions'].map((h) => <th key={h} className="px-4 py-3 font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#0A1628] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">{p.imageKey ? <img src={p.imageKey} alt={p.name} className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-600" />}</div><div><p className="font-inter font-medium text-sm text-white">{p.name}</p><p className="font-inter text-[10px] text-slate-500 line-clamp-1 max-w-[200px]">{p.description}</p></div></div></td>
                    <td className="px-4 py-3 font-inter text-xs text-slate-400">{p.category}</td>
                    <td className="px-4 py-3 font-inter text-sm text-white">€{p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 font-inter text-sm text-white">{p.stock}</td>
                    <td className="px-4 py-3"><button onClick={() => toggleActive(p.id)} className={`font-inter text-xs font-medium px-2 py-0.5 rounded ${p.active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{p.active ? 'Active' : 'Hidden'}</button></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => setEditing(p)} className="w-7 h-7 bg-blue-500/10 rounded-md flex items-center justify-center text-blue-400 hover:bg-blue-500/20"><Pencil size={14} /></button><button onClick={() => deleteProduct(p.id)} className="w-7 h-7 bg-red-500/10 rounded-md flex items-center justify-center text-red-400 hover:bg-red-500/20"><Trash2 size={14} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === 'orders' && (
        <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/[0.06]">{['Date','Customer','Items','Total','Status'].map((h) => <th key={h} className="px-4 py-3 font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/[0.06]">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-inter text-sm text-slate-300">{o.date}</td>
                  <td className="px-4 py-3"><p className="font-inter font-medium text-sm text-white">{o.customerName}</p><p className="font-inter text-xs text-slate-500">{o.customerEmail}</p></td>
                  <td className="px-4 py-3 font-inter text-sm text-slate-300">{o.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}</td>
                  <td className="px-4 py-3 font-inter font-semibold text-sm text-white">€{o.total.toFixed(2)}</td>
                  <td className="px-4 py-3"><span className={`font-inter text-xs font-medium px-2 py-0.5 rounded ${o.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : o.status === 'paid' ? 'bg-green-500/10 text-green-400' : o.status === 'shipped' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && <ProductForm onSave={saveProduct} onCancel={() => setShowAdd(false)} />}
      {editing && <ProductForm product={editing} onSave={saveProduct} onCancel={() => setEditing(null)} />}
    </div>
  )
}

function ProductForm({ product, onSave, onCancel }: { product?: Product | null; onSave: (p: Product) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Product>(product || { id: `prod-${Date.now()}`, name: '', description: '', price: 0, category: 'Jerseys', imageKey: '', stock: 0, active: true, createdAt: new Date().toISOString().split('T')[0] })
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => setForm({ ...form, imageKey: reader.result as string }); reader.readAsDataURL(file) }
  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-[#1E293B] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]"><h3 className="font-oswald font-bold text-xl text-white">{product ? 'Edit' : 'Add'} Product</h3><button onClick={onCancel} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white"><X size={18} /></button></div>
        <div className="p-5 space-y-4">
          <div><label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">Price (€)</label><input type="number" min={0} step={0.5} value={form.price || ''} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-4 py-2.5 font-inter text-sm text-white" /></div>
            <div><label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">Stock</label><input type="number" min={0} value={form.stock || ''} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-4 py-2.5 font-inter text-sm text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-4 py-2.5 font-inter text-sm text-white">{PRODUCT_CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">Status</label><select value={form.active ? 'active' : 'hidden'} onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-4 py-2.5 font-inter text-sm text-white"><option value="active">Active</option><option value="hidden">Hidden</option></select></div>
          </div>
          <div><label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-4 py-2.5 font-inter text-sm text-white resize-none" /></div>
          <div><label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">Photo</label><div className="flex items-center gap-4">{form.imageKey && <img src={form.imageKey} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/[0.06]" />}<label className="cursor-pointer flex items-center gap-2 bg-white/5 border border-[#334155] rounded-lg px-4 py-2 font-inter text-sm text-slate-300 hover:bg-white/10"><Camera size={14} /> Upload<input type="file" accept="image/*" className="hidden" onChange={handlePhoto} /></label></div></div>
        </div>
        <div className="p-5 border-t border-white/[0.06] flex gap-3"><button onClick={onCancel} className="flex-1 bg-white/5 border border-white/[0.06] text-slate-300 font-inter font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-white/10">Cancel</button><button onClick={() => onSave(form)} disabled={!form.name.trim()} className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-inter font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2"><Check size={16} /> Save</button></div>
      </div>
    </div>
  )
}

/* ─────────────────────── View: Chat ─────────────────────── */

function ChatView({ data }: { data: ReturnType<typeof useLiveData> }) {
  const { teams, players } = data
  const [activeTeamId, setActiveTeamId] = useState<string>(teams[0]?.id || '')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [room, setRoom] = useState<ChatRoomMembership>({ memberIds: [], adminIds: [] })
  const [showMembers, setShowMembers] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const refreshRoom = useCallback(() => {
    if (activeTeamId) setRoom(getChatRoom(activeTeamId))
  }, [activeTeamId])

  useEffect(() => { refreshRoom() }, [refreshRoom])

  useEffect(() => {
    const sync = () => setMessages(getChatMessages())
    sync()
    const h = (e: StorageEvent) => {
      if (e.key === 'dlbc_chat_messages') sync()
      if (e.key === 'dlbc_chat_members') refreshRoom()
    }
    window.addEventListener('storage', h)
    let bc: BroadcastChannel | null = null
    try { bc = new BroadcastChannel('dlbc_chat'); bc.onmessage = sync } catch {}
    return () => { window.removeEventListener('storage', h); bc?.close() }
  }, [refreshRoom])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, activeTeamId])

  const filtered = useMemo(() => {
    return messages.filter((m) => m.teamId === activeTeamId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [messages, activeTeamId])

  const handleSend = () => {
    if (!text.trim() || !activeTeamId) return
    addChatMessage(activeTeamId, 'Manager', 'manager', text.trim())
    setMessages(getChatMessages())
    setText('')
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Team Chat</h2>
      </div>

      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col md:flex-row h-[calc(100dvh-14rem)]">
        {/* Team Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/[0.06] bg-[#0F172A] flex flex-col">
          <div className="p-4 border-b border-white/[0.06]">
            <p className="font-inter font-semibold text-sm text-white">Teams</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setActiveTeamId(team.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg font-inter text-sm transition-all ${
                  activeTeamId === team.id
                    ? 'bg-blue-500/10 text-white border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <p className="font-medium truncate">{team.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{getTeamAgeDivisionLabel(team)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-inter font-semibold text-white truncate">
                {teams.find((t) => t.id === activeTeamId)?.name || 'Select a team'}
              </p>
              <p className="font-inter text-xs text-slate-500">
                {filtered.length} message{filtered.length !== 1 ? 's' : ''} · {room.memberIds.length} member{room.memberIds.length !== 1 ? 's' : ''}
              </p>
            </div>
            {activeTeamId && (
              <button
                onClick={() => setShowMembers(true)}
                className="shrink-0 inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white font-inter font-medium text-sm px-3 py-2 rounded-lg transition-colors"
              >
                <Users size={16} />
                Members
              </button>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare size={40} className="text-slate-700 mx-auto mb-3" />
                <p className="font-inter text-sm text-slate-400">No messages yet.</p>
                <p className="font-inter text-xs text-slate-500 mt-1">Send the first message to this team.</p>
              </div>
            ) : (
              filtered.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.senderRole === 'manager' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                    msg.senderRole === 'manager'
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-white/5 border border-white/[0.06]'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-inter font-medium text-xs text-white">{msg.senderName}</span>
                      <span className="font-inter text-[10px] text-slate-500">{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="font-inter text-sm text-slate-200 whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Type a message..."
                className="flex-1 bg-[#0A1628] border border-white/[0.06] rounded-lg px-4 py-2.5 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || !activeTeamId}
                className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-inter font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                <Send size={16} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMembers && activeTeamId && (
        <ChatMembersModal
          teamName={teams.find((t) => t.id === activeTeamId)?.name || 'Chat'}
          room={room}
          players={players}
          onClose={() => setShowMembers(false)}
          onAddClick={() => setShowAddMember(true)}
          onRemove={(pid) => { removeChatMember(activeTeamId, pid); refreshRoom() }}
          onToggleAdmin={(pid, makeAdmin) => { setChatAdmin(activeTeamId, pid, makeAdmin); refreshRoom() }}
        />
      )}

      {showAddMember && activeTeamId && (
        <AddChatMemberModal
          players={players}
          excludeIds={room.memberIds}
          onClose={() => setShowAddMember(false)}
          onAdd={(pid) => { addChatMember(activeTeamId, pid); refreshRoom() }}
        />
      )}
    </div>
  )
}

/* ─── Chat Members Modal ─── */
function ChatMembersModal({
  teamName,
  room,
  players,
  onClose,
  onAddClick,
  onRemove,
  onToggleAdmin,
}: {
  teamName: string
  room: ChatRoomMembership
  players: Player[]
  onClose: () => void
  onAddClick: () => void
  onRemove: (playerId: string) => void
  onToggleAdmin: (playerId: string, makeAdmin: boolean) => void
}) {
  const memberDetails = room.memberIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => !!p)

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h3 className="font-oswald font-bold text-xl text-white">{teamName}</h3>
            <p className="font-inter text-xs text-slate-400">{memberDetails.length} chat member{memberDetails.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="p-5 border-b border-white/[0.06]">
          <button
            onClick={onAddClick}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            <UserPlus size={16} /> Add Member
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {memberDetails.length === 0 ? (
            <p className="text-center font-inter text-sm text-slate-400 py-8">No members in this chat yet.</p>
          ) : (
            memberDetails.map((p) => {
              const isAdmin = room.adminIds.includes(p.id)
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03]">
                  <InitialsAvatar name={p.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="font-inter font-medium text-sm text-white truncate">{p.name}</p>
                    <p className="font-inter text-xs text-slate-500 truncate">{p.position} · #{p.jerseyNumber}</p>
                  </div>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded">
                      <ShieldCheck size={11} /> Admin
                    </span>
                  )}
                  <button
                    onClick={() => onToggleAdmin(p.id, !isAdmin)}
                    title={isAdmin ? 'Revoke admin' : 'Make admin'}
                    className="text-slate-400 hover:text-amber-400 transition-colors p-1.5"
                  >
                    <ShieldCheck size={16} />
                  </button>
                  <button
                    onClick={() => onRemove(p.id)}
                    title="Remove from chat"
                    className="text-slate-400 hover:text-red-400 transition-colors p-1.5"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Add Chat Member Modal ─── */
function AddChatMemberModal({
  players,
  excludeIds,
  onClose,
  onAdd,
}: {
  players: Player[]
  excludeIds: string[]
  onClose: () => void
  onAdd: (playerId: string) => void
}) {
  const [q, setQ] = useState('')
  const available = players
    .filter((p) => !excludeIds.includes(p.id))
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) || p.email.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1E293B] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h3 className="font-oswald font-bold text-lg text-white">Add Member to Chat</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-4 border-b border-white/[0.06]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {available.length === 0 ? (
            <p className="text-center font-inter text-sm text-slate-400 py-8">No players to add.</p>
          ) : (
            available.map((p) => (
              <button
                key={p.id}
                onClick={() => { onAdd(p.id); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] text-left"
              >
                <InitialsAvatar name={p.name} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="font-inter font-medium text-sm text-white truncate">{p.name}</p>
                  <p className="font-inter text-xs text-slate-500 truncate">{p.email}</p>
                </div>
                <UserPlus size={16} className="text-blue-400" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── View: Settings ─────────────────────── */

function SettingsView() {
  const [stripeLink, setStripeLink] = useState<string>(() => getStripePaymentLink())
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setStripePaymentLink(stripeLink.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const isValid = !stripeLink.trim() || /^https:\/\/(buy\.stripe\.com|.*\.stripe\.com)\//i.test(stripeLink.trim())
  const isTestMode = /\/test_/i.test(stripeLink.trim()) || /\btest\b/i.test(stripeLink.trim())

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white">Settings</h2>

      <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6 md:p-8">
        <div className="flex items-start gap-3 mb-5">
          <CreditCard size={22} className="text-blue-400 mt-1 shrink-0" />
          <div>
            <h3 className="font-inter font-semibold text-lg text-white">Stripe Payment Link</h3>
            <p className="font-inter text-sm text-slate-400 mt-1">
              Paste a Stripe Payment Link URL. All card payments (tickets, store orders, membership) will redirect to this hosted Stripe checkout. Create one at <a className="text-blue-400 hover:underline" href="https://dashboard.stripe.com/payment-links" target="_blank" rel="noopener noreferrer">dashboard.stripe.com/payment-links</a>.
            </p>
          </div>
        </div>

        <label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-2">Payment Link URL</label>
        <input
          type="url"
          value={stripeLink}
          onChange={(e) => setStripeLink(e.target.value)}
          placeholder="https://buy.stripe.com/test_..."
          className={`w-full bg-[#0A1628] border ${isValid ? 'border-white/[0.06]' : 'border-red-500/50'} rounded-lg px-4 py-2.5 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500`}
        />
        {!isValid && (
          <p className="font-inter text-xs text-red-400 mt-2">Must be a Stripe URL (e.g. https://buy.stripe.com/…).</p>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-inter font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            {saved ? <><Check size={16} /> Saved</> : 'Save'}
          </button>
          {stripeLink.trim() && isValid && (
            <a
              href={stripeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-inter text-slate-400 hover:text-white"
            >
              <ExternalLink size={14} /> Open link
            </a>
          )}
        </div>

        {isTestMode && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
            <span className="bg-amber-400 text-deep-navy text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">Test mode</span>
            <p className="font-inter text-xs text-blue-200/90">
              This is a Stripe test Payment Link — real money won't be charged. Use Stripe's test card <span className="font-mono">4242 4242 4242 4242</span> with any future expiry and any CVC.
            </p>
          </div>
        )}

        <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <p className="font-inter text-xs text-amber-200/90">
            <strong className="text-amber-200">Note:</strong> Stripe Payment Links accept a fixed amount per link. For per-item pricing (e.g. different ticket prices), create one Payment Link per amount and switch the URL above before publishing that fixture, or upgrade to a backend Checkout Session in the future.
          </p>
        </div>
      </div>

      <MembershipFeesPanel />
    </div>
  )
}

/* ─── Membership Fees (per age group) ─── */
function MembershipFeesPanel() {
  const [fees, setFeesState] = useState<MembershipFeeMap>(() => getMembershipFees())
  const [saved, setSaved] = useState(false)

  const labels: Array<[string, string]> = [
    ['u10', 'U10'], ['u12', 'U12'], ['u14', 'U14'], ['u16', 'U16'],
    ['u18', 'U18'], ['u20', 'U20'], ['senior', 'Senior'],
  ]

  const update = (key: string, value: number) => {
    setFeesState((prev) => ({ ...prev, [key]: value }))
  }

  const save = () => {
    setMembershipFees(fees)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="bg-[#1E293B] border border-white/[0.06] rounded-xl p-6 md:p-8">
      <div className="flex items-start gap-3 mb-5">
        <Euro size={22} className="text-blue-400 mt-1 shrink-0" />
        <div>
          <h3 className="font-inter font-semibold text-lg text-white">Monthly Membership Fees</h3>
          <p className="font-inter text-sm text-slate-400 mt-1">
            Set the monthly fee for each age group. Used when recording cash payments for members from the dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {labels.map(([key, label]) => (
          <div key={key}>
            <label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-inter text-sm">€</span>
              <input
                type="number"
                min={0}
                value={fees[key] ?? 0}
                onChange={(e) => update(key, Number(e.target.value))}
                className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg pl-7 pr-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        className="mt-5 inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
      >
        {saved ? <><Check size={16} /> Saved</> : 'Save Fees'}
      </button>
    </div>
  )
}

/* ─────────────────────── Access Denied ─────────────────────── */

function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="min-h-[100dvh] bg-[#0A1628] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <ShieldAlert size={64} className="text-red-400 mx-auto mb-6" />
        <h1 className="font-oswald font-bold text-3xl md:text-4xl text-white mb-4">
          Access Denied
        </h1>
        <p className="font-inter text-base text-slate-300 mb-2">
          Manager Login Required
        </p>
        <p className="font-inter text-sm text-slate-400 mb-8">
          You must be signed in as a club manager to view this page.
        </p>
        <button
          onClick={() => navigate('/manager/login')}
          className="bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-sm uppercase tracking-widest px-8 py-4 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
        >
          Go to Manager Login
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────── Main Dashboard ─────────────────────── */

export default function ManagerDashboard() {
  const [activeView, setActiveView] = useState('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')

  const data = useLiveData()

  // Derive notifications from real payments + overdue players so the bell
  // reflects actual state instead of placeholder copy.
  const derivedNotifications = useMemo(() => {
    const out: { id: string; text: string; detail: string; type: string }[] = []
    data.payments.slice(0, 3).forEach((p) => {
      if (p.status === 'succeeded') {
        out.push({ id: `pay-${p.id}`, text: 'Payment received', detail: `${p.playerName} — €${p.amount}`, type: 'success' })
      } else if (p.status === 'failed') {
        out.push({ id: `pay-${p.id}`, text: 'Payment failed', detail: `${p.playerName} — retry needed`, type: 'alert' })
      } else if (p.status === 'pending') {
        out.push({ id: `pay-${p.id}`, text: 'Payment pending', detail: `${p.playerName} — €${p.amount}`, type: 'warning' })
      }
    })
    const overdue = data.players.filter((p) => p.status === 'Overdue').slice(0, 2)
    overdue.forEach((p) => {
      out.push({ id: `over-${p.id}`, text: 'Membership overdue', detail: p.name, type: 'alert' })
    })
    return out
  }, [data.payments, data.players])

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const notifications = derivedNotifications.filter((n) => !dismissedIds.has(n.id))

  useEffect(() => {
    const userJson = localStorage.getItem('dlbc_user')
    if (userJson) {
      try {
        const user = JSON.parse(userJson)
        if (user.role === 'manager') {
          setIsAuthorized(true)
        }
      } catch {
        // invalid JSON
      }
    }
    setAuthChecked(true)
  }, [])

  if (!authChecked) {
    return (
      <div className="min-h-[100dvh] bg-[#0A1628] flex items-center justify-center">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!isAuthorized) {
    return <AccessDenied />
  }

  const viewTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    members: 'Members',
    payments: 'Payments',
    teams: 'Teams',
    schedule: 'Schedule',
    chat: 'Team Chat',
    reports: 'Reports',
    images: 'Image Manager',
    store: 'Club Store',
    settings: 'Settings',
  }

  return (
    <div className="min-h-[100dvh] bg-[#0F172A]">
      <Sidebar
        active={activeView}
        onNavigate={setActiveView}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <TopBar
        title={viewTitles[activeView] || 'Dashboard'}
        onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        notifications={notifications}
        onDismissNotification={(id) => setDismissedIds((prev) => new Set(prev).add(id))}
        onClearNotifications={() => setDismissedIds(new Set(derivedNotifications.map((n) => n.id)))}
        search={globalSearch}
        onSearch={setGlobalSearch}
        showSearch={activeView === 'members'}
        onJumpToMembers={() => setActiveView('members')}
        onQuickAction={(action) => {
          if (action === 'add-member') { setActiveView('members'); window.dispatchEvent(new Event('dlbc-open-add-member')) }
          else if (action === 'add-payment') setActiveView('payments')
          else if (action === 'send-message') setActiveView('chat')
          else if (action === 'add-fixture') setActiveView('schedule')
        }}
      />

      <main className="ml-0 md:ml-64 mt-16 min-h-[calc(100dvh-4rem)] p-6 md:p-8">
        {activeView === 'dashboard' && <DashboardView data={data} onNavigate={setActiveView} />}
        {activeView === 'members' && <MembersView data={data} initialSearch={globalSearch} />}
        {activeView === 'payments' && <PaymentsView data={data} />}
        {activeView === 'teams' && <TeamsView data={data} />}
        {activeView === 'schedule' && <ScheduleView data={data} />}
        {activeView === 'chat' && <ChatView data={data} />}
        {activeView === 'reports' && <ReportsView data={data} />}
        {activeView === 'images' && <ImagesView />}
        {activeView === 'store' && <StoreManagerView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}
