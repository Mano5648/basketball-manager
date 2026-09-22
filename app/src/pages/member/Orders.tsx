import { Package, Receipt } from 'lucide-react'
import { listAll, type Order, type Purchase } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { useAuth } from '@/lib/AuthContext'
import { fmtDateTime, money } from '@/lib/format'
import { Badge, Card, Empty, PageHeader, Spinner } from '@/components/ui'

const TONE: Record<string, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = { paid: 'green', fulfilled: 'blue', pending: 'amber', refunded: 'slate', cancelled: 'red', failed: 'red' }
const TYPE_LABEL: Record<string, string> = { store: 'Shop order', ticket: 'Match tickets', membership: 'Membership', lotto: 'Lotto tickets', booking: 'Facility booking' }

export default function OrdersPage() {
  const { user, profile } = useAuth()
  const q = useLiveQuery(async () => {
    const [orders, purchases] = await Promise.all([
      user ? listAll<Order>('orders', 'created_at', false, (x) => x.eq('profile_id', user.id)) : Promise.resolve([] as Order[]),
      profile ? listAll<Purchase>('purchases', 'created_at', false, (x) => x.ilike('customer_email', profile.email).neq('purchase_type', 'store')) : Promise.resolve([] as Purchase[]),
    ])
    return { orders, purchases }
  }, ['orders', 'purchases'], [user?.id])

  const rows = [
    ...(q.data?.orders ?? []).filter((o) => o.status !== 'pending').map((o) => ({ id: o.id, when: o.created_at, title: 'Shop order', lines: o.items.map((i) => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ''}`), amount: o.total_cents, status: o.status })),
    ...(q.data?.purchases ?? []).filter((p) => p.status !== 'pending').map((p) => ({ id: p.id, when: p.created_at, title: TYPE_LABEL[p.purchase_type] ?? p.purchase_type, lines: (p.items ?? []).map((i) => `${i.quantity}× ${i.name}`), amount: p.amount_cents, status: p.status })),
  ].sort((a, b) => b.when.localeCompare(a.when))

  return (
    <div>
      <PageHeader title="Purchases" subtitle="Orders, tickets & receipts" back="/app/more" />
      {q.loading && !q.data ? <Spinner /> : rows.length === 0 ? <Empty icon={<Receipt />} title="No purchases yet" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} testId={`purchase-${r.id}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold"><Package size={15} className="text-lions-300" /> {r.title}</p>
                <Badge tone={TONE[r.status] ?? 'slate'}>{r.status}</Badge>
              </div>
              <p className="text-xs text-slate-400">{r.lines.join(' · ')}</p>
              <div className="flex items-center justify-between text-xs text-slate-500"><span>{fmtDateTime(r.when)}</span><span className="text-sm font-bold text-white">{money(r.amount)}</span></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
