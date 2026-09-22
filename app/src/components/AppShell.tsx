import { Outlet, NavLink, useNavigate } from 'react-router-dom'
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
  const unread = useUnreadCount(user?.id)

  const tabs = [
    { to: '/app', label: 'Home', icon: Home, end: true, show: true },
    { to: '/app/events', label: 'Events', icon: CalendarDays, show: isFeatureOn('events') },
    { to: '/app/fixtures', label: 'Fixtures', icon: Trophy, show: isFeatureOn('fixtures') },
    { to: '/app/shop', label: 'Shop', icon: ShoppingBag, show: isFeatureOn('shop') },
    { to: '/app/more', label: 'More', icon: LayoutGrid, show: true },
  ].filter((t) => t.show)

  return (
    <div className="min-h-[100dvh] bg-[#070C16] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070C16]/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <button data-testid="header-club" onClick={() => nav('/app')} className="flex items-center gap-2.5">
            {settings?.logo_url ? <img src={settings.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <img src="./logo-lions-emblem.png" alt="" className="h-8 w-8 rounded-full object-cover" />}
            <span className="font-display text-[15px] font-bold tracking-tight">{settings?.club_name ?? 'Club'}</span>
          </button>
          <div className="flex items-center gap-1">
            {role === 'manager' && (
              <button data-testid="header-admin-btn" onClick={() => nav('/admin')} className="rounded-full p-2 text-lions-300 hover:bg-white/10" aria-label="Admin"><ShieldCheck size={20} /></button>
            )}
            <button data-testid="header-inbox-btn" onClick={() => nav('/app/inbox')} className="relative rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label="Notifications">
              <Bell size={20} />
              {unread > 0 && <span data-testid="inbox-unread-badge" className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold">{unread > 9 ? '9+' : unread}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5">
        <Outlet />
      </main>

      <nav data-testid="bottom-tabs" className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-[#0a1120]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} data-testid={`tab-${t.label.toLowerCase()}`} className={({ isActive }) => cx('flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors', isActive ? 'text-lions-300' : 'text-slate-500 hover:text-slate-300')}>
              {({ isActive }) => (
                <>
                  <span className={cx('rounded-full px-4 py-1 transition-colors', isActive && 'bg-lions-500/15')}><t.icon size={20} /></span>
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
