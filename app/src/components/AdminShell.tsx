import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Bell, CalendarDays, Dumbbell, Home, LayoutDashboard, LogOut, Menu, MessageSquare, Newspaper, Package, Settings, ShoppingBag, Ticket, Trophy, UserCog, Users, X, CreditCard } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { cx } from './ui'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/news', label: 'News', icon: Newspaper },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/fixtures', label: 'Fixtures & Results', icon: Trophy },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/teams', label: 'Teams', icon: UserCog },
  { to: '/admin/memberships', label: 'Memberships', icon: CreditCard },
  { to: '/admin/lotto', label: 'Club Lotto', icon: Ticket },
  { to: '/admin/facilities', label: 'Facilities', icon: Dumbbell },
  { to: '/admin/products', label: 'Shop Products', icon: ShoppingBag },
  { to: '/admin/orders', label: 'Orders & Payments', icon: Package },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminShell() {
  const [open, setOpen] = useState(false)
  const { signOut, profile } = useAuth()
  const { settings } = useClub()
  const nav = useNavigate()

  const menu = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} data-testid={`admin-nav-${n.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}
          className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-lions-500/15 text-lions-200' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
          <n.icon size={18} /> {n.label}
        </NavLink>
      ))}
      <div className="mt-auto border-t border-white/[0.06] pt-3">
        <button data-testid="admin-view-app" onClick={() => nav('/app')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"><Home size={18} /> Member view</button>
        <button data-testid="admin-signout" onClick={() => void signOut().then(() => nav('/login'))} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"><LogOut size={18} /> Sign out</button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-[100dvh] bg-[#070C16] text-white">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0a1120] lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src={settings?.logo_url || './logo-lions-emblem.png'} alt="" className="h-9 w-9 rounded-full object-cover" />
          <div><p className="font-display text-sm font-bold">{settings?.club_name}</p><p className="text-[11px] uppercase tracking-widest text-lions-300">Admin</p></div>
        </div>
        {menu}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[#0a1120] pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-4 py-4"><p className="font-display font-bold">Admin</p><button onClick={() => setOpen(false)} className="p-2 text-slate-400"><X size={20} /></button></div>
            {menu}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#070C16]/85 px-4 backdrop-blur-xl pt-[env(safe-area-inset-top)] lg:hidden">
          <button data-testid="admin-menu-btn" onClick={() => setOpen(true)} className="rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label="Menu"><Menu size={22} /></button>
          <p className="font-display text-sm font-bold">{settings?.club_name} · Admin</p>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-16 lg:px-8">
          <Outlet />
        </main>
        <p className="px-4 pb-4 text-center text-[11px] text-slate-600">Signed in as {profile?.email}</p>
      </div>
    </div>
  )
}
