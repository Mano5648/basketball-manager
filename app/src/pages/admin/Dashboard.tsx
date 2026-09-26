import { useNavigate } from 'react-router-dom'
import { Bell, CalendarPlus, CreditCard, Newspaper, Package, ShieldCheck, Smartphone, Users, Wallet } from 'lucide-react'
import { listAll, sb, type Order, type Purchase } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { fmtDateTime, money } from '@/lib/format'
import { Badge, Card, PageHeader, Spinner } from '@/components/ui'

type Stats = { members: number; children: number; active_memberships: number; pending_orders: number; revenue_cents: number; upcoming_events: number; push_devices: number }

export default function AdminDashboard() {
  const nav = useNavigate()
  const q = useLiveQuery(async () => {
    const [{ data: stats }, orders, purchases] = await Promise.all([
      sb().rpc('admin_stats'),
      listAll<Order>('orders', 'created_at', false, (x) => x.eq('status', 'paid').limit(5)),
      listAll<Purchase>('purchases', 'created_at', false, (x) => x.eq('status', 'paid').limit(8)),
    ])
    return { stats: stats as Stats, orders, purchases }
  }, ['orders', 'purchases', 'profiles', 'memberships'])

  const s = q.data?.stats
  const tiles = [
    { label: 'Members', value: s?.members ?? 0, icon: Users, to: '/admin/members' },
    { label: 'Active memberships', value: s?.active_memberships ?? 0, icon: ShieldCheck, to: '/admin/memberships' },
    { label: 'Orders to fulfil', value: s?.pending_orders ?? 0, icon: Package, to: '/admin/orders' },
    { label: 'Revenue (paid)', value: money(s?.revenue_cents ?? 0), icon: Wallet, to: '/admin/reports' },
    { label: 'Upcoming events', value: s?.upcoming_events ?? 0, icon: CalendarPlus, to: '/admin/events' },
    { label: 'Push devices', value: s?.push_devices ?? 0, icon: Smartphone, to: '/admin/notifications' },
  ]
  const quick = [
    { label: 'Post news', icon: Newspaper, to: '/admin/news' },
    { label: 'Add event', icon: CalendarPlus, to: '/admin/events' },
    { label: 'Send notification', icon: Bell, to: '/admin/notifications' },
    { label: 'Membership packages', icon: CreditCard, to: '/admin/memberships' },
  ]

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" subtitle="Club at a glance" />
      {q.loading && !q.data ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {tiles.map((t) => (
              <Card key={t.label} testId={`stat-${t.label.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => nav(t.to)} className="space-y-2">
                <t.icon size={18} className="text-lions-300" />
                <p className="font-display text-2xl font-bold">{t.value}</p>
                <p className="text-xs text-muted">{t.label}</p>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quick.map((qk) => <button key={qk.label} data-testid={`quick-${qk.label.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => nav(qk.to)} className="flex items-center gap-2 rounded-xl border border-lions-500/30 bg-lions-500/10 px-3 py-2.5 text-sm font-semibold text-lions-100 hover:bg-lions-500/20"><qk.icon size={16} /> {qk.label}</button>)}
          </div>
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Recent payments</h2>
            {!q.data?.purchases.length ? <p className="text-sm text-subtle">No payments yet.</p> : q.data.purchases.map((p) => (
              <Card key={p.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.customer_name} <span className="text-subtle">· {p.customer_email}</span></p><p className="text-xs text-muted">{p.purchase_type} · {fmtDateTime(p.paid_at ?? p.created_at)}</p></div>
                <Badge tone="green">{money(p.amount_cents)}</Badge>
              </Card>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
