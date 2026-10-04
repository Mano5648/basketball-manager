import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Bell, CalendarDays, Home, LayoutGrid, ShoppingBag, Trophy, ShieldCheck } from 'lucide-react'
import { useClub } from '@/lib/ClubContext'
import { useAuth } from '@/lib/AuthContext'
import { cx } from './ui'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { sb } from '@/lib/db'

function useUnreadCount(userId: string | undefined) {
  const q = useLiveQuery(async () => {
    if (!userId) return 0
    const [{ data: notes }, { data: reads }] = await Promise.all([
      sb().from('notifications').select('id'),
      sb().from('notification_reads').select('notification_id').eq('profile_id', userId),
    ])
    const read = new Set((reads ?? []).map((r) => r.notification_id))
    return (notes ?? []).filter((n) => !read.has(n.id)).length
  }, ['notifications', 'notification_reads'], [userId])
  return q.data ?? 0
}

export default function AppShell() {
  const { settings, isFeatureOn } = useClub()
  const { user, role } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const unread = useUnreadCount(user?.id)

  const tabs = [
    { to: '/app', label: 'Home', icon: Home, end: true, show: true },
    { to: '/app/events', label: 'Events', icon: CalendarDays, show: isFeatureOn('events') },
    { to: '/app/fixtures', label: 'Fixtures', icon: Trophy, show: isFeatureOn('fixtures') },
    { to: '/app/shop', label: 'Shop', icon: ShoppingBag, show: isFeatureOn('shop') },
    { to: '/app/more', label: 'More', icon: LayoutGrid, show: true },
  ].filter((t) => t.show)

  return (
    <div className="min-h-[100dvh] bg-app text-fg">
      <header className="sticky top-0 z-30 border-b border-line/[0.06] bg-app/85 backdrop-blur-xl pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <button data-testid="header-club" onClick={() => nav('/app')} className="flex items-center gap-2.5">
            <img src={settings?.logo_url || './logo-lions-emblem.png'} alt="" className="h-9 w-9 rounded-lg bg-white object-contain" />
            <span className="font-display text-[15px] font-bold tracking-tight">{settings?.club_name ?? 'Club'}</span>
          </button>
          <div className="flex items-center gap-1">
            {role === 'manager' && (
              <button data-testid="header-admin-btn" onClick={() => nav('/admin')} className="rounded-full p-2 text-lions-300 hover:bg-line/10" aria-label="Admin"><ShieldCheck size={20} /></button>
            )}
            {user ? (
              <button data-testid="header-inbox-btn" onClick={() => nav('/app/inbox')} className="relative rounded-full p-2 text-muted hover:bg-line/10" aria-label="Notifications">
                <Bell size={20} />
                {unread > 0 && <span data-testid="inbox-unread-badge" className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold">{unread > 9 ? '9+' : unread}</span>}
              </button>
            ) : (
              <button data-testid="header-signin-btn" onClick={() => nav('/login')} className="rounded-full px-3 py-1.5 text-sm font-semibold text-lions-300 hover:bg-line/10">Sign in</button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav data-testid="bottom-tabs" className="fixed inset-x-0 bottom-0 z-30 border-t border-line/[0.06] bg-surface2/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} data-testid={`tab-${t.label.toLowerCase()}`} className={({ isActive }) => cx('flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors duration-300', isActive ? 'text-lions-300' : 'text-subtle hover:text-muted')}>
              {({ isActive }) => (
                <>
                  <span className="relative inline-flex rounded-full px-4 py-1">
                    {isActive && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-full bg-lions-500/20 ring-1 ring-lions-400/20"
                        transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.7 }}
                      />
                    )}
                    <motion.span
                      className="relative"
                      animate={{ scale: isActive ? 1.16 : 1, y: isActive ? -2 : 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18, mass: 0.6 }}
                    >
                      <t.icon size={20} />
                    </motion.span>
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
