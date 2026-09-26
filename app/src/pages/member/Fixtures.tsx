import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Minus, Plus, Ticket, Trophy } from 'lucide-react'
import { listAll, type Fixture } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { useClub } from '@/lib/ClubContext'
import { useAuth } from '@/lib/AuthContext'
import { fmtDateTime, money } from '@/lib/format'
import { isStripeCheckoutConfigured, startCheckout } from '@/lib/stripeCheckout'
import { Alert, Badge, Button, Card, Empty, PageHeader, Select, Spinner, cx } from '@/components/ui'
import { FixtureRow } from './HomeFeed'
import { LiveUpdates, MatchControl, useCanControlMatch } from './MatchLive'

export default function FixturesPage() {
  const [tab, setTab] = useState<'upcoming' | 'results'>('upcoming')
  const [teamId, setTeamId] = useState('')
  const { teams } = useClub()
  const q = useLiveQuery(async () => {
    const now = new Date().toISOString()
    return tab === 'upcoming'
      ? listAll<Fixture>('fixtures', 'starts_at', true, (x) => x.or(`status.eq.live,and(status.neq.completed,starts_at.gte.${now})`))
      : listAll<Fixture>('fixtures', 'starts_at', false, (x) => x.or(`status.eq.completed,starts_at.lt.${now}`).limit(100))
  }, ['fixtures'], [tab])
  const teamName = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams])
  const rows = (q.data ?? []).filter((f) => !teamId || f.team_id === teamId)

  return (
    <div>
      <PageHeader title="Fixtures" subtitle="Games & results" />
      <div className="mb-3 flex gap-1 rounded-full bg-line/[0.05] p-1">
        {(['upcoming', 'results'] as const).map((t) => (
          <button key={t} data-testid={`fixtures-tab-${t}`} onClick={() => setTab(t)} className={cx('flex-1 rounded-full py-2 text-sm font-semibold capitalize transition-colors', tab === t ? 'bg-lions-500 text-white' : 'text-muted')}>{t}</button>
        ))}
      </div>
      {teams.length > 0 && (
        <Select data-testid="fixtures-team-filter" value={teamId} onChange={(e) => setTeamId(e.target.value)} className="mb-4">
          <option value="">All teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      )}
      {q.loading && !q.data ? <Spinner /> : rows.length === 0 ? <Empty icon={<Trophy />} title={tab === 'upcoming' ? 'No upcoming fixtures' : 'No results yet'} /> : (
        <div className="space-y-2">{rows.map((fx) => <FixtureRow key={fx.id} fx={fx} teamName={fx.team_id ? teamName[fx.team_id] : undefined} />)}</div>
      )}
    </div>
  )
}

function Qty({ value, onChange, testId }: { value: number; onChange: (v: number) => void; testId: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" data-testid={`${testId}-minus`} onClick={() => onChange(Math.max(0, value - 1))} className="rounded-full bg-line/10 p-1.5"><Minus size={14} /></button>
      <span data-testid={testId} className="w-6 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" data-testid={`${testId}-plus`} onClick={() => onChange(Math.min(20, value + 1))} className="rounded-full bg-line/10 p-1.5"><Plus size={14} /></button>
    </div>
  )
}

export function FixtureDetail() {
  const { id } = useParams()
  const { teams } = useClub()
  const { profile } = useAuth()
  const [adult, setAdult] = useState(1)
  const [kid, setKid] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const q = useLiveQuery(async () => (await listAll<Fixture>('fixtures', 'starts_at', true, (x) => x.eq('id', id)))[0] ?? null, ['fixtures'], [id])
  const canControl = useCanControlMatch(q.data)
  if (q.loading && !q.data) return <Spinner />
  if (!q.data) return <Empty title="Fixture not found" />
  const fx = q.data
  const team = teams.find((t) => t.id === fx.team_id)
  const total = adult * fx.adult_price_cents + kid * fx.kid_price_cents
  const upcoming = fx.status === 'scheduled' && new Date(fx.starts_at) > new Date()

  const buy = async () => {
    if (!profile) return
    setBusy(true); setErr(null)
    try {
      await startCheckout({ purchaseType: 'ticket', referenceId: fx.id, customerName: profile.full_name || profile.email, customerEmail: profile.email, metadata: { fixture_id: fx.id, adult_qty: String(adult), kid_qty: String(kid) } })
    } catch (e) { setErr(e instanceof Error ? e.message : 'Checkout failed') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4" data-testid="fixture-detail">
      <PageHeader title={`vs ${fx.opponent}`} subtitle={`${team?.name ?? 'Club'}${fx.competition ? ` · ${fx.competition}` : ''}`} back="/app/fixtures" />
      <FixtureRow fx={fx} teamName={team?.name} />
      {canControl && <MatchControl fx={fx} onChanged={() => void q.refresh()} />}
      <LiveUpdates fixtureId={fx.id} />
      <Card className="space-y-1 text-sm text-muted">
        <p><span className="text-subtle">When:</span> {fmtDateTime(fx.starts_at)}</p>
        <p><span className="text-subtle">Where:</span> {fx.venue ?? (fx.is_home ? 'Home venue' : 'Away')}</p>
        {fx.notes && <p className="pt-1 whitespace-pre-wrap text-fg">{fx.notes}</p>}
      </Card>
      {fx.tickets_enabled && upcoming && (
        <Card className="space-y-4" testId="ticket-card">
          <div className="flex items-center gap-2"><Ticket size={18} className="text-accent-400" /><p className="font-semibold">Match tickets</p><Badge tone="amber" className="ml-auto">{money(fx.adult_price_cents)} adult</Badge></div>
          <div className="flex items-center justify-between text-sm"><span>Adult · {money(fx.adult_price_cents)}</span><Qty value={adult} onChange={setAdult} testId="ticket-adult-qty" /></div>
          {fx.kid_price_cents > 0 && <div className="flex items-center justify-between text-sm"><span>Child · {money(fx.kid_price_cents)}</span><Qty value={kid} onChange={setKid} testId="ticket-kid-qty" /></div>}
          {err && <Alert testId="ticket-error">{err}</Alert>}
          {!isStripeCheckoutConfigured() && <Alert tone="blue">Online payments aren't configured yet.</Alert>}
          <Button data-testid="ticket-buy-btn" className="w-full" size="lg" disabled={total <= 0 || !isStripeCheckoutConfigured()} loading={busy} onClick={buy}>Pay {money(total)}</Button>
          <p className="text-center text-[11px] text-subtle">Secure checkout by Stripe · Apple Pay & Google Pay supported</p>
        </Card>
      )}
    </div>
  )
}
