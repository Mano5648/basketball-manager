import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { CommandPalette, type CommandItem } from '@/components/dashboard/CommandPalette'
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
  ChevronRight,
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
  Flag,
  PlayCircle,
  StopCircle,
  History,
  Ticket,
  UserMinus,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
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
import { useSiteImage, LABEL_PREFIX } from '@/hooks/useSiteImages'
import { isSupabaseConfigured } from '@/lib/supabase'
import { fetchSiteImages, uploadSiteImage, saveSiteImageUrl, resetSiteImage } from '@/lib/siteImages'
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
  getMembershipFeeConfig,
  setMembershipFeeConfig,
  type MembershipFeeConfigMap,
  type AgeGroupFeeConfig,
  hasPaidThisMonth,
  recordCashPayment,
  getMonthlyFeeForPlayer,
  getOneTimeFeeForPlayer,
  type Product,
  type ChatMessage,
  type SeasonState,
  type SeasonHistoryEntry,
  type DefaultTicketPrice,
  type PendingTeamAssignment,
  getSeason,
  getSeasonHistory,
  getDefaultTicketPrice,
  getPendingSeniorPlayers,
  clearPendingSeniorPlayer,
  getPendingTeamAssignments,
  clearPendingTeamAssignment,
  removePlayerFromClub,
  clearMemberRevocation,
  getRegisteredChildren,
  getParentForChildRosterPlayer,
  isChildRosterPlayer,
  isRosterListedMember,
  reconcileClubRoster,
  reconcileClubRosterIfNeeded,
  pullRemoteAppState,
  whenClubDataReady,
  ensureClubRosterSynced,
  getRosterListedMembers,
  getUnassignedRosterMembers,
  assignPlayerToTeam,
  unassignPlayerFromTeam,
  getFeeAgeGroupIdForPlayer,
  syncChildrenRosterForParent,
  calcAge,
  startNewSeason,
  endSeason,
  restoreSeasonFromHistory,
  applyDefaultTicketPriceToAllFixtures,
  type StartSeasonResult,
} from '@/lib/clubData'
import { fetchPurchases, isPurchasesDbConfigured, type PurchaseRecord } from '@/lib/purchases'

/* ─────────────────────── Types ─────────────────────── */

type NavItem = {
  key: string
  label: string
  icon: LucideIcon
}

type NavSection = {
  section: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    section: 'Overview',
    items: [{ key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'Club',
    items: [
      { key: 'members', label: 'Members', icon: Users },
      { key: 'teams', label: 'Teams', icon: Trophy },
      { key: 'schedule', label: 'Schedule', icon: Calendar },
      { key: 'chat', label: 'Team Chat', icon: MessageCircle },
    ],
  },
  {
    section: 'Business',
    items: [
      { key: 'payments', label: 'Payments', icon: CreditCard },
      { key: 'store', label: 'Store', icon: ShoppingBag },
      { key: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    section: 'Content',
    items: [{ key: 'images', label: 'Images', icon: Image }],
  },
]

/* ─────────────────────── useLiveData Hook ─────────────────────── */

function useLiveData() {
  const [players, setPlayersState] = useState<Player[]>(getPlayers)
  const [teams, setTeamsState] = useState<Team[]>(getTeams)
  const [sessions, setSessionsState] = useState<Session[]>(getSessions)
  const [announcements, setAnnouncementsState] = useState<Announcement[]>(getAnnouncements)
  const [payments, setPaymentsState] = useState<Payment[]>(getPayments)
  const [ageGroups, setAgeGroupsState] = useState<AgeGroup[]>(getAgeGroups)
  const [season, setSeasonState] = useState<SeasonState>(getSeason)
  const [seasonHistory, setSeasonHistoryState] = useState<SeasonHistoryEntry[]>(getSeasonHistory)
  const [defaultTicketPrice, setDefaultTicketPriceState] = useState<DefaultTicketPrice>(getDefaultTicketPrice)
  const [pendingSeniorPlayerIds, setPendingSeniorPlayerIdsState] = useState<string[]>(getPendingSeniorPlayers)
  const [pendingTeamAssignments, setPendingTeamAssignmentsState] = useState<PendingTeamAssignment[]>(getPendingTeamAssignments)

  const refresh = useCallback(() => {
    setPlayersState(getPlayers())
    setTeamsState(getTeams())
    setSessionsState(getSessions())
    setAnnouncementsState(getAnnouncements())
    setPaymentsState(getPayments())
    setAgeGroupsState(getAgeGroups())
    setSeasonState(getSeason())
    setSeasonHistoryState(getSeasonHistory())
    setDefaultTicketPriceState(getDefaultTicketPrice())
    setPendingSeniorPlayerIdsState(getPendingSeniorPlayers())
    setPendingTeamAssignmentsState(getPendingTeamAssignments())
  }, [])

  useEffect(() => {
    let cancelled = false
    void whenClubDataReady().then(() => {
      if (cancelled) return
      reconcileClubRoster()
      refresh()
    })
    return () => { cancelled = true }
  }, [refresh])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (!e.key?.startsWith('dlbc_')) return
      if (e.key === 'dlbc_players') reconcileClubRosterIfNeeded()
      refresh()
    }
    window.addEventListener('storage', handler)
    const interval = setInterval(refresh, 3000)
    // Realtime can silently fail (e.g. publication not enabled), so also
    // re-pull the shared state periodically. This is how a manager keeps
    // seeing brand-new member/child sign-ups without a manual page reload.
    const remotePull = setInterval(() => {
      void pullRemoteAppState().then(() => refresh())
    }, 12000)
    void pullRemoteAppState().then(() => refresh())
    return () => {
      window.removeEventListener('storage', handler)
      clearInterval(interval)
      clearInterval(remotePull)
    }
  }, [refresh])

  const savePlayers = useCallback((v: Player[]) => { setPlayers(v); setPlayersState(v) }, [])
  const saveTeams = useCallback((v: Team[]) => { setTeams(v); setTeamsState(v) }, [])
  const saveSessions = useCallback((v: Session[]) => { setSessions(v); setSessionsState(v) }, [])
  const saveAnnouncements = useCallback((v: Announcement[]) => { setAnnouncements(v); setAnnouncementsState(v) }, [])
  const savePayments = useCallback((v: Payment[]) => { setPayments(v); setPaymentsState(v) }, [])
  const saveAgeGroups = useCallback((v: AgeGroup[]) => { setAgeGroups(v); setAgeGroupsState(v) }, [])

  const runStartNewSeason = useCallback((label: string): StartSeasonResult => {
    const result = startNewSeason(label)
    refresh()
    return result
  }, [refresh])

  const runEndSeason = useCallback((): SeasonHistoryEntry => {
    const entry = endSeason()
    refresh()
    return entry
  }, [refresh])

  const runApplyDefaultTicketPrice = useCallback((adultPrice: number, kidPrice: number) => {
    applyDefaultTicketPriceToAllFixtures(adultPrice, kidPrice)
    refresh()
  }, [refresh])

  const dismissPendingSenior = useCallback((playerId: string) => {
    clearPendingSeniorPlayer(playerId)
    refresh()
  }, [refresh])

  const dismissPendingTeamAssignment = useCallback((playerId: string) => {
    clearPendingTeamAssignment(playerId)
    refresh()
  }, [refresh])

  const runRestoreSeason = useCallback((historyIndex: number): SeasonHistoryEntry | null => {
    const entry = restoreSeasonFromHistory(historyIndex)
    refresh()
    return entry
  }, [refresh])

  return {
    players, teams, sessions, announcements, payments, ageGroups,
    season, seasonHistory, defaultTicketPrice, pendingSeniorPlayerIds, pendingTeamAssignments,
    refresh,
    savePlayers, saveTeams, saveSessions, saveAnnouncements, savePayments, saveAgeGroups,
    runStartNewSeason, runEndSeason, runApplyDefaultTicketPrice, dismissPendingSenior,
    dismissPendingTeamAssignment, runRestoreSeason,
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
    Pending: 'bg-warn-500/10 text-warn-400 border-warn-500/20',
    pending: 'bg-warn-500/10 text-warn-400 border-warn-500/20',
    Scheduled: 'bg-warn-500/10 text-warn-400 border-warn-500/20',
    Overdue: 'bg-red-500/10 text-red-400 border-red-500/20',
    Expired: 'bg-red-500/10 text-red-400 border-red-500/20',
    Failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    Draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter font-medium border capitalize ${styles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'Paid' || status === 'Active' || status === 'Completed' || status === 'Succeeded' || status === 'succeeded' || status === 'Sent'
          ? 'bg-green-400'
          : status === 'Pending' || status === 'pending' || status === 'Scheduled'
          ? 'bg-warn-400'
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
  accent = 'gold',
}: {
  label: string
  value: string
  icon: LucideIcon
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  accent?: 'gold' | 'blue' | 'green' | 'red'
}) {
  const accentClass = {
    gold: 'mgr-stat-block--gold',
    blue: 'mgr-stat-block--blue',
    green: 'mgr-stat-block--green',
    red: 'mgr-stat-block--red',
  }[accent]
  const iconTint = {
    gold: 'from-lions-500/25 to-lions-500/5 text-lions-300 ring-lions-400/20',
    blue: 'from-blue-500/25 to-blue-500/5 text-blue-300 ring-blue-400/20',
    green: 'from-emerald-500/25 to-emerald-500/5 text-emerald-300 ring-emerald-400/20',
    red: 'from-red-500/25 to-red-500/5 text-red-300 ring-red-400/20',
  }[accent]
  return (
    <div className={`mgr-stat-block group ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="font-oswald font-bold text-[clamp(1.85rem,3.2vw,2.65rem)] text-white mt-2 leading-none tracking-tight">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${iconTint} transition-transform duration-200 group-hover:scale-105`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/[0.05]">
        {changeType === 'positive' ? (
          <ArrowUpRight size={13} className="text-emerald-400 shrink-0" />
        ) : changeType === 'negative' ? (
          <ArrowDownRight size={13} className="text-red-400 shrink-0" />
        ) : null}
        <span className={`font-inter text-xs ${
          changeType === 'positive' ? 'text-emerald-400/90' : changeType === 'negative' ? 'text-red-400/90' : 'text-slate-500'
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`dash-card w-full ${maxWidth} p-6 space-y-4 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
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
    <div className="mt-3 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center gap-3">
      <InitialsAvatar name={name} size={34} />
      <div className="flex-1 min-w-0">
        <p className="font-inter font-medium text-sm text-white truncate">{name}</p>
        <p className="font-inter text-[10px] uppercase tracking-[0.14em] text-lions-400/75 truncate">{subtitle}</p>
      </div>
      <button
        onClick={onLogout}
        className="text-slate-500 hover:text-red-400 transition-colors duration-150 p-1"
        title="Logout"
        aria-label="Logout"
      >
        <LogOut size={17} />
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
  collapsed,
  onToggleCollapse,
}: {
  active: string
  onNavigate: (key: string) => void
  mobileOpen: boolean
  onCloseMobile: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const navigate = useNavigate()
  const logoUrl = useSiteImage('logo')
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  // Collapsed rail only applies on desktop; the mobile drawer is always full width.
  const isRail = collapsed

  const navButton = (item: NavItem, isActive: boolean) => {
    const Icon = item.icon
    return (
      <div key={item.key} className="dash-nav-item">
        <button
          onClick={() => { onNavigate(item.key); onCloseMobile() }}
          className={`mgr-nav-pill ${isActive ? 'mgr-nav-pill--active' : ''} ${
            isRail ? 'md:justify-center md:px-2.5' : ''
          }`}
        >
          <Icon size={18} className="mgr-nav-icon" />
          <span className={isRail ? 'md:hidden' : ''}>{item.label}</span>
        </button>
        {isRail && <span className="dash-nav-tip hidden md:block">{item.label}</span>}
      </div>
    )
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`fixed top-0 left-0 h-full dash-sidebar z-40 flex flex-col py-5 transition-[transform,width] duration-300 ease-out ${
          isRail ? 'w-64 md:w-[4.75rem] md:px-2.5 px-4' : 'w-64 px-3'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className={`flex items-center mb-4 ${isRail ? 'md:justify-center justify-between' : 'justify-between'}`}>
          <Link
            to="/"
            className={`mgr-sidebar-brand hover:opacity-95 transition-opacity group ${isRail ? 'md:p-2 md:justify-center' : 'flex-1 min-w-0'}`}
            title="Back to Dublin Lions home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lions-500/15 ring-1 ring-lions-400/25 shrink-0">
              <img src={logoUrl} alt="Dublin Lions" className="h-5 w-auto brightness-0 invert" />
            </div>
            <div className={`min-w-0 ${isRail ? 'md:hidden' : ''}`}>
              <p className="font-oswald font-bold text-base text-white tracking-wide leading-none">Dublin Lions</p>
              <p className="font-inter text-[9px] uppercase tracking-[0.22em] text-lions-400/80 mt-1">Club Command</p>
            </div>
          </Link>
          <button
            onClick={onToggleCollapse}
            className={`dash-rail-toggle hidden md:flex ml-2 shrink-0 ${isRail ? 'md:hidden' : ''}`}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {isRail && (
          <button
            onClick={onToggleCollapse}
            className="dash-rail-toggle hidden md:flex mx-auto mb-4"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}

        <Link
          to="/"
          className={`flex items-center gap-2 mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-slate-400 hover:text-white font-inter text-xs transition-all ${
            isRail ? 'md:justify-center md:px-0 md:py-2.5 px-3 py-2' : 'px-3 py-2'
          }`}
        >
          <Home size={14} className="shrink-0" />
          <span className={isRail ? 'md:hidden' : ''}>Public site</span>
        </Link>

        <nav className="flex-1 space-y-4 overflow-y-auto scroll-slim -mr-1 pr-1">
          {navSections.map((group) => (
            <div key={group.section} className="space-y-0.5">
              <p className={`nav-section-label px-3 mb-2 ${isRail ? 'md:hidden' : ''}`}>{group.section}</p>
              {group.items.map((item) => navButton(item, active === item.key))}
            </div>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="border-t border-white/[0.06] my-4" />
          {navButton({ key: 'settings', label: 'Settings', icon: Settings }, active === 'settings')}
          <div className={isRail ? 'md:hidden mt-1' : 'mt-1'}>
            <SidebarUserCard onLogout={handleLogout} />
          </div>
          {isRail && (
            <button
              onClick={handleLogout}
              className="dash-rail-toggle hidden md:flex mx-auto mt-3"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
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
  onQuickAction,
  sidebarCollapsed,
}: {
  title: string
  onMenuToggle: () => void
  notifications: { id: string; text: string; detail: string; type: string }[]
  onDismissNotification: (id: string) => void
  onClearNotifications: () => void
  onQuickAction: (action: 'add-payment' | 'send-message' | 'add-fixture') => void
  sidebarCollapsed: boolean
}) {
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className={`fixed top-0 left-0 ${sidebarCollapsed ? 'md:left-[4.75rem]' : 'md:left-64'} right-0 dash-topbar z-30 flex items-center justify-between gap-4 px-4 md:px-6 transition-[left] duration-300`} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-slate-400 hover:text-white p-1.5 transition-colors duration-150"
          aria-label="Open menu"
        >
          <LayoutDashboard size={20} />
        </button>
        <h2 className="font-oswald font-bold text-lg md:text-xl text-white tracking-tight leading-tight truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <button
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
            className="mgr-topbar-btn mgr-topbar-btn--primary"
            aria-label="Quick actions"
          >
            <Plus size={18} />
          </button>
          {showQuickActions && (
            <div className="absolute right-0 top-full mt-2 w-56 dash-card shadow-xl z-50 py-2">
              {([
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

/* ─── Manager home: real-time ops console (ui-ux-pro-max pattern) ─── */
function ClubOpsConsole({
  managerFirstName,
  today,
  seasonLabel,
  overdueCount,
  unpaidCount,
  activeMembers,
  totalTeams,
  nextSession,
  onNavigate,
}: {
  managerFirstName: string
  today: string
  seasonLabel: string
  overdueCount: number
  unpaidCount: number
  activeMembers: number
  totalTeams: number
  nextSession?: { title: string; date: string; time: string; location: string }
  onNavigate: (view: string) => void
}) {
  const priorities = [
    {
      id: 'overdue',
      label: 'Overdue payments',
      value: String(overdueCount),
      hint: overdueCount === 0 ? 'All settled' : 'Needs follow-up today',
      urgent: overdueCount > 0,
      onClick: () => onNavigate('payments'),
    },
    {
      id: 'unpaid',
      label: 'Unpaid this month',
      value: String(unpaidCount),
      hint: unpaidCount === 0 ? 'Everyone paid' : 'Record cash or chase fees',
      urgent: unpaidCount > 0,
      onClick: () => onNavigate('members'),
    },
    {
      id: 'next',
      label: 'Next on court',
      value: nextSession ? nextSession.title : 'Nothing scheduled',
      hint: nextSession ? `${nextSession.date} · ${nextSession.time}` : 'Add a session in Schedule',
      urgent: false,
      onClick: () => onNavigate('schedule'),
    },
  ]

  return (
    <div className="mgr-ops-hero p-6 md:p-8">
      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.24em] text-lions-400/90">Live operations</p>
          <h1 className="font-oswald font-bold text-[clamp(2rem,3.5vw,2.85rem)] text-white mt-2 leading-[0.95] tracking-tight">
            Welcome back{managerFirstName ? `, ${managerFirstName}` : ''}
          </h1>
          <p className="font-inter text-sm text-slate-400 mt-3 max-w-xl leading-relaxed">
            {activeMembers} active members · {totalTeams} teams · fees, roster, and fixtures in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 font-inter text-xs text-emerald-300">
            <span className="live-dot" aria-hidden="true" />
            Season {seasonLabel}
          </span>
          <span className="rounded-full bg-white/[0.04] border border-white/10 px-3 py-1.5 font-inter text-xs text-slate-300">
            {today}
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
        {priorities.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`ops-priority-tile ${item.urgent ? 'ops-priority-tile-urgent' : ''}`}
          >
            <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <p className={`font-oswald font-bold mt-2 leading-tight ${item.id === 'next' ? 'text-base md:text-lg font-inter font-semibold text-white' : 'text-3xl text-white'}`}>
              {item.value}
            </p>
            <p className="font-inter text-xs text-slate-500 mt-2 flex items-center justify-between gap-2">
              <span>{item.hint}</span>
              <ChevronRight size={14} className="shrink-0 text-slate-600 group-hover:text-lions-400" />
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

function DashboardView({ data, onNavigate }: { data: ReturnType<typeof useLiveData>; onNavigate: (view: string) => void }) {
  const { sessions, announcements, payments, players, teams, ageGroups } = data
  const stats = computeClubStats()
  const unpaidCount = players.filter((p) => !hasPaidThisMonth(p.id)).length

  // ── Live-derived stat captions (no hardcoded figures) ──
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`
  const activeMembers = getRosterListedMembers().filter((p) => (p.status || '').toLowerCase() === 'paid').length
  const paymentsThisMonth = payments.filter((p) => {
    const d = new Date(p.date)
    return !isNaN(d.getTime()) && `${d.getFullYear()}-${d.getMonth()}` === thisMonthKey && p.status === 'succeeded'
  }).length
  const teamsCaption = ageGroups.length > 0
    ? `${ageGroups.length} age group${ageGroups.length !== 1 ? 's' : ''}`
    : `${teams.length} registered`
  const membersCaption = `${activeMembers} active now`
  const revenueCaption = paymentsThisMonth > 0
    ? `${paymentsThisMonth} payment${paymentsThisMonth !== 1 ? 's' : ''} this month`
    : 'No payments yet this month'
  const overdueCaption = stats.overduePlayers === 0 ? 'All settled up' : 'Needs follow-up'

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

  const managerFirstName = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('dlbc_user') || 'null')
      return u?.name ? u.name.split(' ')[0] : ''
    } catch {
      return ''
    }
  })()

  const nextSession = upcomingSessions[0]

  return (
    <div className="space-y-6">
      <ClubOpsConsole
        managerFirstName={managerFirstName}
        today={today}
        seasonLabel={data.season?.label || '2025/26'}
        overdueCount={stats.overduePlayers}
        unpaidCount={unpaidCount}
        activeMembers={activeMembers}
        totalTeams={stats.totalTeams}
        nextSession={nextSession ? { title: nextSession.title, date: nextSession.date, time: nextSession.time, location: nextSession.location } : undefined}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 dash-stagger">
        <StatCard label="Total Members" value={String(stats.totalPlayers)} icon={Users} change={membersCaption} changeType="positive" accent="blue" />
        <StatCard label="Active Teams" value={String(stats.totalTeams)} icon={Trophy} change={teamsCaption} changeType="neutral" accent="gold" />
        <StatCard label="Revenue (Monthly)" value={`€${stats.monthlyRevenue.toLocaleString()}`} icon={Euro} change={revenueCaption} changeType={paymentsThisMonth > 0 ? 'positive' : 'neutral'} accent="green" />
        <StatCard label="Overdue Payments" value={String(stats.overduePlayers)} icon={AlertCircle} change={overdueCaption} changeType={stats.overduePlayers === 0 ? 'positive' : 'negative'} accent={stats.overduePlayers === 0 ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 mgr-panel">
          <div className="mgr-panel-header">
            <h3 className="mgr-panel-title">Recent activity</h3>
          </div>
          <div className="mgr-activity-timeline">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <StickyNote size={28} className="text-slate-600 mx-auto mb-3" />
                <p className="font-inter text-sm text-slate-500">No recent activity yet</p>
              </div>
            ) : (
              recentActivity.map((activity) => {
                const { icon: ActIcon, color } = activityIcons[activity.type] || activityIcons.message
                return (
                  <div key={activity.id} className="mgr-activity-row">
                    <div className={`relative z-[1] w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <ActIcon size={15} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-inter font-medium text-sm text-white">{activity.text}</p>
                      <p className="font-inter text-xs text-slate-500 mt-0.5">{activity.detail}</p>
                    </div>
                    <span className="font-inter text-[11px] text-slate-600 shrink-0 pt-1">{activity.time}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="mgr-panel p-5">
            <h3 className="mgr-panel-title mb-4">Quick actions</h3>
            <div className="mgr-quick-grid">
              {[
                { label: 'Record payment', icon: Banknote, onClick: () => onNavigate('payments') },
                { label: 'Announcement', icon: Send, onClick: () => onNavigate('chat') },
                { label: 'Report', icon: FileText, onClick: () => onNavigate('reports') },
              ].map((action) => (
                <button key={action.label} type="button" onClick={action.onClick} className="mgr-quick-tile">
                  <span className="mgr-quick-tile-icon"><action.icon size={18} /></span>
                  <span className="font-inter font-medium text-sm text-slate-200">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mgr-panel">
            <div className="mgr-panel-header">
              <h3 className="mgr-panel-title">Upcoming sessions</h3>
            </div>
            <div className="p-5 space-y-4">
              {upcomingSessions.length === 0 ? (
                <p className="font-inter text-sm text-slate-500 text-center py-4">Nothing on the schedule</p>
              ) : (
                upcomingSessions.map((s, i) => (
                  <div key={s.id} className={`${i > 0 ? 'border-t border-white/[0.06] pt-4' : ''}`}>
                    <p className="font-inter text-[10px] uppercase tracking-[0.16em] text-lions-400/80">{s.date}</p>
                    <p className="font-oswald font-bold text-base text-white mt-1">{s.title}</p>
                    <p className="font-inter text-xs text-slate-500 mt-1">{s.location} · {s.time}</p>
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

/* ─── Dashboard widget: season lifecycle + ticket pricing control center ─── */
function SeasonControlCenter({ data }: { data: ReturnType<typeof useLiveData> }) {
  const {
    season, seasonHistory, defaultTicketPrice, pendingSeniorPlayerIds, pendingTeamAssignments, players, teams,
    runStartNewSeason, runEndSeason, runApplyDefaultTicketPrice, dismissPendingSenior,
    dismissPendingTeamAssignment, runRestoreSeason,
    savePlayers, saveTeams,
  } = data

  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [endConfirmText, setEndConfirmText] = useState('')
  const [result, setResult] = useState<StartSeasonResult | null>(null)
  const [adultPrice, setAdultPrice] = useState(String(defaultTicketPrice.adultPrice))
  const [kidPrice, setKidPrice] = useState(String(defaultTicketPrice.kidPrice))
  const [priceSaved, setPriceSaved] = useState(false)
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null)

  useEffect(() => {
    setAdultPrice(String(defaultTicketPrice.adultPrice))
    setKidPrice(String(defaultTicketPrice.kidPrice))
  }, [defaultTicketPrice.adultPrice, defaultTicketPrice.kidPrice])

  const pendingSeniorPlayers = useMemo(
    () => pendingSeniorPlayerIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[],
    [pendingSeniorPlayerIds, players]
  )

  const pendingTeamPlayers = useMemo(
    () => pendingTeamAssignments.map((pt) => ({ pt, player: players.find((p) => p.id === pt.playerId) })).filter((x) => x.player) as { pt: PendingTeamAssignment; player: Player }[],
    [pendingTeamAssignments, players]
  )

  const seniorTeams = useMemo(() => teams.filter((t) => t.ageGroupId === 'senior'), [teams])

  const handleStart = () => {
    const label = newLabel.trim()
    if (!label) return
    const r = runStartNewSeason(label)
    setResult(r)
    setNewLabel('')
    setStartOpen(false)
  }

  const handleEnd = () => {
    if (endConfirmText.trim().toLowerCase() !== season.label.trim().toLowerCase()) return
    runEndSeason()
    setEndOpen(false)
    setEndConfirmText('')
  }

  const handleApplyPrice = () => {
    const a = parseFloat(adultPrice)
    const k = parseFloat(kidPrice)
    if (isNaN(a) || isNaN(k)) return
    runApplyDefaultTicketPrice(a, k)
    setPriceSaved(true)
    setTimeout(() => setPriceSaved(false), 2500)
  }

  const assignToSenior = (playerId: string, teamId: string) => {
    const updatedPlayers = players.map((p) => (p.id === playerId ? { ...p, teamIds: [...p.teamIds, teamId] } : p))
    const updatedTeams = teams.map((t) => (t.id === teamId ? { ...t, players: [...t.players, playerId] } : t))
    savePlayers(updatedPlayers)
    saveTeams(updatedTeams)
    dismissPendingSenior(playerId)
  }

  const removeFromClub = (playerId: string, dismiss: (id: string) => void) => {
    if (!window.confirm('Remove this player from the club? This cannot be undone.')) return
    removePlayerFromClub(playerId)
    dismiss(playerId)
  }

  const assignToNewTeam = (playerId: string, teamId: string) => {
    const player = players.find((p) => p.id === playerId)
    if (!player) return
    // Detach from any current non-Senior team (that's the bracket being promoted out of).
    const oldIds = player.teamIds.filter((tid) => teams.find((t) => t.id === tid)?.ageGroupId !== 'senior')
    const updatedPlayers = players.map((p) =>
      p.id === playerId ? { ...p, teamIds: [...p.teamIds.filter((tid) => !oldIds.includes(tid)), teamId] } : p
    )
    const updatedTeams = teams.map((t) => {
      if (t.id === teamId) return { ...t, players: [...t.players, playerId] }
      if (oldIds.includes(t.id)) return { ...t, players: t.players.filter((pid) => pid !== playerId) }
      return t
    })
    savePlayers(updatedPlayers)
    saveTeams(updatedTeams)
    dismissPendingTeamAssignment(playerId)
  }

  const handleRestore = (index: number, label: string) => {
    if (!window.confirm(`Restore season "${label}"? Your current in-progress season will be archived to history so nothing is lost.`)) return
    runRestoreSeason(index)
    setHistoryOpen(false)
    setRestoredNotice(label)
    setTimeout(() => setRestoredNotice(null), 4000)
  }

  return (
    <div className="dash-card p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/5 ring-1 ring-amber-400/20 text-amber-400">
            <Flag size={20} />
          </span>
          <div>
            <p className="font-inter text-[11px] uppercase tracking-[0.18em] text-slate-400">Season</p>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="font-oswald font-bold text-xl text-white">{season.label}</h3>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-inter font-medium border ${season.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${season.status === 'active' ? 'bg-green-400' : 'bg-slate-400'}`} />
                {season.status === 'active' ? 'Active' : 'Ended'}
              </span>
            </div>
            <p className="font-inter text-xs text-slate-400 mt-0.5">
              Started {new Date(season.startedAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
              {season.endedAt ? ` · Ended ${new Date(season.endedAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {seasonHistory.length > 0 && (
            <button onClick={() => setHistoryOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-inter font-medium bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/[0.08] text-slate-200 transition-colors">
              <History size={15} /> History
            </button>
          )}
          {season.status === 'active' && (
            <button onClick={() => setEndOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-inter font-medium bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/20 text-red-400 transition-colors">
              <StopCircle size={15} /> End Season
            </button>
          )}
          <button onClick={() => setStartOpen(true)} className="flex items-center gap-2 btn-gold font-inter text-sm px-4 py-2 rounded-lg hover:scale-[1.03] transition-all duration-150">
            <PlayCircle size={15} /> Start New Season
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl bg-green-500/10 ring-1 ring-green-500/20 px-4 py-3 flex items-start gap-3">
          <CheckCircle size={18} className="text-green-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-inter text-sm text-green-300 font-medium">Season &quot;{result.label}&quot; started</p>
            <p className="font-inter text-xs text-slate-300 mt-0.5">
              {result.promotedCount} player{result.promotedCount !== 1 ? 's' : ''} promoted
              {result.needsTeamAssignment.length > 0 ? ` · ${result.needsTeamAssignment.length} player${result.needsTeamAssignment.length !== 1 ? 's' : ''} waiting on a new team` : ''}
              {result.needsSeniorAssignment.length > 0 ? ` · ${result.needsSeniorAssignment.length} player${result.needsSeniorAssignment.length !== 1 ? 's' : ''} need senior assignment` : ''}
            </p>
          </div>
          <button onClick={() => setResult(null)} className="text-slate-400 hover:text-white shrink-0"><X size={16} /></button>
        </div>
      )}

      {pendingSeniorPlayers.length > 0 && (
        <div className="rounded-xl bg-amber-500/[0.06] ring-1 ring-amber-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={16} className="text-amber-400" />
            <h4 className="font-inter font-semibold text-sm text-white">Needs Senior Assignment</h4>
            <span className="text-xs text-slate-400 font-inter">({pendingSeniorPlayers.length})</span>
          </div>
          <div className="space-y-2">
            {pendingSeniorPlayers.map((p) => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white/[0.03] rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <InitialsAvatar name={p.name} size={28} />
                  <span className="font-inter text-sm text-white truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {seniorTeams.length > 0 && (
                    <select
                      onChange={(e) => { if (e.target.value) assignToSenior(p.id, e.target.value) }}
                      defaultValue=""
                      className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-inter text-slate-200 focus:outline-none"
                    >
                      <option value="" disabled>Assign to team…</option>
                      {seniorTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                  <button
                    onClick={() => dismissPendingSenior(p.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-inter font-medium bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/[0.08] text-slate-300 transition-colors"
                  >
                    <UserCheck size={13} /> Keep as-is
                  </button>
                  <button
                    onClick={() => removeFromClub(p.id, dismissPendingSenior)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-inter font-medium bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/20 text-red-400 transition-colors"
                  >
                    <UserMinus size={13} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingTeamPlayers.length > 0 && (
        <div className="rounded-xl bg-blue-500/[0.06] ring-1 ring-blue-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={16} className="text-blue-400" />
            <h4 className="font-inter font-semibold text-sm text-white">Waiting on a New Team</h4>
            <span className="text-xs text-slate-400 font-inter">({pendingTeamPlayers.length})</span>
          </div>
          <p className="font-inter text-xs text-slate-400 mb-3">
            These players were promoted into a bracket that has no team yet. Create the team from the Teams tab (using the {' '}
            {Array.from(new Set(pendingTeamPlayers.map((x) => x.pt.ageGroupName))).join(', ')} age group), then assign them below.
          </p>
          <div className="space-y-2">
            {pendingTeamPlayers.map(({ pt, player: p }) => {
              const matchingTeams = teams.filter((t) => t.ageGroupId === pt.ageGroupId && t.gender === pt.gender)
              return (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white/[0.03] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <InitialsAvatar name={p.name} size={28} />
                    <div className="min-w-0">
                      <span className="font-inter text-sm text-white truncate block">{p.name}</span>
                      <span className="font-inter text-[11px] text-blue-300/80">→ {pt.ageGroupName} {pt.gender}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {matchingTeams.length > 0 ? (
                      <select
                        onChange={(e) => { if (e.target.value) assignToNewTeam(p.id, e.target.value) }}
                        defaultValue=""
                        className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-inter text-slate-200 focus:outline-none"
                      >
                        <option value="" disabled>Assign to team…</option>
                        {matchingTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    ) : (
                      <span className="font-inter text-[11px] text-slate-500 italic px-1">No team yet — create one on the Teams tab</span>
                    )}
                    <button
                      onClick={() => dismissPendingTeamAssignment(p.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-inter font-medium bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/[0.08] text-slate-300 transition-colors"
                    >
                      <UserCheck size={13} /> Keep as-is
                    </button>
                    <button
                      onClick={() => removeFromClub(p.id, dismissPendingTeamAssignment)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-inter font-medium bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/20 text-red-400 transition-colors"
                    >
                      <UserMinus size={13} /> Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {restoredNotice && (
        <div className="rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 px-4 py-3 flex items-center gap-3">
          <History size={18} className="text-blue-400 shrink-0" />
          <p className="font-inter text-sm text-blue-300 flex-1">Season &quot;{restoredNotice}&quot; restored and is now active.</p>
          <button onClick={() => setRestoredNotice(null)} className="text-slate-400 hover:text-white shrink-0"><X size={16} /></button>
        </div>
      )}

      <div className="border-t border-white/[0.06] pt-5">
        <div className="flex items-center gap-2 mb-3">
          <Ticket size={16} className="text-amber-400" />
          <h4 className="font-inter font-semibold text-sm text-white">Default Ticket Pricing</h4>
        </div>
        <p className="font-inter text-xs text-slate-400 mb-3">
          Set one flat price and apply it to every fixture at once. You can still override the price on individual fixtures afterwards from the Schedule tab.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          {formField('Adult Price (€)', (
            <input
              type="number" min="0" step="0.5" value={adultPrice} onChange={(e) => setAdultPrice(e.target.value)}
              className="w-full sm:w-32 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:ring-1 focus:ring-amber-400/50"
            />
          ))}
          {formField('Kid Price (€)', (
            <input
              type="number" min="0" step="0.5" value={kidPrice} onChange={(e) => setKidPrice(e.target.value)}
              className="w-full sm:w-32 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:ring-1 focus:ring-amber-400/50"
            />
          ))}
          <button onClick={handleApplyPrice} className="flex items-center gap-2 btn-gold font-inter text-sm px-4 py-2 rounded-lg hover:scale-[1.03] transition-all duration-150">
            Apply to All Fixtures
          </button>
          {priceSaved && <span className="font-inter text-xs text-green-400 flex items-center gap-1"><Check size={14} /> Applied</span>}
        </div>
      </div>

      <Modal open={startOpen} onClose={() => setStartOpen(false)} title="Start New Season">
        <div className="space-y-4">
          <p className="font-inter text-sm text-slate-300">
            This resets every team&apos;s win/loss record and promotes players into their real age bracket. New age groups are created automatically, but you&apos;ll need to create the team for any brand-new bracket yourself — those players are queued below until you do. Anyone aging out of U20 is also left for you to place manually.
          </p>
          {formField('New Season Label', (
            <input
              type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. 2026/27"
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:ring-1 focus:ring-amber-400/50"
            />
          ))}
          <div className="flex justify-end gap-2">
            <button onClick={() => setStartOpen(false)} className="px-4 py-2 rounded-lg text-sm font-inter font-medium bg-white/[0.05] hover:bg-white/[0.08] text-slate-300">Cancel</button>
            <button onClick={handleStart} disabled={!newLabel.trim()} className="flex items-center gap-2 btn-gold font-inter text-sm px-4 py-2 rounded-lg disabled:opacity-40 disabled:pointer-events-none">
              <PlayCircle size={15} /> Start Season
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={endOpen} onClose={() => { setEndOpen(false); setEndConfirmText('') }} title="End Current Season">
        <div className="space-y-4">
          <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/20 px-3 py-2.5 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="font-inter text-sm text-red-200">
              This archives the current standings and fixtures to Season History and clears the fixture list. It can be reversed later from Season History, but proceed carefully.
            </p>
          </div>
          {formField(`Type "${season.label}" to confirm`, (
            <input
              type="text" value={endConfirmText} onChange={(e) => setEndConfirmText(e.target.value)} placeholder={season.label}
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm font-inter text-white focus:outline-none focus:ring-1 focus:ring-red-400/50"
            />
          ))}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setEndOpen(false); setEndConfirmText('') }} className="px-4 py-2 rounded-lg text-sm font-inter font-medium bg-white/[0.05] hover:bg-white/[0.08] text-slate-300">Cancel</button>
            <button
              onClick={handleEnd}
              disabled={endConfirmText.trim().toLowerCase() !== season.label.trim().toLowerCase()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-inter font-medium bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/20 text-red-400 disabled:opacity-40 disabled:pointer-events-none"
            >
              <StopCircle size={15} /> End Season
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Season History" maxWidth="max-w-2xl">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto scroll-slim pr-1">
          {seasonHistory.length === 0 ? (
            <p className="font-inter text-sm text-slate-400 text-center py-6">No past seasons yet.</p>
          ) : (
            seasonHistory.map((entry, i) => {
              const sortedStandings = [...entry.standings].sort((a, b) => b.wins - b.losses - (a.wins - a.losses))
              return (
                <div key={`${entry.label}-${i}`} className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div>
                      <h4 className="font-oswald font-bold text-base text-white">{entry.label}</h4>
                      <span className="font-inter text-xs text-slate-400">
                        {new Date(entry.startedAt).toLocaleDateString('en-IE')} – {new Date(entry.endedAt).toLocaleDateString('en-IE')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRestore(i, entry.label)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-inter font-medium bg-amber-400/10 hover:bg-amber-400/20 ring-1 ring-amber-400/25 text-amber-400 transition-colors"
                    >
                      <RefreshCw size={13} /> Restore
                    </button>
                  </div>
                  <p className="font-inter text-xs text-slate-400 mb-2">{entry.standings.length} teams · {entry.fixtures.length} fixtures archived</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto scroll-slim pr-1">
                    {sortedStandings.length === 0 ? (
                      <p className="text-xs text-slate-500 font-inter italic">No team records for this season.</p>
                    ) : (
                      sortedStandings.map((s) => (
                        <div key={s.teamId} className="flex items-center justify-between text-xs font-inter text-slate-300 py-0.5">
                          <span className="truncate pr-2">{s.name}</span>
                          <span className="text-slate-400 shrink-0">{s.wins}W – {s.losses}L · {s.pointsFor}-{s.pointsAgainst}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Modal>
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
      <div className="dash-card p-6 flex items-center gap-3">
        <CheckCircle size={20} className="text-green-400" />
        <p className="font-inter text-sm text-slate-300">Every member has paid this month. Nice work.</p>
      </div>
    )
  }

  const monthLabel = new Date().toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })

  return (
    <div className="dash-card">
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

  const [teamFilter, setTeamFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [ageGroupFilter, setAgeGroupFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void whenClubDataReady().then(() => {
      if (cancelled) return
      reconcileClubRoster()
      data.refresh()
      void ensureClubRosterSynced()
    })
    return () => { cancelled = true }
  }, [data.refresh])

  const rosterMembers = useMemo(() => players.filter(isRosterListedMember), [players])
  const unassignedMembers = useMemo(
    () => players.filter(isRosterListedMember).filter((p) => p.teamIds.length === 0),
    [players],
  )

  const [form, setForm] = useState<Partial<Player>>({
    name: '', email: '', phone: '', dob: '', gender: 'Male', teamIds: [], position: 'Guard', jerseyNumber: 0,
    status: 'Paid', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '', registrationDate: '',
    guardianName: '', guardianPhone: '', registeredWithBI: true,
  })

  const filtered = useMemo(() => {
    return rosterMembers.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        (isChildRosterPlayer(p) && (getParentForChildRosterPlayer(p.id)?.name.toLowerCase().includes(search.toLowerCase()) ?? false))
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter
      const matchesAge = ageGroupFilter === 'All' || p.teamIds.some((tid) => {
        const t = teams.find((tm) => tm.id === tid)
        return t?.ageGroupId === ageGroupFilter
      }) || (
        ageGroupFilter !== 'All' &&
        p.teamIds.length === 0 &&
        getFeeAgeGroupIdForPlayer(p) === ageGroupFilter
      )
      const matchesTeam =
        teamFilter === 'All' ||
        (teamFilter === 'unassigned' && p.teamIds.length === 0) ||
        p.teamIds.includes(teamFilter)
      return matchesSearch && matchesStatus && matchesAge && matchesTeam
    })
  }, [search, teamFilter, statusFilter, ageGroupFilter, rosterMembers, teams])

  const resetForm = () => {
    setForm({
      name: '', email: '', phone: '', dob: '', gender: 'Male', teamIds: [], position: 'Guard', jerseyNumber: 0,
      status: 'Paid', paymentPlan: 'Monthly', amount: 50, lastPaymentDate: '', registrationDate: '',
      guardianName: '', guardianPhone: '', registeredWithBI: true,
    })
  }

  const handleSave = () => {
    if (!editingPlayer) return
    const isChild = isChildRosterPlayer(editingPlayer)
    if (!form.name?.trim() || (!isChild && !form.email?.trim())) return
    const updated: Player = {
      ...editingPlayer,
      ...(form as Player),
    }
    if (updated.email?.trim()) clearMemberRevocation(updated.email)
    const next = players.map((p) => (p.id === updated.id ? updated : p))
    savePlayers(next)
    const nextTeams = teams.map((t) => {
      const onTeam = updated.teamIds.includes(t.id)
      const wasOnTeam = t.players.includes(updated.id)
      if (onTeam && !wasOnTeam) return { ...t, players: [...t.players, updated.id] }
      if (!onTeam && wasOnTeam) return { ...t, players: t.players.filter((pid) => pid !== updated.id) }
      return t
    })
    saveTeams(nextTeams)
    if (updated.memberType === 'parent') syncChildrenRosterForParent(updated.id)
    setEditingPlayer(null)
    setShowAddModal(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    removePlayerFromClub(id)
    setConfirmDelete(null)
  }

  const openEdit = (player: Player) => {
    setForm({ ...player })
    setEditingPlayer(player)
    setShowAddModal(true)
  }

  const handleExportCsv = () => {
    const teamName = (id: string) => teams.find((t) => t.id === id)?.name || id
    const headers = ['Name', 'Email', 'Phone', 'Teams', 'Status', 'Plan', 'Position', 'Jersey', 'Amount', 'BI Registered', 'Registration Date']
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const rows = filtered.map((p) => [
      p.name, p.email, p.phone || '', p.teamIds.map(teamName).join('; '),
      p.status, p.paymentPlan, p.position, String(p.jerseyNumber),
      String(p.amount), p.registeredWithBI ? 'Yes' : 'No', p.registrationDate || '',
    ].map(escape).join(','))
    const csv = [headers.map(escape).join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dublin-lions-members-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-none">Members</h2>
          <p className="font-inter text-sm text-slate-400 mt-1.5">
            Players and children who signed up and completed registration — assign teams from here or the Teams tab.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 bg-transparent border border-white/30 text-white font-inter font-medium text-sm px-3 py-2 rounded hover:bg-white/5 transition-colors duration-150"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="dash-card p-3 flex flex-wrap items-center gap-3">
        <div className="relative md:hidden">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 bg-white/5 border border-[#334155] rounded-lg pl-9 pr-3 py-2 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
          />
        </div>
        <button
          type="button"
          onClick={() => setTeamFilter(teamFilter === 'unassigned' ? 'All' : 'unassigned')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-inter text-sm font-medium border transition-all ${
            teamFilter === 'unassigned'
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-white/5 text-slate-300 border-[#334155] hover:border-amber-500/30 hover:text-amber-200'
          }`}
        >
          <UserPlus size={14} />
          Unassigned ({unassignedMembers.length})
        </button>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="bg-white/5 border border-[#334155] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">All Teams</option>
          <option value="unassigned">Unassigned only</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={ageGroupFilter}
          onChange={(e) => setAgeGroupFilter(e.target.value)}
          className="bg-white/5 border border-[#334155] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">All Age Groups</option>
          {ageGroups.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-[#334155] rounded-lg px-3 py-2 font-inter text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>
        <button onClick={handleExportCsv} className="ml-auto flex items-center gap-2 bg-transparent border border-white/30 text-white font-inter font-medium text-sm px-3 py-2 rounded hover:bg-white/5 transition-colors duration-150">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="dash-card overflow-hidden">
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
                        <p className="font-inter font-medium text-sm text-white flex items-center gap-2">
                          {member.name}
                          {isChildRosterPlayer(member) && (
                            <span className="text-[10px] uppercase tracking-wider text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Child</span>
                          )}
                          {member.memberType === 'parent' && !isChildRosterPlayer(member) && (
                            <span className="text-[10px] uppercase tracking-wider text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">Parent</span>
                          )}
                        </p>
                        <p className="font-inter text-xs text-slate-400">
                          {isChildRosterPlayer(member)
                            ? member.dob
                              ? `DOB ${new Date(member.dob).toLocaleDateString('en-IE')}${calcAge(member.dob) !== null ? ` · Age ${calcAge(member.dob)}` : ''}`
                              : 'Child member'
                            : member.email || 'No email'}
                        </p>
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
            Showing {filtered.length} of {rosterMembers.length} members
          </p>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setEditingPlayer(null) }} title={editingPlayer ? (isChildRosterPlayer(editingPlayer) ? 'Child Member' : 'Edit Member') : 'Edit Member'} maxWidth="max-w-2xl">
        {editingPlayer && isChildRosterPlayer(editingPlayer) && (() => {
          const parentAccount = getParentForChildRosterPlayer(editingPlayer.id)
          if (!parentAccount) return null
          return (
            <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="font-inter text-xs uppercase tracking-wider text-blue-300 mb-2">Parent / Guardian</p>
              <p className="font-inter font-semibold text-white">{parentAccount.name}</p>
              <p className="font-inter text-sm text-slate-300">{parentAccount.email}</p>
              {parentAccount.phone ? <p className="font-inter text-sm text-slate-400">{parentAccount.phone}</p> : null}
            </div>
          )
        })()}
        {editingPlayer && editingPlayer.memberType === 'parent' && !isChildRosterPlayer(editingPlayer) && (
          <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="font-inter text-xs uppercase tracking-wider text-slate-400 mb-3">Registered children</p>
            {getRegisteredChildren(editingPlayer).length === 0 ? (
              <p className="font-inter text-sm text-slate-500">No children on this account yet.</p>
            ) : (
              <ul className="space-y-2">
                {getRegisteredChildren(editingPlayer).map((child) => (
                  <li key={child.id} className="font-inter text-sm text-slate-200">
                    <span className="font-medium text-white">{child.name}</span>
                    <span className="text-slate-400">
                      {' '}· DOB {child.dob ? new Date(child.dob).toLocaleDateString('en-IE') : '—'}
                      {child.dob && calcAge(child.dob) !== null ? ` (age ${calcAge(child.dob)})` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formField('Full Name', <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="John Doe" />)}
          {formField('Email', <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="john@email.ie" />)}
          {formField('Phone', <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="+353 87 123 4567" />)}
          {formField('Date of Birth', <input type="date" value={form.dob || ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" />)}
          {formField('Gender', (
            <select value={form.gender || 'Male'} onChange={(e) => setForm({ ...form, gender: e.target.value as 'Male' | 'Female' })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          ))}
          {formField('Position', (
            <select value={form.position || 'Guard'} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500">
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ))}
          {formField('Jersey Number', <input type="number" value={form.jerseyNumber || 0} onChange={(e) => setForm({ ...form, jerseyNumber: parseInt(e.target.value) || 0 })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" />)}
          {formField('Payment Status', (
            <select value={form.status || 'Paid'} onChange={(e) => setForm({ ...form, status: e.target.value as 'Paid' | 'Pending' | 'Overdue' })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          ))}
          {formField('Payment Plan', (
            <select value={form.paymentPlan || 'Monthly'} onChange={(e) => setForm({ ...form, paymentPlan: e.target.value as Player['paymentPlan'] })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500">
              {PAYMENT_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ))}
          {formField('Amount (€)', <input type="number" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" />)}
          {formField('Last Payment Date', <input type="date" value={form.lastPaymentDate || ''} onChange={(e) => setForm({ ...form, lastPaymentDate: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" />)}
          {formField('Registration Date', <input type="date" value={form.registrationDate || ''} onChange={(e) => setForm({ ...form, registrationDate: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" />)}
          {formField('Guardian Name', <input value={form.guardianName || ''} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="Parent / Guardian" />)}
          {formField('Guardian Phone', <input value={form.guardianPhone || ''} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="+353 87 000 0000" />)}
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
          <button onClick={handleSave} className="btn-gradient text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">
            Save Changes
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
  const { teams, ageGroups, players, saveTeams, saveAgeGroups, refresh } = data
  const [activeAgeGroup, setActiveAgeGroup] = useState('senior')
  const [activeDivision, setActiveDivision] = useState<string | 'all'>('all')
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showAddDivision, setShowAddDivision] = useState(false)
  const [showAddAgeGroup, setShowAddAgeGroup] = useState(false)
  const [rosterTeam, setRosterTeam] = useState<Team | null>(null)
  const [rosterSearch, setRosterSearch] = useState('')
  const [teamForm, setTeamForm] = useState({ name: '', gender: 'Men' as Team['gender'], divisionId: '', coach: '' })
  const [divisionName, setDivisionName] = useState('')
  const [ageGroupForm, setAgeGroupForm] = useState({ name: '', minAge: '', maxAge: '' })

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

  const handleAddAgeGroup = () => {
    const name = ageGroupForm.name.trim()
    if (!name) return
    const id = name.toLowerCase().replace(/\s+/g, '-')
    if (ageGroups.some((ag) => ag.id === id)) {
      alert('An age group with that name already exists.')
      return
    }
    const minAge = parseInt(ageGroupForm.minAge, 10) || 0
    const maxAge = parseInt(ageGroupForm.maxAge, 10) || minAge
    const newAgeGroup: AgeGroup = {
      id,
      name,
      minAge,
      maxAge,
      divisions: [{ id: `${id}-a`, name: 'A', level: 1 }],
    }
    saveAgeGroups([...ageGroups, newAgeGroup])
    setActiveAgeGroup(id)
    setActiveDivision('all')
    setShowAddAgeGroup(false)
    setAgeGroupForm({ name: '', minAge: '', maxAge: '' })
  }

  const handleDeleteDivision = (divisionId: string) => {
    const teamsInDivision = teams.filter((t) => t.divisionId === divisionId)
    if (teamsInDivision.length > 0) {
      alert(`Can't delete this division — ${teamsInDivision.length} team(s) are still assigned to it. Move or delete those teams first.`)
      return
    }
    if (!confirm('Delete this division?')) return
    const nextAgeGroups = ageGroups.map((ag) =>
      ag.id === activeAgeGroup ? { ...ag, divisions: ag.divisions.filter((d) => d.id !== divisionId) } : ag
    )
    saveAgeGroups(nextAgeGroups)
    if (activeDivision === divisionId) setActiveDivision('all')
  }

  const rosterTeamPlayers = rosterTeam ? getTeamPlayers(rosterTeam.id) : []
  const unassignedForRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase()
    return getUnassignedRosterMembers().filter((p) =>
      !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    )
  }, [players, rosterSearch])

  const handleAssignToRosterTeam = (playerId: string) => {
    if (!rosterTeam) return
    assignPlayerToTeam(playerId, rosterTeam.id)
    refresh()
  }

  const handleRemoveFromRosterTeam = (playerId: string) => {
    if (!rosterTeam) return
    unassignPlayerFromTeam(playerId, rosterTeam.id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-none">Teams</h2>
          <p className="font-inter text-sm text-slate-400 mt-1.5">Divisions, rosters &amp; league standings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddAgeGroup(true)} className="flex items-center gap-2 bg-transparent border border-white/30 text-white font-inter font-medium text-sm px-3 py-2 rounded hover:bg-white/5 transition-colors">
            <Plus size={14} />
            Add Age Group
          </button>
          <button onClick={() => setShowAddDivision(true)} className="flex items-center gap-2 bg-transparent border border-white/30 text-white font-inter font-medium text-sm px-3 py-2 rounded hover:bg-white/5 transition-colors">
            <Plus size={14} />
            Add Division
          </button>
          <button onClick={() => setShowAddTeam(true)} className="flex items-center gap-2 btn-gold font-inter text-sm px-4 py-2 rounded-lg hover:scale-[1.03] transition-all duration-150">
            <Plus size={16} />
            Add Team
          </button>
        </div>
      </div>

      {/* Age Group Tabs */}
      <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg p-1 w-fit overflow-x-auto">
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
            <span
              key={d.id}
              className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-md font-inter text-xs font-medium transition-all ${activeDivision === d.id ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white bg-white/5'}`}
            >
              <button onClick={() => setActiveDivision(d.id)}>{d.name}</button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteDivision(d.id) }}
                title="Delete division"
                className="opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Team Cards */}
      {filteredTeams.length === 0 ? (
        <div className="dash-card p-8 text-center">
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
              <div key={team.id} className="dash-card p-5 space-y-4">
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

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setRosterTeam(team); setRosterSearch('') }}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/25 text-blue-300 hover:bg-blue-500/20 font-inter font-medium text-xs px-3 py-2.5 rounded transition-all"
                  >
                    <UserPlus size={14} />
                    Manage Roster
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(team.id)}
                    className="flex items-center justify-center gap-2 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 font-inter font-medium text-xs px-3 py-2.5 rounded transition-all"
                    title="Delete team"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={!!rosterTeam}
        onClose={() => { setRosterTeam(null); setRosterSearch('') }}
        title={rosterTeam ? `Roster — ${rosterTeam.name}` : 'Team Roster'}
        maxWidth="max-w-lg"
      >
        {rosterTeam && (
          <div className="space-y-6">
            <div>
              <p className="font-inter text-xs uppercase tracking-wider text-slate-400 mb-3">
                On this team ({rosterTeamPlayers.length})
              </p>
              {rosterTeamPlayers.length === 0 ? (
                <p className="font-inter text-sm text-slate-500 py-2">No players assigned yet.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto scroll-slim pr-1">
                  {rosterTeamPlayers.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white/5 border border-white/[0.06] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="font-inter text-sm font-medium text-white truncate">{p.name}</p>
                        <p className="font-inter text-xs text-slate-400">
                          {isChildRosterPlayer(p) ? 'Child' : p.position || 'Player'}
                          {p.jerseyNumber ? ` · #${p.jerseyNumber}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromRosterTeam(p.id)}
                        className="shrink-0 text-xs font-inter text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="font-inter text-xs uppercase tracking-wider text-slate-400 mb-3">
                Add unassigned members
              </p>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full bg-white/5 border border-[#334155] rounded-lg pl-9 pr-3 py-2 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              {unassignedForRoster.length === 0 ? (
                <p className="font-inter text-sm text-slate-500 py-2">
                  {rosterSearch ? 'No matches.' : 'Everyone is already on a team.'}
                </p>
              ) : (
                <ul className="space-y-2 max-h-56 overflow-y-auto scroll-slim pr-1">
                  {unassignedForRoster.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-[#0A1628] border border-white/[0.06] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="font-inter text-sm font-medium text-white truncate">{p.name}</p>
                        <p className="font-inter text-xs text-slate-400">
                          {isChildRosterPlayer(p) && p.dob
                            ? `Age ${calcAge(p.dob) ?? '—'}`
                            : p.email || 'Unassigned'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAssignToRosterTeam(p.id)}
                        className="shrink-0 flex items-center gap-1 text-xs font-inter font-semibold text-blue-300 hover:text-white bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 px-2.5 py-1.5 rounded transition-colors"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAddTeam} onClose={() => setShowAddTeam(false)} title="Add New Team">
        <div className="space-y-4">
          {formField('Team Name', <input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="Dublin Lions U16 Boys A" />)}
          <div className="grid grid-cols-2 gap-4">
            {formField('Gender', (
              <select value={teamForm.gender} onChange={(e) => setTeamForm({ ...teamForm, gender: e.target.value as Team['gender'] })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
              </select>
            ))}
            {formField('Division', (
              <select value={teamForm.divisionId} onChange={(e) => setTeamForm({ ...teamForm, divisionId: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="">Select Division</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ))}
          </div>
          {formField('Coach', <input value={teamForm.coach} onChange={(e) => setTeamForm({ ...teamForm, coach: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="Coach Name" />)}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setShowAddTeam(false)} className="px-4 py-2 font-inter text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleAddTeam} className="btn-gradient text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">Add Team</button>
        </div>
      </Modal>

      <Modal open={showAddDivision} onClose={() => setShowAddDivision(false)} title="Add Division">
        <div className="space-y-4">
          <p className="font-inter text-sm text-slate-400">Adding division to <span className="text-white font-medium">{currentAgeGroup?.name}</span></p>
          {formField('Division Name', <input value={divisionName} onChange={(e) => setDivisionName(e.target.value)} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="e.g., E or Development" />)}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setShowAddDivision(false)} className="px-4 py-2 font-inter text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleAddDivision} className="btn-gradient text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">Add Division</button>
        </div>
      </Modal>

      <Modal open={showAddAgeGroup} onClose={() => setShowAddAgeGroup(false)} title="Add Age Group">
        <div className="space-y-4">
          {formField('Age Group Name', <input value={ageGroupForm.name} onChange={(e) => setAgeGroupForm({ ...ageGroupForm, name: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="e.g., U8 or Academy" />)}
          <div className="grid grid-cols-2 gap-4">
            {formField('Min Age', <input type="number" value={ageGroupForm.minAge} onChange={(e) => setAgeGroupForm({ ...ageGroupForm, minAge: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500" placeholder="6" />)}
            {formField('Max Age', <input type="number" value={ageGroupForm.maxAge} onChange={(e) => setAgeGroupForm({ ...ageGroupForm, maxAge: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500" placeholder="8" />)}
          </div>
          <p className="font-inter text-xs text-slate-500">A default "A" division is created automatically — add more from "Add Division" once it exists.</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setShowAddAgeGroup(false)} className="px-4 py-2 font-inter text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleAddAgeGroup} className="btn-gradient text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">Add Age Group</button>
        </div>
      </Modal>
    </div>
  )
}

/* ─────────────────────── View: Payments ─────────────────────── */

function RecordPaymentModal({
  players,
  onClose,
  onSave,
}: {
  players: Player[]
  onClose: () => void
  onSave: (playerId: string, amount: number, method: string, plan: string) => void
}) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [feeType, setFeeType] = useState<'monthly' | 'oneTime'>('monthly')
  const [amount, setAmount] = useState(() => (players[0] ? getMonthlyFeeForPlayer(players[0].id) : 50))
  const [method, setMethod] = useState('Cash')

  const onPlayerChange = (id: string) => {
    setPlayerId(id)
    setAmount(feeType === 'monthly' ? getMonthlyFeeForPlayer(id) : getOneTimeFeeForPlayer(id))
  }

  const onFeeTypeChange = (type: 'monthly' | 'oneTime') => {
    setFeeType(type)
    if (playerId) setAmount(type === 'monthly' ? getMonthlyFeeForPlayer(playerId) : getOneTimeFeeForPlayer(playerId))
  }

  return (
    <Modal open onClose={onClose} title="Record Payment">
      <div className="space-y-4">
        {formField('Member', (
          <select
            value={playerId}
            onChange={(e) => onPlayerChange(e.target.value)}
            className="w-full bg-[#0A1628] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ))}
        {formField('Fee type', (
          <select
            value={feeType}
            onChange={(e) => onFeeTypeChange(e.target.value as 'monthly' | 'oneTime')}
            className="w-full bg-[#0A1628] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="monthly">Monthly</option>
            <option value="oneTime">One-time registration</option>
          </select>
        ))}
        <div className="grid grid-cols-2 gap-3">
          {formField('Amount (€)', (
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0A1628] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          ))}
          {formField('Method', (
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-[#0A1628] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option>Cash</option>
              <option>Stripe</option>
              <option>Bank Transfer</option>
            </select>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-white/5 border border-white/10 text-slate-300 font-inter font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-white/10 transition-colors">Cancel</button>
          <button
            onClick={() => { if (playerId) { onSave(playerId, amount, method, feeType === 'monthly' ? 'Monthly' : 'One-time'); onClose() } }}
            disabled={!playerId || amount <= 0}
            className="flex-1 bg-blue-500 text-white font-inter font-semibold text-sm rounded-lg px-4 py-2.5 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} /> Record Payment
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PaymentsView({ data }: { data: ReturnType<typeof useLiveData> }) {
  const { payments, players, savePayments, savePlayers, ageGroups, teams } = data
  const [paymentTab, setPaymentTab] = useState('All')
  const [showRecord, setShowRecord] = useState(false)
  const [viewPayment, setViewPayment] = useState<Payment | null>(null)

  // Record a new payment and flip the member to Paid.
  const handleRecord = (playerId: string, amount: number, method: string, plan: string) => {
    const player = players.find((p) => p.id === playerId)
    if (!player) return
    const payment: Payment = {
      id: `pay-${Date.now().toString(36)}`,
      playerId,
      playerName: player.name,
      amount,
      status: 'succeeded',
      date: new Date().toISOString().split('T')[0],
      method,
      plan,
    }
    savePayments([payment, ...payments])
    savePlayers(players.map((p) => (p.id === playerId ? { ...p, status: 'Paid' as const, lastPaymentDate: payment.date, amount } : p)))
  }

  // Retry a failed payment → mark succeeded and flip the member to Paid.
  const handleRetry = (payment: Payment) => {
    savePayments(payments.map((p) => (p.id === payment.id ? { ...p, status: 'succeeded' as const, date: new Date().toISOString().split('T')[0] } : p)))
    savePlayers(players.map((p) => (p.id === payment.playerId ? { ...p, status: 'Paid' as const, lastPaymentDate: new Date().toISOString().split('T')[0] } : p)))
  }

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
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-none">Payments</h2>
          <p className="font-inter text-sm text-slate-400 mt-1.5">Record payments &amp; track revenue</p>
        </div>
        <button onClick={() => setShowRecord(true)} className="flex items-center gap-2 btn-gold font-inter text-sm px-4 py-2 rounded-lg hover:scale-[1.03] transition-all duration-150">
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
        <div className="dash-card p-6">
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

        <div className="dash-card p-6">
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

      <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg p-1 w-fit">
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

      <div className="dash-card overflow-hidden">
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
                        <button onClick={() => handleRetry(t)} className="text-blue-400 hover:text-blue-300 font-inter text-sm font-medium transition-colors">Retry</button>
                      ) : (
                        <button onClick={() => setViewPayment(t)} className="text-slate-400 hover:text-white font-inter text-sm transition-colors">View</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-card p-6">
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
                <button onClick={() => handleRetry(t)} className="flex items-center gap-2 btn-gradient text-white font-inter font-semibold text-sm px-4 py-2 rounded transition-all duration-150">
                  <RefreshCw size={14} />
                  Retry
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <PurchaseHistoryPanel />

      <MembershipFeesPanel ageGroups={ageGroups} teams={teams} />

      {showRecord && (
        <RecordPaymentModal players={players} onClose={() => setShowRecord(false)} onSave={handleRecord} />
      )}
      {viewPayment && (
        <Modal open onClose={() => setViewPayment(null)} title="Payment Details">
          <div className="space-y-3">
            {[
              ['Member', viewPayment.playerName],
              ['Amount', `€${viewPayment.amount}`],
              ['Date', viewPayment.date],
              ['Method', viewPayment.method],
              ['Plan', viewPayment.plan],
              ['Status', viewPayment.status],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="font-inter text-sm text-slate-400">{label}</span>
                <span className="font-inter text-sm font-medium text-white capitalize">{value}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
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
          <div>
            <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-none">Public Fixtures &amp; Results</h2>
            <p className="font-inter text-sm text-slate-400 mt-1.5">Publish upcoming games &amp; post final scores</p>
          </div>
          <p className="font-inter text-sm text-slate-400 mt-1">Add upcoming games and record final scores. Visible on the homepage and Fixtures page.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 btn-gold font-inter text-sm px-4 py-2 rounded-lg hover:scale-[1.03] transition-all duration-150 shrink-0"
        >
          <Plus size={16} />
          Add Fixture
        </button>
      </div>

      <div className="dash-card overflow-hidden">
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
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="btn-gradient disabled:opacity-40 text-white font-inter font-semibold text-sm px-4 py-2 rounded-lg">Save</button>
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
          <button onClick={() => onSave({ lionsScore, opponentScore: oppScore, mvp: mvp.trim() || undefined })} className="bg-lions-500 hover:bg-lions-400 text-white font-inter font-semibold text-sm px-4 py-2 rounded-lg">Save Result</button>
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

      <SeasonControlCenter data={data} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-none">Training Schedule</h2>
          <p className="font-inter text-sm text-slate-400 mt-1.5">Plan sessions &amp; matches across all teams</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 btn-gold font-inter text-sm px-4 py-2 rounded-lg hover:scale-[1.03] transition-all duration-150"
        >
          <Plus size={16} />
          Create Session
        </button>
      </div>

      <div className="dash-card overflow-hidden">
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
          {formField('Session Title', <input value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="Training Session" />)}
          <div className="grid grid-cols-2 gap-4">
            {formField('Team', (
              <select value={sessionForm.teamId} onChange={(e) => setSessionForm({ ...sessionForm, teamId: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="">Select Team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            ))}
            {formField('Date', <input type="date" value={sessionForm.date} onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" />)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {formField('Time', <input type="time" value={sessionForm.time} onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" />)}
            {formField('Type', (
              <select value={sessionForm.type} onChange={(e) => setSessionForm({ ...sessionForm, type: e.target.value as Session['type'] })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500">
                <option>Training</option>
                <option>Match</option>
                <option>Event</option>
              </select>
            ))}
          </div>
          {sessionForm.type === 'Match' && (
            formField('Opponent', <input value={sessionForm.opponent} onChange={(e) => setSessionForm({ ...sessionForm, opponent: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="Neptune BC" />)
          )}
          {formField('Location', (
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={sessionForm.location} onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })} className="w-full bg-white/5 border border-[#334155] rounded-lg pl-9 pr-4 py-2.5 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" placeholder="Coláiste Bríde" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 font-inter text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleCreateSession} className="btn-gradient text-white font-inter font-semibold text-sm px-6 py-2 rounded transition-all duration-150">Create Session</button>
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

  // Real cumulative membership over the last 6 months, derived from each
  // member's registrationDate. Members with no/invalid date count from the start.
  const membershipGrowthData = useMemo(() => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    const buckets: { month: string; end: Date }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0) // last day of that month
      buckets.push({ month: labels[d.getMonth()], end: d })
    }
    return buckets.map(({ month, end }) => ({
      month,
      members: players.filter((p) => {
        const reg = p.registrationDate ? new Date(p.registrationDate) : null
        return !reg || isNaN(reg.getTime()) || reg.getTime() <= end.getTime()
      }).length,
    }))
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
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-none">Reports</h2>
          <p className="font-inter text-sm text-slate-400 mt-1.5">Revenue, membership &amp; performance analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="dash-card p-6">
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
        <div className="dash-card p-6">
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
        <div className="dash-card p-6">
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
        <div className="dash-card p-6">
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
      <div className="dash-card overflow-hidden">
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
      <div className="dash-card p-6">
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

type ImageMetaEntry = { title: string; usedOn: string; defaultPath: string; section: string }

// Section display order for the grouped Image Manager grid.
const imageSections = ['Branding', 'Sponsors', 'Homepage', 'Gallery', 'Team & Coaches', 'Venue'] as const

const imageMeta: Record<string, ImageMetaEntry> = {
  logo: { title: 'Club Logo', usedOn: 'Navbar, Footer, Login pages, Dashboard sidebar', defaultPath: '/logo-lions-emblem.png', section: 'Branding' },
  sponsorJoels: { title: "Sponsor: Joel's", usedOn: "Men's team header, Teams page, Footer sponsors bar", defaultPath: '/sponsor-joels.png', section: 'Sponsors' },
  sponsorAbbey: { title: 'Sponsor: Abbey Seals', usedOn: "Women's team header, Teams page, Footer sponsors bar", defaultPath: '/sponsor-abbey-seals.png', section: 'Sponsors' },
  hero: { title: 'Homepage Hero Background', usedOn: 'Landing page hero section — full-screen banner', defaultPath: '/hero-team-celebration.jpg', section: 'Homepage' },
  about: { title: 'About the Club', usedOn: 'About section on homepage — team huddle photo', defaultPath: '/about-team-huddle.jpg', section: 'Homepage' },
  match1: { title: 'Gallery Photo 1', usedOn: 'Homepage gallery grid, position 1', defaultPath: '/match-action-1.jpg', section: 'Gallery' },
  match2: { title: 'Gallery Photo 2', usedOn: 'Homepage gallery grid, position 2', defaultPath: '/match-action-2.jpg', section: 'Gallery' },
  match3: { title: 'Gallery Photo 3', usedOn: 'Homepage gallery grid, position 3', defaultPath: '/match-action-3.jpg', section: 'Gallery' },
  match4: { title: 'Gallery Photo 4', usedOn: 'Homepage gallery grid, position 4', defaultPath: '/match-action-4.jpg', section: 'Gallery' },
  match5: { title: 'Gallery Photo 5', usedOn: 'Homepage gallery grid, position 5', defaultPath: '/match-action-5.jpg', section: 'Gallery' },
  match6: { title: 'Gallery Photo 6', usedOn: 'Homepage gallery grid, position 6', defaultPath: '/match-action-6.jpg', section: 'Gallery' },
  match7: { title: 'Gallery Photo 7', usedOn: 'Homepage gallery grid, position 7', defaultPath: '/match-action-7.jpg', section: 'Gallery' },
  match8: { title: 'Gallery Photo 8', usedOn: 'Homepage gallery grid, position 8', defaultPath: '/match-action-8.jpg', section: 'Gallery' },
  playerKevin: { title: "Men's Team: Kevin Anyanwu", usedOn: "Teams page / Homepage men's squad", defaultPath: '/player-kevin-anyanwu.jpg', section: 'Team & Coaches' },
  playerTiago: { title: "Men's Team: Tiago Pereira", usedOn: "Teams page / Homepage men's squad", defaultPath: '/player-tiago-pereira.jpg', section: 'Team & Coaches' },
  playerTara: { title: "Women's Team: Tara Nevin", usedOn: "Teams page / Homepage women's squad", defaultPath: '/player-tara-nevin.jpg', section: 'Team & Coaches' },
  playerEmily: { title: "Women's Team: Emily Smyth", usedOn: "Teams page / Homepage women's squad", defaultPath: '/player-emily-smyth.jpg', section: 'Team & Coaches' },
  coachRob: { title: "Head Coach: Rob White", usedOn: 'Teams page coach profile card', defaultPath: '/coach-rob-white.jpg', section: 'Team & Coaches' },
  venue: { title: 'Venue: Coláiste Bríde', usedOn: 'Contact page venue section', defaultPath: '/venue-colaiste-bride.jpg', section: 'Venue' },
}

// Resolve a stored value to a displayable URL. Uploaded/linked URLs (http, data,
// blob) pass through unchanged; bundled public-folder paths get the deploy base
// prefix (e.g. "/basketball-manager/") — without double-prefixing if already set.
function resolveImageUrl(raw: string): string {
  if (!raw) return ''
  if (/^(data:|blob:|https?:)/i.test(raw)) return raw
  const base = import.meta.env.BASE_URL || '/'
  if (raw.startsWith(base)) return raw
  const clean = raw.startsWith('/') ? raw.slice(1) : raw
  return base.endsWith('/') ? base + clean : `${base}/${clean}`
}

function ImagesView() {
  const [images, setImages] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('dlbc_images')
    if (saved) return JSON.parse(saved)
    return Object.fromEntries(Object.entries(imageMeta).map(([k, v]) => [k, v.defaultPath]))
  })
  const [showBanner, setShowBanner] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  // Manager-editable display names (player/coach), synced to all visitors.
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')

  // Reflect the shared map (Supabase + cache) into local state.
  useEffect(() => {
    const sync = () => {
      try {
        const saved = localStorage.getItem('dlbc_images')
        const map = saved ? JSON.parse(saved) : {}
        const merged = Object.fromEntries(
          Object.keys(imageMeta).map((k) => [k, map[k] || imageMeta[k].defaultPath]),
        )
        setImages(merged)
        // Pull any custom name labels (stored under a "label:" prefix).
        const nextLabels: Record<string, string> = {}
        for (const [k, v] of Object.entries(map)) {
          if (k.startsWith(LABEL_PREFIX) && typeof v === 'string') {
            nextLabels[k.slice(LABEL_PREFIX.length)] = v
          }
        }
        setLabels(nextLabels)
      } catch { /* ignore */ }
    }
    window.addEventListener('dlbc-images-updated', sync)
    fetchSiteImages(true).then(sync).catch(sync)
    return () => window.removeEventListener('dlbc-images-updated', sync)
  }, [])

  const flashSaved = useCallback(() => {
    setShowBanner(true)
    setTimeout(() => setShowBanner(false), 3000)
  }, [])

  // Local-only fallback (base64) used when Supabase Storage is not configured.
  const saveLocal = useCallback((next: Record<string, string>) => {
    setImages(next)
    localStorage.setItem('dlbc_images', JSON.stringify(next))
    flashSaved()
    window.dispatchEvent(new Event('dlbc-images-updated'))
  }, [flashSaved])

  // Persist an edited display name. saveSiteImageUrl writes to the shared store
  // (Supabase + local cache) and dispatches the update event, so the sync
  // handler above refreshes `labels` and every visitor picks it up.
  const commitName = useCallback((key: string) => {
    const value = nameDraft.trim()
    setEditingName(null)
    void saveSiteImageUrl(`${LABEL_PREFIX}${key}`, value).then(() => flashSaved())
  }, [nameDraft, flashSaved])

  const handleFileUpload = useCallback(async (key: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed (JPG, PNG, GIF, WEBP)')
      return
    }
    const maxMb = isSupabaseConfigured ? 5 : 2
    if (file.size > maxMb * 1024 * 1024) {
      setUploadError(`Image must be under ${maxMb}MB`)
      return
    }
    setUploading(key)
    setUploadError(null)

    if (isSupabaseConfigured) {
      const { url, error } = await uploadSiteImage(key, file)
      setUploading(null)
      if (error || !url) {
        setUploadError(error === 'not-configured'
          ? 'Storage is not configured.'
          : `Upload failed: ${error}. Check that the "site-images" bucket exists and you are signed in.`)
        return
      }
      // cache/state update arrives via the dlbc-images-updated listener
      flashSaved()
      return
    }

    // Fallback: embed as base64 in localStorage (this browser only).
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      if (base64) saveLocal({ ...images, [key]: base64 })
      setUploading(null)
    }
    reader.onerror = () => {
      setUploadError('Failed to read image file')
      setUploading(null)
    }
    reader.readAsDataURL(file)
  }, [images, saveLocal, flashSaved])

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

  const handleReset = useCallback(async (key: string) => {
    setUploadError(null)
    const { error } = await resetSiteImage(key)
    if (error) { setUploadError(`Could not reset: ${error}`); return }
    flashSaved()
  }, [flashSaved])

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
          // Update the local cache/UI immediately...
          saveLocal(merged)
          // ...and, when shared storage is configured, persist each override
          // so the imported config is visible to every visitor.
          if (isSupabaseConfigured) {
            Object.entries(config.images as Record<string, string>).forEach(([k, url]) => {
              if (typeof url === 'string' && url) void saveSiteImageUrl(k, url)
            })
          }
        } else {
          setUploadError('Invalid config file format')
        }
      } catch {
        setUploadError('Failed to parse config file')
      }
    }
    reader.readAsText(file)
  }, [saveLocal])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div>
            <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-none">Image Manager</h2>
            <p className="font-inter text-sm text-slate-400 mt-1.5">Update photos &amp; branding across the public site</p>
          </div>
          <p className="font-inter text-sm text-slate-400 mt-1 max-w-xl">
            Upload images from your computer — drag &amp; drop or click a photo. Changes apply instantly across the entire site.
          </p>
          <div className="mt-3">
            {isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 font-inter text-xs font-medium text-green-400">
                <CheckCircle size={13} />
                Shared storage — every visitor sees your uploads
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-500/10 border border-warn-500/20 px-3 py-1 font-inter text-xs font-medium text-warn-400">
                <AlertCircle size={13} />
                Browser-only — uploads show on this device until storage is configured
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <label className="cursor-pointer flex items-center gap-2 bg-transparent border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-inter font-semibold text-sm px-4 py-2 rounded transition-all duration-200">
            <Upload size={16} />
            Import Config
            <input type="file" accept=".json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImport(file); e.target.value = '' }} />
          </label>
          <button onClick={handleExport} className="flex items-center gap-2 btn-gradient text-white font-inter font-semibold text-sm px-4 py-2 rounded transition-all duration-150">
            <Download size={16} />
            Export Config
          </button>
        </div>
      </div>

      {showBanner && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-400" />
          <p className="font-inter text-sm text-green-400">
            {isSupabaseConfigured
              ? 'Saved. The new image is live across the site for every visitor.'
              : 'Saved to this browser. Configure shared storage to show it to all visitors.'}
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
          { label: 'Uploaded', value: Object.values(images).filter((v) => typeof v === 'string' && (v.startsWith('data:') || v.includes('/storage/v1/'))).length },
          { label: 'Linked URLs', value: Object.values(images).filter((v) => typeof v === 'string' && v.startsWith('http') && !v.includes('/storage/v1/')).length },
          { label: 'Using Default', value: Object.entries(images).filter(([k, v]) => !v || v === imageMeta[k]?.defaultPath).length },
        ].map((stat) => (
          <div key={stat.label} className="dash-card p-4 text-center">
            <p className="font-oswald font-bold text-2xl text-blue-400">{stat.value}</p>
            <p className="font-inter text-xs text-slate-400 uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {imageSections.map((section) => {
        const entries = Object.entries(imageMeta).filter(([, m]) => m.section === section)
        if (entries.length === 0) return null
        return (
          <div key={section} className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="font-oswald font-bold text-lg text-white uppercase tracking-wide">{section}</h3>
              <span className="font-inter text-xs text-slate-500">{entries.length} {entries.length === 1 ? 'image' : 'images'}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {entries.map(([key, meta]) => {
                const currentUrl = resolveImageUrl(images[key] || meta.defaultPath)
                const isDrag = dragOver === key
                const isUploading = uploading === key
                return (
                  <div key={key} className="dash-card overflow-hidden flex flex-col">
                    <div
                      className={`aspect-video bg-[#0A1628] flex items-center justify-center overflow-hidden relative cursor-pointer transition-all duration-200 ${isDrag ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0A1628]' : ''}`}
                      onDragOver={(e) => handleDragOver(e, key)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, key)}
                      onClick={() => fileInputRefs.current[key]?.click()}
                    >
                      <img src={currentUrl} alt={meta.title} className={`w-full h-full object-cover transition-opacity duration-200 ${isUploading ? 'opacity-40' : 'opacity-100'}`} onError={(e) => { (e.target as HTMLImageElement).src = resolveImageUrl('/logo-lions-emblem.png') }} />
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
                        {meta.section === 'Team & Coaches' ? (
                          editingName === key ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                autoFocus
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') commitName(key); if (e.key === 'Escape') setEditingName(null) }}
                                className="flex-1 min-w-0 bg-[#0A1628] border border-blue-500/50 rounded px-2 py-1 font-inter text-sm text-white focus:outline-none focus:border-blue-400"
                                placeholder="Full name"
                              />
                              <button onClick={() => commitName(key)} className="shrink-0 w-7 h-7 flex items-center justify-center btn-gradient text-white rounded" title="Save name"><Check size={14} /></button>
                              <button onClick={() => setEditingName(null)} className="shrink-0 w-7 h-7 flex items-center justify-center bg-transparent border border-white/20 text-slate-400 hover:text-white rounded" title="Cancel"><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/name">
                              <p className="font-inter font-semibold text-sm text-white truncate">{labels[key] || meta.title}</p>
                              <button
                                onClick={() => { setNameDraft(labels[key] || meta.title); setEditingName(key) }}
                                className="shrink-0 text-slate-500 hover:text-blue-400 opacity-0 group-hover/name:opacity-100 transition-opacity"
                                title="Edit name"
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                          )
                        ) : (
                          <p className="font-inter font-semibold text-sm text-white">{meta.title}</p>
                        )}
                        <p className="font-inter text-xs text-slate-500 mt-0.5">{meta.usedOn}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fileInputRefs.current[key]?.click()}
                          disabled={isUploading}
                          className="flex-1 flex items-center justify-center gap-1.5 btn-gradient disabled:opacity-60 text-white font-inter font-semibold text-xs px-3 py-2 rounded transition-all duration-150"
                        >
                          <Upload size={14} />
                          {isUploading ? 'Uploading…' : 'Upload Image'}
                        </button>
                        <button onClick={() => handleReset(key)} className="flex items-center justify-center gap-1 bg-transparent border border-white/30 text-slate-300 hover:text-white hover:bg-white/5 font-inter font-medium text-xs px-3 py-2 rounded transition-all duration-150" title="Reset to default">
                          <RotateCcw size={14} />
                        </button>
                      </div>
                      {currentUrl.includes('/storage/v1/') ? (
                        <div className="flex items-center gap-2 text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
                          <CheckCircle size={14} />
                          <span className="font-inter text-xs">Uploaded — live for all visitors</span>
                        </div>
                      ) : currentUrl.startsWith('data:') ? (
                        <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                          <Image size={14} />
                          <span className="font-inter text-xs">Local upload (this device only)</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
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
        <div>
          <h2 className="font-oswald font-bold text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-none">Club Store</h2>
          <p className="font-inter text-sm text-slate-400 mt-1.5">Manage products, stock &amp; online orders</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 btn-gold font-inter text-sm px-4 py-2 rounded-lg transition-all"><Plus size={16} /> Add Product</button>
      </div>
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('products')} className={`px-4 py-2 font-inter text-sm rounded-md transition-all ${tab === 'products' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>Products ({products.length})</button>
        <button onClick={() => setTab('orders')} className={`px-4 py-2 font-inter text-sm rounded-md transition-all ${tab === 'orders' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>Orders ({orders.length})</button>
      </div>
      {tab === 'products' && (
        <>
          <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-white/5 border border-[#334155] rounded-lg pl-10 pr-4 py-2.5 font-inter text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500" /></div>
          <div className="dash-card overflow-x-auto">
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
        <div className="dash-card overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/[0.06]">{['Date','Customer','Items','Total','Status'].map((h) => <th key={h} className="px-4 py-3 font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/[0.06]">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-inter text-sm text-slate-300">{o.date}</td>
                  <td className="px-4 py-3"><p className="font-inter font-medium text-sm text-white">{o.customerName}</p><p className="font-inter text-xs text-slate-500">{o.customerEmail}</p></td>
                  <td className="px-4 py-3 font-inter text-sm text-slate-300">{o.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}</td>
                  <td className="px-4 py-3 font-inter font-semibold text-sm text-white">€{o.total.toFixed(2)}</td>
                  <td className="px-4 py-3"><span className={`font-inter text-xs font-medium px-2 py-0.5 rounded ${o.status === 'pending' ? 'bg-warn-500/10 text-warn-400' : o.status === 'paid' ? 'bg-green-500/10 text-green-400' : o.status === 'shipped' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>{o.status}</span></td>
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
      <div className="dash-card max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
        <div className="p-5 border-t border-white/[0.06] flex gap-3"><button onClick={onCancel} className="flex-1 bg-white/5 border border-white/[0.06] text-slate-300 font-inter font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-white/10">Cancel</button><button onClick={() => onSave(form)} disabled={!form.name.trim()} className="flex-1 btn-gradient disabled:opacity-40 text-white font-inter font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2"><Check size={16} /> Save</button></div>
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
    <div className="mgr-chat-shell">
      {/* Team list */}
      <aside className="mgr-chat-teams">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-slate-500">Teams</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scroll-slim">
          {teams.length === 0 ? (
            <p className="px-3 py-4 font-inter text-xs text-slate-500">No teams yet</p>
          ) : (
            teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => setActiveTeamId(team.id)}
                className={`mgr-chat-team-btn ${activeTeamId === team.id ? 'mgr-chat-team-btn--active' : ''}`}
              >
                <p className="mgr-chat-team-name font-inter font-medium text-sm truncate">{team.name}</p>
                <p className="font-inter text-[10px] text-slate-500 mt-0.5 truncate">{getTeamAgeDivisionLabel(team)}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Conversation */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
          <div className="min-w-0">
            <p className="font-oswald font-bold text-base text-white truncate">
              {teams.find((t) => t.id === activeTeamId)?.name || 'Select a team'}
            </p>
            <p className="font-inter text-xs text-slate-500 mt-0.5">
              {room.memberIds.length} member{room.memberIds.length !== 1 ? 's' : ''}
            </p>
          </div>
          {activeTeamId && (
            <button
              type="button"
              onClick={() => setShowMembers(true)}
              className="mgr-topbar-btn shrink-0"
              aria-label="Manage chat members"
            >
              <Users size={17} />
            </button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-slim">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[12rem] text-center">
              <MessageSquare size={32} className="text-slate-600 mb-3" />
              <p className="font-inter text-sm text-slate-400">No messages yet</p>
              <p className="font-inter text-xs text-slate-600 mt-1">Start the conversation below</p>
            </div>
          ) : (
            filtered.map((msg) => {
              const isManager = msg.senderRole === 'manager'
              return (
                <div key={msg.id} className={`flex flex-col ${isManager ? 'items-end' : 'items-start'}`}>
                  <div className={`mgr-chat-bubble ${isManager ? 'mgr-chat-bubble--manager' : 'mgr-chat-bubble--player'}`}>
                    {!isManager && (
                      <p className="font-inter font-medium text-[11px] text-lions-300/90 mb-1">{msg.senderName}</p>
                    )}
                    <p className="font-inter text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <p className={`font-inter text-[10px] mt-1.5 ${isManager ? 'text-lions-200/50 text-right' : 'text-slate-600'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="mgr-chat-composer">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={activeTeamId ? 'Write a message…' : 'Select a team first'}
            disabled={!activeTeamId}
            className="mgr-chat-input"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || !activeTeamId}
            className="mgr-chat-send"
            aria-label="Send message"
          >
            <Send size={17} />
          </button>
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
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="mgr-panel shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="mgr-panel-header">
          <div>
            <h3 className="mgr-panel-title">{teamName}</h3>
            <p className="font-inter text-xs text-slate-500 mt-0.5">{memberDetails.length} member{memberDetails.length !== 1 ? 's' : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white p-1" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="p-4 border-b border-white/[0.06]">
          <button
            type="button"
            onClick={onAddClick}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-inter text-sm font-medium text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, rgba(46,107,255,0.28), rgba(46,107,255,0.1))', border: '1px solid rgba(46,107,255,0.35)' }}
          >
            <UserPlus size={16} /> Add member
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scroll-slim">
          {memberDetails.length === 0 ? (
            <p className="text-center font-inter text-sm text-slate-400 py-8">No members in this chat yet.</p>
          ) : (
            memberDetails.map((p) => {
              const isAdmin = room.adminIds.includes(p.id)
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03]">
                  <InitialsAvatar name={p.name} size={34} />
                  <div className="flex-1 min-w-0">
                    <p className="font-inter font-medium text-sm text-white truncate">{p.name}</p>
                    <p className="font-inter text-xs text-slate-500 truncate">{p.position} · #{p.jerseyNumber}</p>
                  </div>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 bg-lions-500/10 text-lions-300 border border-lions-500/20 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded">
                      <ShieldCheck size={11} /> Admin
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleAdmin(p.id, !isAdmin)}
                    title={isAdmin ? 'Revoke admin' : 'Make admin'}
                    className="mgr-topbar-btn !h-8 !w-8"
                  >
                    <ShieldCheck size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    title="Remove from chat"
                    className="mgr-topbar-btn !h-8 !w-8 hover:!text-red-400 hover:!border-red-500/30"
                  >
                    <Trash2 size={14} />
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
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="mgr-panel shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="mgr-panel-header">
          <h3 className="mgr-panel-title">Add member</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white p-1" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="p-4 border-b border-white/[0.06]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search players…"
              className="mgr-chat-input w-full pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scroll-slim">
          {available.length === 0 ? (
            <p className="text-center font-inter text-sm text-slate-500 py-8">No players to add</p>
          ) : (
            available.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onAdd(p.id); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] text-left transition-colors"
              >
                <InitialsAvatar name={p.name} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="font-inter font-medium text-sm text-white truncate">{p.name}</p>
                  <p className="font-inter text-xs text-slate-500 truncate">{p.email}</p>
                </div>
                <UserPlus size={15} className="text-lions-400 shrink-0" />
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

      <div className="dash-card p-6 md:p-8">
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
            className="inline-flex items-center gap-2 btn-gradient disabled:opacity-40 text-white font-inter font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
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
            <span className="bg-warn-400 text-deep-navy text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">Test mode</span>
            <p className="font-inter text-xs text-blue-200/90">
              This is a Stripe test Payment Link — real money won't be charged. Use Stripe's test card <span className="font-mono">4242 4242 4242 4242</span> with any future expiry and any CVC.
            </p>
          </div>
        )}

        <div className="mt-4 bg-warn-500/5 border border-warn-500/20 rounded-lg p-4">
          <p className="font-inter text-xs text-warn-400/90">
            <strong className="text-warn-400">Note:</strong> Stripe Payment Links accept a fixed amount per link. For per-item pricing (e.g. different ticket prices), create one Payment Link per amount and switch the URL above before publishing that fixture, or upgrade to a backend Checkout Session in the future.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Membership Fees (per age group) ─── */
function PurchaseHistoryPanel() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isPurchasesDbConfigured()) {
      setLoading(false)
      return
    }
    fetchPurchases(50).then((rows) => {
      setPurchases(rows)
      setLoading(false)
    })
  }, [])

  const typeLabel: Record<string, string> = {
    store: 'Store',
    ticket: 'Ticket',
    membership: 'Membership',
  }

  return (
    <div className="dash-card overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="font-inter font-semibold text-lg text-white">Stripe purchase history</h3>
        <p className="font-inter text-sm text-slate-400 mt-1">
          {isPurchasesDbConfigured()
            ? 'All card payments confirmed via Stripe Checkout.'
            : 'Connect Supabase and run purchases-setup.sql to enable purchase history.'}
        </p>
      </div>
      {loading ? (
        <p className="p-6 font-inter text-sm text-slate-500 text-center">Loading purchases…</p>
      ) : purchases.length === 0 ? (
        <p className="p-6 font-inter text-sm text-slate-500 text-center">No Stripe purchases yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Date', 'Customer', 'Type', 'Items', 'Amount', 'Status'].map((col) => (
                  <th key={col} className="px-6 py-3 font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 font-inter text-sm text-slate-300">
                    {new Date(p.paid_at || p.created_at).toLocaleDateString('en-IE')}
                  </td>
                  <td className="px-6 py-3">
                    <p className="font-inter text-sm text-white">{p.customer_name}</p>
                    <p className="font-inter text-xs text-slate-500">{p.customer_email}</p>
                  </td>
                  <td className="px-6 py-3 font-inter text-sm text-slate-300">{typeLabel[p.purchase_type] || p.purchase_type}</td>
                  <td className="px-6 py-3 font-inter text-sm text-slate-400 max-w-[200px] truncate">
                    {(p.items as { name: string; quantity: number }[]).map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                  </td>
                  <td className="px-6 py-3 font-inter text-sm text-white">€{(p.amount_cents / 100).toFixed(2)}</td>
                  <td className="px-6 py-3"><StatusBadge status={p.status === 'paid' ? 'succeeded' : p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MembershipFeesPanel({ ageGroups, teams }: { ageGroups: AgeGroup[]; teams: Team[] }) {
  const [fees, setFeesState] = useState<MembershipFeeConfigMap>(() => {
    const cfg = getMembershipFeeConfig()
    const merged = { ...cfg }
    for (const g of ageGroups) {
      if (!merged[g.id]) merged[g.id] = { monthly: 0, oneTime: 0 }
    }
    return merged
  })
  const [selected, setSelected] = useState<Set<string>>(() => new Set(ageGroups.map((g) => g.id)))
  const [bulkMonthly, setBulkMonthly] = useState('')
  const [bulkOneTime, setBulkOneTime] = useState('')
  const [saved, setSaved] = useState(false)

  // Stay in sync when manager adds age groups under Teams.
  useEffect(() => {
    setFeesState((prev) => {
      const next = { ...prev }
      for (const g of ageGroups) {
        if (!next[g.id]) next[g.id] = { monthly: 0, oneTime: 0 }
      }
      return next
    })
    setSelected((prev) => {
      const next = new Set(prev)
      for (const g of ageGroups) {
        if (!next.has(g.id)) next.add(g.id)
      }
      return next
    })
  }, [ageGroups])

  const teamCountFor = (ageGroupId: string) => teams.filter((t) => t.ageGroupId === ageGroupId).length

  const toggleGroup = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) => (prev.size === ageGroups.length ? new Set() : new Set(ageGroups.map((g) => g.id))))
  }

  const updateFee = (id: string, field: keyof AgeGroupFeeConfig, value: number) => {
    setFeesState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const applyBulk = () => {
    const monthly = bulkMonthly !== '' ? Number(bulkMonthly) : undefined
    const oneTime = bulkOneTime !== '' ? Number(bulkOneTime) : undefined
    if (monthly === undefined && oneTime === undefined) return
    const targets = selected.size > 0 ? [...selected] : ageGroups.map((g) => g.id)
    setFeesState((prev) => {
      const next = { ...prev }
      for (const id of targets) {
        const cur = next[id] ?? { monthly: 0, oneTime: 0 }
        next[id] = {
          monthly: monthly !== undefined ? monthly : cur.monthly,
          oneTime: oneTime !== undefined ? oneTime : cur.oneTime,
        }
      }
      return next
    })
  }

  const save = () => {
    setMembershipFeeConfig(fees)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="mgr-panel p-6 md:p-8">
      <div className="flex items-start gap-3 mb-6">
        <Euro size={22} className="text-lions-400 mt-1 shrink-0" />
        <div>
          <h3 className="mgr-panel-title">Membership fees</h3>
          <p className="font-inter text-sm text-slate-500 mt-1">
            Linked to your age groups from Teams — add a group there and it appears here automatically. Player fees are based on their team&apos;s age group.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 mb-6">
        <p className="font-inter text-xs uppercase tracking-[0.16em] text-slate-500 mb-3">Apply to selected groups</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" onClick={toggleAll} className="mgr-topbar-btn !w-auto !h-auto px-3 py-1.5 font-inter text-xs">
            {selected.size === ageGroups.length ? 'Deselect all' : 'Select all'}
          </button>
          {ageGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleGroup(g.id)}
              className={`rounded-lg px-3 py-1.5 font-inter text-xs border transition-colors ${
                selected.has(g.id)
                  ? 'border-lions-400/40 bg-lions-500/15 text-lions-200'
                  : 'border-white/[0.08] text-slate-500 hover:text-white'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-inter text-xs text-slate-500 mb-1">Monthly (€)</label>
            <input type="number" min={0} value={bulkMonthly} onChange={(e) => setBulkMonthly(e.target.value)} placeholder="e.g. 45" className="mgr-chat-input w-full" />
          </div>
          <div>
            <label className="block font-inter text-xs text-slate-500 mb-1">One-time (€)</label>
            <input type="number" min={0} value={bulkOneTime} onChange={(e) => setBulkOneTime(e.target.value)} placeholder="e.g. 40" className="mgr-chat-input w-full" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={applyBulk} className="w-full rounded-lg px-4 py-2.5 font-inter text-sm font-medium text-white border border-lions-400/35 bg-lions-500/15 hover:bg-lions-500/25 transition-colors">
              Apply to {selected.size || ageGroups.length} group{(selected.size || ageGroups.length) !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2 font-inter text-[10px] uppercase tracking-[0.16em] text-slate-500">Age group</th>
              <th className="text-left py-2 font-inter text-[10px] uppercase tracking-[0.16em] text-slate-500">Teams</th>
              <th className="text-left py-2 font-inter text-[10px] uppercase tracking-[0.16em] text-slate-500">Monthly (€)</th>
              <th className="text-left py-2 font-inter text-[10px] uppercase tracking-[0.16em] text-slate-500">One-time (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {ageGroups.map((g) => (
              <tr key={g.id} className={selected.has(g.id) ? 'bg-lions-500/[0.04]' : ''}>
                <td className="py-3 pr-4">
                  <button type="button" onClick={() => toggleGroup(g.id)} className="flex items-center gap-2 font-inter text-sm text-white">
                    <span className={`h-4 w-4 rounded border flex items-center justify-center ${selected.has(g.id) ? 'border-lions-400 bg-lions-500/30' : 'border-white/20'}`}>
                      {selected.has(g.id) && <Check size={10} className="text-white" />}
                    </span>
                    {g.name}
                  </button>
                </td>
                <td className="py-3 pr-3 font-inter text-xs text-slate-500">
                  {teamCountFor(g.id)} team{teamCountFor(g.id) !== 1 ? 's' : ''}
                </td>
                <td className="py-3 pr-3">
                  <input
                    type="number"
                    min={0}
                    value={fees[g.id]?.monthly ?? 0}
                    onChange={(e) => updateFee(g.id, 'monthly', Number(e.target.value))}
                    className="mgr-chat-input w-24"
                  />
                </td>
                <td className="py-3">
                  <input
                    type="number"
                    min={0}
                    value={fees[g.id]?.oneTime ?? 0}
                    onChange={(e) => updateFee(g.id, 'oneTime', Number(e.target.value))}
                    className="mgr-chat-input w-24"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={save}
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-inter text-sm font-semibold text-white transition-colors"
        style={{ background: 'linear-gradient(135deg, #2E6BFF, #1B52E6)' }}
      >
        {saved ? <><Check size={16} /> Saved</> : 'Save all fees'}
      </button>
    </div>
  )
}

/* ─────────────────────── Access Denied ─────────────────────── */

function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="dashboard-shell min-h-[100dvh] flex items-center justify-center px-4">
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
          className="btn-gradient text-white font-inter font-semibold text-sm uppercase tracking-widest px-8 py-4 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('dlbc_sidebar_collapsed') === '1')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const data = useLiveData()

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('dlbc_sidebar_collapsed', next ? '1' : '0')
      return next
    })
  }, [])

  // Global ⌘K / Ctrl+K to open the command palette.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
      <div className="dashboard-shell min-h-[100dvh] flex items-center justify-center">
        <Loader2 size={32} className="text-amber-400 animate-spin" />
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

  const commands: CommandItem[] = [
    ...navSections.flatMap((group) =>
      group.items.map((item) => ({
        id: `nav-${item.key}`,
        label: item.label,
        hint: 'Go to',
        group: 'Navigate',
        icon: item.icon,
        keywords: group.section,
        run: () => setActiveView(item.key),
      })),
    ),
    { id: 'nav-settings', label: 'Settings', hint: 'Go to', group: 'Navigate', icon: Settings, run: () => setActiveView('settings') },
    { id: 'act-add-payment', label: 'Record Cash Payment', group: 'Quick actions', icon: Banknote, keywords: 'money fee', run: () => setActiveView('payments') },
    { id: 'act-send-message', label: 'Send Announcement', group: 'Quick actions', icon: Send, keywords: 'chat message team', run: () => setActiveView('chat') },
    { id: 'act-add-fixture', label: 'Add Fixture', group: 'Quick actions', icon: Calendar, keywords: 'schedule match game', run: () => setActiveView('schedule') },
    { id: 'act-report', label: 'Generate Report', group: 'Quick actions', icon: FileText, keywords: 'export pdf stats', run: () => setActiveView('reports') },
  ]

  const mainOffset = sidebarCollapsed ? 'md:ml-[4.75rem]' : 'md:ml-64'

  return (
    <div className="dashboard-shell min-h-[100dvh]">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <Sidebar
        active={activeView}
        onNavigate={setActiveView}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <TopBar
        title={viewTitles[activeView] || 'Dashboard'}
        onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        notifications={notifications}
        onDismissNotification={(id) => setDismissedIds((prev) => new Set(prev).add(id))}
        onClearNotifications={() => setDismissedIds(new Set(derivedNotifications.map((n) => n.id)))}
        sidebarCollapsed={sidebarCollapsed}
        onQuickAction={(action) => {
          if (action === 'add-payment') setActiveView('payments')
          else if (action === 'send-message') setActiveView('chat')
          else if (action === 'add-fixture') setActiveView('schedule')
        }}
      />

      <main className={`ml-0 ${mainOffset} mt-14 min-h-[calc(100dvh-3.5rem)] p-5 md:p-7 scroll-slim transition-[margin] duration-300`} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div key={activeView} className="dash-view-enter max-w-[1600px] mx-auto">
        {activeView === 'dashboard' && <DashboardView data={data} onNavigate={setActiveView} />}
        {activeView === 'members' && <MembersView data={data} />}
        {activeView === 'payments' && <PaymentsView data={data} />}
        {activeView === 'teams' && <TeamsView data={data} />}
        {activeView === 'schedule' && <ScheduleView data={data} />}
        {activeView === 'chat' && <ChatView data={data} />}
        {activeView === 'reports' && <ReportsView data={data} />}
        {activeView === 'images' && <ImagesView />}
        {activeView === 'store' && <StoreManagerView />}
        {activeView === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  )
}
