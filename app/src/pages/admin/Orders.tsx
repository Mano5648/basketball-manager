import { useState } from 'react'
import { Package, RotateCcw } from 'lucide-react'
import { listAll, sb, type Order, type Purchase } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { fmtDateTime, money } from '@/lib/format'
import { refundPurchase } from '@/lib/stripeCheckout'
import { Alert, Badge, Button, Card, Empty, PageHeader, Sheet, Spinner, cx } from '@/components/ui'

const TONE: Record<string, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = { paid: 'green', fulfilled: 'blue', pending: 'amber', refunded: 'slate', cancelled: 'red', failed: 'red' }

export function AdminOrders() {
  const [tab, setTab] = useState<'orders' | 'payments'>('orders')
  const [sel, setSel] = useState<Purchase | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const q = useLiveQuery(async () => {
    const [orders, purchases] = await Promise.all([
      listAll<Order>('orders', 'created_at', false, (x) => x.neq('status', 'pending').limit(200)),
      listAll<Purchase>('purchases', 'created_at', false, (x) => x.neq('status', 'pending').limit(300)),
    ])
    return { orders, purchases }
  }, ['orders', 'purchases'])

  const setOrderStatus = async (o: Order, status: Order['status']) => {
    setErr(null)
    const { error } = await sb().from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', o.id)
    if (error) setErr(error.message)
    void q.refresh()
  }
  const refund = async (p: Purchase) => {
    const reason = prompt(`Refund ${money(p.amount_cents)} to ${p.customer_email}? Enter a reason (optional):`)
    if (reason === null) return
    setBusy(true); setErr(null)
    try { await refundPurchase(p.id, reason || undefined); setSel(null) } catch (e) { setErr(e instanceof Error ? e.message : 'Refund failed') } finally { setBusy(false); void q.refresh() }
  }
  const purchaseForOrder = (o: Order) => q.data?.purchases.find((p) => p.id === o.purchase_id || p.reference_id === o.id)

  return (
    <div>
      <PageHeader title="Orders & payments" subtitle="Fulfil shop orders and issue refunds" />
      <div className="mb-4 flex gap-1 rounded-full bg-line/[0.05] p-1">
        {(['orders', 'payments'] as const).map((t) => <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)} className={cx('flex-1 rounded-full py-2 text-sm font-semibold capitalize', tab === t ? 'bg-lions-500 text-white' : 'text-muted')}>{t}</button>)}
      </div>
      {err && <div className="mb-3"><Alert testId="orders-error">{err}</Alert></div>}
      {q.loading && !q.data ? <Spinner /> : tab === 'orders' ? (
        !q.data?.orders.length ? <Empty icon={<Package />} title="No shop orders yet" /> : (
          <div className="space-y-2">
            {q.data.orders.map((o) => (
              <Card key={o.id} testId={`order-${o.id}`} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{o.customer_name} <span className="text-subtle">· {o.customer_email}</span></p><p className="text-xs text-muted">{fmtDateTime(o.created_at)} · {money(o.total_cents)}</p></div>
                  <Badge tone={TONE[o.status]}>{o.status}</Badge>
                </div>
                <ul className="text-sm text-muted">{o.items.map((i, n) => <li key={n}>{i.quantity}× {i.name}{i.size ? ` (${i.size})` : ''}</li>)}</ul>
                {o.delivery_note && <p className="rounded-lg bg-line/[0.04] px-2.5 py-1.5 text-xs text-muted">Note: {o.delivery_note}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {o.status === 'paid' && <Button data-testid={`order-fulfil-${o.id}`} size="sm" onClick={() => setOrderStatus(o, 'fulfilled')}>Mark fulfilled</Button>}
                  {o.status === 'fulfilled' && <Button size="sm" variant="ghost" onClick={() => setOrderStatus(o, 'paid')}>Undo fulfil</Button>}
                  {(o.status === 'paid' || o.status === 'fulfilled') && purchaseForOrder(o) && <Button data-testid={`order-refund-${o.id}`} size="sm" variant="danger" onClick={() => setSel(purchaseForOrder(o)!)}><RotateCcw size={14} /> Refund</Button>}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : !q.data?.purchases.length ? <Empty title="No payments yet" /> : (
        <div className="space-y-2">
          {q.data.purchases.map((p) => (
            <Card key={p.id} testId={`payment-${p.id}`} onClick={() => setSel(p)} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.customer_name} <span className="text-subtle">· {p.customer_email}</span></p><p className="text-xs text-muted">{p.purchase_type} · {(p.items ?? []).map((i) => `${i.quantity}× ${i.name}`).join(', ')} · {fmtDateTime(p.paid_at ?? p.created_at)}</p></div>
              <span className="text-sm font-bold">{money(p.amount_cents)}</span>
              <Badge tone={TONE[p.status] ?? 'slate'}>{p.status}</Badge>
            </Card>
          ))}
        </div>
      )}
      <Sheet open={!!sel} onClose={() => setSel(null)} title="Payment" testId="payment-sheet">
        {sel && (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">{sel.customer_name} · {sel.customer_email}</p>
            <p className="text-muted">{sel.purchase_type} · {fmtDateTime(sel.paid_at ?? sel.created_at)}</p>
            <ul className="text-muted">{(sel.items ?? []).map((i, n) => <li key={n}>{i.quantity}× {i.name} — {money(i.amountCents * i.quantity)}</li>)}</ul>
            <p className="font-display text-2xl font-bold">{money(sel.amount_cents)} <Badge tone={TONE[sel.status] ?? 'slate'} className="ml-2 align-middle">{sel.status}</Badge></p>
            {err && <Alert>{err}</Alert>}
            {sel.status === 'paid' && <Button data-testid="payment-refund-btn" variant="danger" loading={busy} onClick={() => refund(sel)}><RotateCcw size={14} /> Refund via Stripe</Button>}
          </div>
        )}
      </Sheet>
    </div>
  )
}
