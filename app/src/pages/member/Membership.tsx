import { useState } from 'react'
import { Baby, CreditCard, ShieldCheck } from 'lucide-react'
import { listAll, type Membership, type MembershipPackage } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { fmtDate, money } from '@/lib/format'
import { isStripeCheckoutConfigured, startCheckout } from '@/lib/stripeCheckout'
import { Alert, Badge, Button, Card, Empty, Field, PageHeader, Select, Sheet, Spinner } from '@/components/ui'

export default function MembershipPage() {
  const { profile, user } = useAuth()
  const { children } = useClub()
  const [buying, setBuying] = useState<MembershipPackage | null>(null)
  const [forChild, setForChild] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const q = useLiveQuery(async () => {
    const [packages, mine] = await Promise.all([
      listAll<MembershipPackage>('membership_packages', 'sort_order', true, (x) => x.eq('active', true)),
      user ? listAll<Membership>('memberships', 'expires_at', false, (x) => x.eq('profile_id', user.id)) : Promise.resolve([] as Membership[]),
    ])
    return { packages, mine }
  }, ['membership_packages', 'memberships'], [user?.id])

  const visible = (q.data?.packages ?? []).filter((p) => {
    if (p.audience === 'any') return true
    if (p.audience === 'child') return profile?.member_type === 'parent' || children.length > 0
    if (p.audience === 'adult') return profile?.member_type === 'adult'
    return true
  })
  const childName = (id: string | null) => children.find((c) => c.id === id)?.full_name
  const today = new Date().toISOString().slice(0, 10)
  const active = (q.data?.mine ?? []).filter((m) => m.status === 'active' && m.expires_at >= today)

  const openBuy = (p: MembershipPackage) => {
    setErr(null)
    if (p.audience === 'child' && children.length === 0) { setErr('Add your child in Profile first, then buy their membership.'); return }
    setForChild(p.audience === 'child' ? children[0]?.id ?? '' : '')
    setBuying(p)
  }
  const pay = async () => {
    if (!profile || !buying) return
    setBusy(true); setErr(null)
    try {
      const metadata: Record<string, string> = { package_id: buying.id }
      if (forChild) metadata.child_id = forChild
      await startCheckout({ purchaseType: 'membership', referenceId: buying.id, customerName: profile.full_name || profile.email, customerEmail: profile.email, metadata })
    } catch (e) { setErr(e instanceof Error ? e.message : 'Checkout failed') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Membership" subtitle="Join or renew" back="/app/more" />
      {q.loading && !q.data ? <Spinner /> : (
        <>
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Your memberships</h2>
            {active.length === 0 ? <Empty icon={<ShieldCheck />} title="No active membership" hint="Pick a package below to join." /> : active.map((m) => (
              <Card key={m.id} testId={`membership-${m.id}`} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><ShieldCheck size={18} /></div>
                <div className="flex-1"><p className="text-sm font-semibold">{m.package_name}</p><p className="text-xs text-muted">{m.child_id ? `${childName(m.child_id) ?? 'Child'} · ` : ''}Valid until {fmtDate(m.expires_at, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                <Badge tone="green">Active</Badge>
              </Card>
            ))}
            {(q.data?.mine ?? []).filter((m) => !active.includes(m)).slice(0, 3).map((m) => (
              <Card key={m.id} className="flex items-center gap-3 opacity-60"><div className="flex-1"><p className="text-sm font-semibold">{m.package_name}</p><p className="text-xs text-muted">Expired {fmtDate(m.expires_at)}</p></div><Badge tone="slate">Expired</Badge></Card>
            ))}
          </section>
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Packages</h2>
            {err && !buying && <Alert testId="membership-error">{err}</Alert>}
            {visible.length === 0 ? <Empty icon={<CreditCard />} title="No packages available" /> : visible.map((p) => (
              <Card key={p.id} testId={`package-${p.id}`} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{p.name}</p>{p.description && <p className="mt-0.5 text-xs text-muted">{p.description}</p>}</div>
                  <p className="font-display text-xl font-bold text-lions-200">{money(p.price_cents)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-subtle">{p.duration_months} month{p.duration_months === 1 ? '' : 's'} · {p.audience === 'any' ? 'All members' : p.audience}</p>
                  <Button data-testid={`package-buy-${p.id}`} size="sm" onClick={() => openBuy(p)}>{p.audience === 'child' && <Baby size={14} />} Buy</Button>
                </div>
              </Card>
            ))}
          </section>
        </>
      )}
      <Sheet open={!!buying} onClose={() => setBuying(null)} title={buying?.name ?? ''} testId="membership-sheet">
        {buying && (
          <div className="space-y-4">
            <p className="font-display text-3xl font-bold text-lions-200">{money(buying.price_cents)}</p>
            {buying.audience === 'child' ? (
              <Field label="For which child?"><Select data-testid="membership-child" value={forChild} onChange={(e) => setForChild(e.target.value)}>{children.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</Select></Field>
            ) : buying.audience === 'any' && children.length > 0 ? (
              <Field label="Who is this for?"><Select data-testid="membership-child" value={forChild} onChange={(e) => setForChild(e.target.value)}><option value="">Myself</option>{children.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</Select></Field>
            ) : null}
            <p className="text-sm text-muted">Valid for {buying.duration_months} months from today. You'll get a receipt by email.</p>
            {err && <Alert testId="membership-error">{err}</Alert>}
            {!isStripeCheckoutConfigured() && <Alert tone="blue">Online payments aren't configured yet.</Alert>}
            <Button data-testid="membership-pay-btn" className="w-full" size="lg" loading={busy} disabled={!isStripeCheckoutConfigured()} onClick={pay}>Pay {money(buying.price_cents)}</Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
