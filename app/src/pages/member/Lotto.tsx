import { useMemo, useState } from 'react'
import { Shuffle, Ticket, Trophy } from 'lucide-react'
import { listAll, sb, type LottoDraw, type LottoTicket } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { fmtDateTime, money } from '@/lib/format'
import { isStripeCheckoutConfigured, startCheckout } from '@/lib/stripeCheckout'
import { Alert, Badge, Button, Card, Empty, PageHeader, Spinner, cx } from '@/components/ui'

export function Balls({ nums, hit }: { nums: number[]; hit?: number[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {nums.map((n, i) => <span key={`${n}-${i}`} className={cx('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tabular-nums', hit?.includes(n) ? 'bg-emerald-500 text-white' : 'bg-line/10 text-fg')}>{n}</span>)}
    </div>
  )
}

export default function LottoPage() {
  const { profile, user } = useAuth()
  const { settings } = useClub()
  const [picks, setPicks] = useState<number[]>([])
  const [lines, setLines] = useState<number[][]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const q = useLiveQuery(async () => {
    const [draws, tickets] = await Promise.all([
      listAll<LottoDraw>('lotto_draws', 'draw_at', false, (x) => x.neq('status', 'cancelled').limit(12)),
      user ? listAll<LottoTicket>('lotto_tickets', 'created_at', false, (x) => x.eq('profile_id', user.id).limit(100)) : Promise.resolve([] as LottoTicket[]),
    ])
    return { draws, tickets }
  }, ['lotto_draws', 'lotto_tickets'], [user?.id])

  const open = useMemo(() => (q.data?.draws ?? []).find((d) => d.status === 'open' && new Date(d.draw_at) > new Date()), [q.data])
  const past = (q.data?.draws ?? []).filter((d) => d.status === 'drawn')
  const myTickets = (q.data?.tickets ?? []).filter((t) => t.status === 'paid')

  const toggle = (n: number) => {
    if (!open) return
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < open.numbers_count ? [...p, n] : p))
  }
  const quickPick = () => {
    if (!open) return
    const s = new Set<number>()
    while (s.size < open.numbers_count) s.add(1 + Math.floor(Math.random() * open.max_number))
    setPicks([...s].sort((a, b) => a - b))
  }
  const addLine = () => { if (open && picks.length === open.numbers_count) { setLines([...lines, [...picks].sort((a, b) => a - b)]); setPicks([]) } }

  const pay = async () => {
    if (!profile || !open || lines.length === 0) return
    setBusy(true); setErr(null)
    try {
      const rows = lines.map((numbers) => ({ draw_id: open.id, profile_id: profile.id, numbers, status: 'pending' }))
      const { data, error } = await sb().from('lotto_tickets').insert(rows).select('id')
      if (error) throw error
      const ids = (data ?? []).map((r) => r.id as string)
      await startCheckout({ purchaseType: 'lotto', referenceId: open.id, customerName: profile.full_name || profile.email, customerEmail: profile.email, metadata: { ticket_ids: ids.join(',') } })
      setLines([])
    } catch (e) { setErr(e instanceof Error ? e.message : 'Checkout failed') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Club Lotto" subtitle="Support the club, win the jackpot" back="/app/more" />
      {q.loading && !q.data ? <Spinner /> : !open ? <Empty icon={<Ticket />} title="No draw open right now" hint="Check back soon — the next draw will appear here." /> : (
        <Card className="space-y-4" testId="lotto-open-draw">
          <div className="flex items-start justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-lions-300">{open.title}</p><p className="font-display mt-1 text-3xl font-bold">{money(open.jackpot_cents)}</p><p className="text-xs text-muted">Jackpot · draw {fmtDateTime(open.draw_at)}</p></div>
            <Badge>{money(open.ticket_price_cents)} / line</Badge>
          </div>
          <p className="text-sm text-muted">Pick {open.numbers_count} numbers from 1–{open.max_number}.</p>
          <div className="grid grid-cols-8 gap-1.5">
            {Array.from({ length: open.max_number }, (_, i) => i + 1).map((n) => (
              <button key={n} data-testid={`lotto-num-${n}`} onClick={() => toggle(n)} className={cx('aspect-square rounded-full text-sm font-semibold tabular-nums transition-colors', picks.includes(n) ? 'bg-lions-500 text-white' : 'bg-line/[0.06] text-muted hover:bg-line/10')}>{n}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button data-testid="lotto-quick-pick" variant="secondary" size="sm" onClick={quickPick}><Shuffle size={14} /> Quick pick</Button>
            <Button data-testid="lotto-add-line" size="sm" disabled={picks.length !== open.numbers_count} onClick={addLine}>Add line</Button>
          </div>
          {lines.length > 0 && (
            <div className="space-y-2 border-t border-line/10 pt-3">
              {lines.map((l, i) => <div key={i} className="flex items-center justify-between" data-testid={`lotto-line-${i}`}><Balls nums={l} /><button onClick={() => setLines(lines.filter((_, n) => n !== i))} className="text-xs text-muted">Remove</button></div>)}
              {err && <Alert testId="lotto-error">{err}</Alert>}
              {!isStripeCheckoutConfigured() && <Alert tone="blue">Online payments aren't configured yet.</Alert>}
              <Button data-testid="lotto-pay-btn" className="w-full" size="lg" loading={busy} disabled={!isStripeCheckoutConfigured()} onClick={pay}>Pay {money(lines.length * open.ticket_price_cents)} for {lines.length} line{lines.length > 1 ? 's' : ''}</Button>
            </div>
          )}
          {settings?.lotto_rules && <p className="text-[11px] leading-relaxed text-subtle">{settings.lotto_rules}</p>}
        </Card>
      )}

      {myTickets.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">My tickets</h2>
          {myTickets.slice(0, 10).map((t) => {
            const d = (q.data?.draws ?? []).find((x) => x.id === t.draw_id)
            return (
              <Card key={t.id} testId={`lotto-ticket-${t.id}`} className="flex items-center justify-between gap-3">
                <div><p className="mb-1.5 text-xs text-muted">{d?.title ?? 'Draw'} · {d ? fmtDateTime(d.draw_at) : ''}</p><Balls nums={t.numbers} hit={d?.winning_numbers ?? undefined} /></div>
                {d?.status === 'drawn' ? (t.is_winner ? <Badge tone="green">Winner!</Badge> : <Badge tone="slate">{t.matched} matched</Badge>) : <Badge>Entered</Badge>}
              </Card>
            )
          })}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Results</h2>
          {past.map((d) => (
            <Card key={d.id} className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold">{d.title}</p><p className="mb-1.5 text-xs text-muted">{fmtDateTime(d.drawn_at ?? d.draw_at)} · {money(d.jackpot_cents)}</p><Balls nums={d.winning_numbers ?? []} /></div>
              <Trophy size={18} className="text-warn-400" />
            </Card>
          ))}
        </section>
      )}
    </div>
  )
}
