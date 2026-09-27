import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart3, Bell, CalendarDays, Dumbbell, Home, LayoutDashboard, Handshake, LogOut, Menu, Moon, Newspaper, Package, Settings, ShoppingBag, Sun, Ticket, Trophy, UserCog, Users, X, CreditCard } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { useTheme } from '@/lib/ThemeContext'
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
  { to: '/admin/sponsors', label: 'Sponsors', icon: Handshake },
  { to: '/admin/orders', label: 'Orders & Payments', icon: Package },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminShell() {
  const [open, setOpen] = useState(false)
  const { signOut, profile } = useAuth()
  const { settings } = useClub()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()

  const menu = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} data-testid={`admin-nav-${n.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}
          className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-lions-500/15 text-lions-200' : 'text-muted hover:bg-line/5 hover:text-fg')}>
          <n.icon size={18} /> {n.label}
        </NavLink>
      ))}
      <div className="mt-auto border-t border-line/[0.06] pt-3">
        <button data-testid="admin-theme-toggle" onClick={toggle} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-line/5 hover:text-fg">
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          <span className="flex-1 text-left">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
          <span className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors', theme === 'light' ? 'bg-lions-500' : 'bg-line/20')}>
            {/* Travel is track - knob - both insets (36 - 16 - 4 = 16px), so the
                knob always lands inside the track. */}
            <span className={cx('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200', theme === 'light' ? 'translate-x-4' : 'translate-x-0')} />
          </span>
        </button>
        <button data-testid="admin-view-app" onClick={() => nav('/app')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-line/5 hover:text-fg"><Home size={18} /> Member view</button>
        <button data-testid="admin-signout" onClick={() => void signOut().then(() => nav('/login'))} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-line/5 hover:text-fg"><LogOut size={18} /> Sign out</button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-[100dvh] bg-app text-fg">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line/[0.06] bg-surface2 lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src={settings?.logo_url || './logo-lions-emblem.png'} alt="" className="h-9 w-9 rounded-lg bg-white object-contain" />
          <div><p className="font-display text-sm font-bold">{settings?.club_name}</p><p className="text-[11px] uppercase tracking-widest text-lions-300">Admin</p></div>
        </div>
        {menu}
      </aside>

      <AnimatePresence>
        {open && (
          <motion.div key="admin-drawer" className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface2 shadow-2xl shadow-black/60 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.8 }}
            >
              <div className="flex items-center justify-between px-4 py-4"><p className="font-display font-bold">Admin</p><button onClick={() => setOpen(false)} className="p-2 text-muted"><X size={20} /></button></div>
              {menu}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-line/[0.06] bg-app/85 px-4 pb-2 backdrop-blur-xl pt-[calc(env(safe-area-inset-top)+0.75rem)] lg:hidden">
          <button data-testid="admin-menu-btn" onClick={() => setOpen(true)} className="rounded-full p-2 text-muted hover:bg-line/10" aria-label="Menu"><Menu size={22} /></button>
          <p className="font-display text-sm font-bold">{settings?.club_name} · Admin</p>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-16 lg:px-8">
          <Outlet />
        </main>
        <p className="px-4 pb-4 text-center text-[11px] text-subtle">Signed in as {profile?.email}</p>
      </div>
    </div>
  )
}
