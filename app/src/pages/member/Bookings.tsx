import { useMemo, useState } from 'react'
import { CalendarCheck, Dumbbell } from 'lucide-react'
import { listAll, sb, type Booking, type Facility } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { useAuth } from '@/lib/AuthContext'
import { fmtDate, fmtDateTime, fmtTime, money } from '@/lib/format'
import { isStripeCheckoutConfigured, startCheckout } from '@/lib/stripeCheckout'
import { Alert, Badge, Button, Card, Empty, Field, Input, PageHeader, Select, Spinner, cx } from '@/components/ui'

function slotsFor(f: Facility, dateStr: string): { start: Date; end: Date }[] {
  const [oh, om] = f.open_time.split(':').map(Number)
  const [ch, cm] = f.close_time.split(':').map(Number)
  const out: { start: Date; end: Date }[] = []
  const start = new Date(`${dateStr}T00:00:00`)
  start.setHours(oh, om, 0, 0)
  const close = new Date(`${dateStr}T00:00:00`)
  close.setHours(ch, cm, 0, 0)
  for (let t = new Date(start); t.getTime() + f.slot_minutes * 60000 <= close.getTime(); t = new Date(t.getTime() + f.slot_minutes * 60000)) {
    out.push({ start: new Date(t), end: new Date(t.getTime() + f.slot_minutes * 60000) })
  }
  return out
}

export default function BookingsPage() {
  const { profile, user } = useAuth()
  const [facilityId, setFacilityId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const q = useLiveQuery(async () => {
    const dayStart = new Date(`${date}T00:00:00`).toISOString()
    const dayEnd = new Date(`${date}T23:59:59`).toISOString()
    const [facilities, bookings, mine] = await Promise.all([
      listAll<Facility>('facilities', 'name', true, (x) => x.eq('active', true)),
      listAll<{ facility_id: string; starts_at: string; ends_at: string }>('facility_busy_slots', 'starts_at', true, (x) => x.gte('starts_at', dayStart).lte('starts_at', dayEnd)),
      user ? listAll<Booking>('facility_bookings', 'starts_at', true, (x) => x.eq('profile_id', user.id).gte('ends_at', new Date().toISOString()).neq('status', 'cancelled')) : Promise.resolve([] as Booking[]),
    ])
    return { facilities, bookings, mine }
  }, ['facilities', 'facility_bookings'], [date, user?.id])

  const facility = useMemo(() => (q.data?.facilities ?? []).find((f) => f.id === facilityId) ?? q.data?.facilities?.[0], [q.data, facilityId])
  const slots = facility ? slotsFor(facility, date) : []
  const taken = (s: { start: Date; end: Date }) => (q.data?.bookings ?? []).some((b) => b.facility_id === facility?.id && new Date(b.starts_at) < s.end && new Date(b.ends_at) > s.start)

  const book = async (s: { start: Date; end: Date }) => {
    if (!profile || !facility) return
    const key = s.start.toISOString()
    setBusy(key); setErr(null)
    try {
      const paid = facility.price_cents > 0
      const { data, error } = await sb().from('facility_bookings').insert({ facility_id: facility.id, profile_id: profile.id, starts_at: s.start.toISOString(), ends_at: s.end.toISOString(), status: paid ? 'pending' : 'confirmed' }).select().single()
      if (error) throw new Error(error.message.includes('bookings_no_overlap') ? 'That slot was just taken. Pick another.' : error.message)
      if (paid) {
        await startCheckout({ purchaseType: 'booking', referenceId: (data as Booking).id, customerName: profile.full_name || profile.email, customerEmail: profile.email })
      }
      void q.refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Booking failed') } finally { setBusy(null) }
  }
  const cancel = async (b: Booking) => {
    if (!confirm('Cancel this booking?')) return
    await sb().from('facility_bookings').update({ status: 'cancelled' }).eq('id', b.id)
    void q.refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Facility booking" subtitle="Book a court or hall slot" back="/app/more" />
      {q.loading && !q.data ? <Spinner /> : !q.data?.facilities.length ? <Empty icon={<Dumbbell />} title="No facilities available" /> : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Facility"><Select data-testid="booking-facility" value={facility?.id ?? ''} onChange={(e) => setFacilityId(e.target.value)}>{q.data.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
            <Field label="Date"><Input data-testid="booking-date" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          {facility && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between"><p className="font-semibold">{facility.name}</p><Badge tone={facility.price_cents > 0 ? 'blue' : 'green'}>{facility.price_cents > 0 ? `${money(facility.price_cents)} / slot` : 'Free'}</Badge></div>
              {facility.description && <p className="text-xs text-muted">{facility.description}</p>}
              {err && <Alert testId="booking-error">{err}</Alert>}
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => {
                  const isTaken = taken(s) || s.start < new Date()
                  const key = s.start.toISOString()
                  return (
                    <button key={key} data-testid={`slot-${fmtTime(key).replace(':', '')}`} disabled={isTaken || busy !== null || (facility.price_cents > 0 && !isStripeCheckoutConfigured())} onClick={() => book(s)}
                      className={cx('rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition-colors', isTaken ? 'border-line/5 text-subtle line-through' : 'border-lions-500/40 bg-lions-500/10 text-lions-100 hover:bg-lions-500/20', busy === key && 'animate-pulse')}>
                      {fmtTime(key)}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-subtle">{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} · {facility.slot_minutes} min slots</p>
            </Card>
          )}
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">My bookings</h2>
            {q.data.mine.length === 0 ? <Empty icon={<CalendarCheck />} title="No upcoming bookings" /> : q.data.mine.map((b) => (
              <Card key={b.id} testId={`my-booking-${b.id}`} className="flex items-center gap-3">
                <div className="flex-1"><p className="text-sm font-semibold">{q.data!.facilities.find((f) => f.id === b.facility_id)?.name ?? 'Facility'}</p><p className="text-xs text-muted">{fmtDateTime(b.starts_at)} – {fmtTime(b.ends_at)}</p></div>
                <Badge tone={b.status === 'confirmed' ? 'green' : 'amber'}>{b.status}</Badge>
                <Button size="sm" variant="ghost" onClick={() => cancel(b)} data-testid={`cancel-booking-${b.id}`}>Cancel</Button>
              </Card>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
