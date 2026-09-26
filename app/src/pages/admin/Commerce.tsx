import { useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { listAll, sb, type Booking, type Facility, type LottoDraw, type LottoTicket, type Membership, type MembershipPackage, type Product, type Profile, type Sponsor } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { fmtDate, fmtDateTime, fmtTime, money } from '@/lib/format'
import { AdminCrud, type FieldDef } from '@/components/AdminCrud'
import { Alert, Badge, Button, Card, Empty, PageHeader, Spinner, cx } from '@/components/ui'
import { Balls } from '@/pages/member/Lotto'

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 rounded-full bg-line/[0.05] p-1">
      {tabs.map((t) => <button key={t.id} data-testid={`tab-${t.id}`} onClick={() => onChange(t.id)} className={cx('flex-1 rounded-full py-2 text-sm font-semibold transition-colors', value === t.id ? 'bg-lions-500 text-white' : 'text-muted')}>{t.label}</button>)}
    </div>
  )
}

export function AdminMemberships() {
  const [tab, setTab] = useState<'packages' | 'members'>('packages')
  const fields: FieldDef[] = [
    { key: 'name', label: 'Package name', type: 'text', required: true },
    { key: 'price_cents', label: 'Price (€)', type: 'money', required: true, half: true },
    { key: 'duration_months', label: 'Duration (months)', type: 'number', required: true, half: true },
    { key: 'audience', label: 'Who can buy', type: 'select', required: true, options: [{ value: 'any', label: 'Anyone' }, { value: 'adult', label: 'Adult players' }, { value: 'child', label: 'Children (bought by parents)' }, { value: 'supporter', label: 'Supporters' }] },
    { key: 'description', label: "What's included", type: 'textarea' },
    { key: 'sort_order', label: 'Order', type: 'number', half: true },
    { key: 'active', label: 'On sale', type: 'toggle' },
  ]
  const q = useLiveQuery(async () => {
    const [memberships, profiles] = await Promise.all([listAll<Membership>('memberships', 'created_at', false), listAll<Profile>('profiles', 'full_name', true)])
    return { memberships, profiles }
  }, ['memberships', 'profiles'])
  const who = (id: string) => q.data?.profiles.find((p) => p.id === id)
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div>
      <PageHeader title="Memberships" subtitle="Define packages members can buy in the app" />
      <Tabs tabs={[{ id: 'packages', label: 'Packages' }, { id: 'members', label: `Paid members (${q.data?.memberships.filter((m) => m.expires_at >= today).length ?? 0})` }]} value={tab} onChange={setTab} />
      {tab === 'packages' ? (
        <AdminCrud<MembershipPackage> table="membership_packages" fields={fields} orderBy="sort_order" ascending newLabel="New package" defaults={{ active: true, duration_months: 12, audience: 'any' } as Partial<MembershipPackage>} itemTitle={(r) => r.name} itemSubtitle={(r) => `${money(r.price_cents)} · ${r.duration_months} months · ${r.audience}`} itemBadge={(r) => (r.active ? <Badge tone="green">On sale</Badge> : <Badge tone="slate">Hidden</Badge>)} testPrefix="packages" />
      ) : q.loading && !q.data ? <Spinner /> : !q.data?.memberships.length ? <Empty title="No memberships sold yet" /> : (
        <div className="space-y-2">
          {q.data.memberships.map((m) => (
            <Card key={m.id} testId={`membership-row-${m.id}`} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{who(m.profile_id)?.full_name || who(m.profile_id)?.email}</p><p className="text-xs text-muted">{m.package_name} · {money(m.amount_cents)} · {fmtDate(m.starts_at)} → {fmtDate(m.expires_at)}</p></div>
              <Badge tone={m.expires_at >= today && m.status === 'active' ? 'green' : 'slate'}>{m.expires_at >= today && m.status === 'active' ? 'Active' : 'Expired'}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminLotto() {
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const fields: FieldDef[] = [
    { key: 'title', label: 'Draw title', type: 'text', required: true, hint: 'e.g. Weekly Lotto – 14 June' },
    { key: 'jackpot_cents', label: 'Jackpot (€)', type: 'money', required: true, half: true },
    { key: 'ticket_price_cents', label: 'Price per line (€)', type: 'money', required: true, half: true },
    { key: 'numbers_count', label: 'Numbers per line', type: 'number', required: true, half: true },
    { key: 'max_number', label: 'Highest number', type: 'number', required: true, half: true },
    { key: 'draw_at', label: 'Sales close / draw time', type: 'datetime', required: true },
    { key: 'status', label: 'Status', type: 'select', required: true, options: ['open', 'closed', 'cancelled'].map((s) => ({ value: s, label: s })) },
  ]
  const q = useLiveQuery(async () => {
    const [tickets, profiles] = await Promise.all([listAll<LottoTicket>('lotto_tickets', 'created_at', false, (x) => x.eq('status', 'paid')), listAll<Profile>('profiles', 'full_name', true)])
    return { tickets, profiles }
  }, ['lotto_tickets', 'profiles'])
  const runDraw = async (d: LottoDraw, close: () => void) => {
    if (!confirm(`Run the draw for "${d.title}" now? Winning numbers are generated randomly on the server and cannot be changed.`)) return
    setBusy(d.id); setErr(null)
    const { error } = await sb().rpc('run_lotto_draw', { p_draw_id: d.id })
    setBusy(null)
    if (error) setErr(error.message); else close()
  }
  const ticketsFor = (id: string) => (q.data?.tickets ?? []).filter((t) => t.draw_id === id)
  return (
    <div>
      <PageHeader title="Club Lotto" subtitle="Create draws, sell lines in the app, run the draw" />
      {err && <Alert testId="lotto-admin-error">{err}</Alert>}
      <AdminCrud<LottoDraw> table="lotto_draws" fields={fields} orderBy="draw_at" newLabel="New draw" defaults={{ status: 'open', numbers_count: 4, max_number: 32, ticket_price_cents: 200, jackpot_cents: 100000 } as Partial<LottoDraw>}
        itemTitle={(r) => r.title} itemSubtitle={(r) => `${money(r.jackpot_cents)} jackpot · ${money(r.ticket_price_cents)}/line · ${fmtDateTime(r.draw_at)} · ${ticketsFor(r.id).length} lines sold (${money(ticketsFor(r.id).length * r.ticket_price_cents)})`}
        itemBadge={(r) => (r.status === 'drawn' ? <Badge tone="blue">Drawn</Badge> : <Badge tone={r.status === 'open' ? 'green' : 'slate'}>{r.status}</Badge>)}
        extraActions={(d, close) => d && (
          <div className="space-y-3 rounded-xl border border-line/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{ticketsFor(d.id).length} paid lines · {money(ticketsFor(d.id).length * d.ticket_price_cents)} taken</p>
            {d.status === 'drawn' ? (
              <>
                <div className="flex items-center gap-2"><Trophy size={16} className="text-warn-400" /><Balls nums={d.winning_numbers ?? []} /></div>
                {ticketsFor(d.id).filter((t) => t.is_winner).length === 0 ? <p className="text-sm text-muted">No jackpot winner. {ticketsFor(d.id).filter((t) => t.matched === d.numbers_count - 1).length} matched {d.numbers_count - 1}.</p>
                  : ticketsFor(d.id).filter((t) => t.is_winner).map((t) => { const p = q.data?.profiles.find((x) => x.id === t.profile_id); return <p key={t.id} className="text-sm text-emerald-300" data-testid="lotto-winner">Winner: {p?.full_name} · {p?.email}{p?.phone ? ` · ${p.phone}` : ''}</p> })}
              </>
            ) : <Button type="button" data-testid="lotto-run-draw" size="sm" loading={busy === d.id} onClick={() => runDraw(d, close)}><Trophy size={14} /> Run draw now</Button>}
          </div>
        )} testPrefix="draws" />
    </div>
  )
}

export function AdminFacilities() {
  const [tab, setTab] = useState<'facilities' | 'bookings'>('facilities')
  const fields: FieldDef[] = [
    { key: 'name', label: 'Facility', type: 'text', required: true, hint: 'e.g. Main Court, Hall B' },
    { key: 'open_time', label: 'Opens', type: 'time', required: true, half: true },
    { key: 'close_time', label: 'Closes', type: 'time', required: true, half: true },
    { key: 'slot_minutes', label: 'Slot length', type: 'select', required: true, options: [30, 60, 90, 120].map((n) => ({ value: String(n), label: `${n} min` })), half: true },
    { key: 'price_cents', label: 'Price per slot (€, 0 = free)', type: 'money', half: true },
    { key: 'description', label: 'Notes for members', type: 'textarea' },
    { key: 'active', label: 'Bookable', type: 'toggle' },
  ]
  const q = useLiveQuery(async () => {
    const [bookings, facilities, profiles] = await Promise.all([
      listAll<Booking>('facility_bookings', 'starts_at', true, (x) => x.gte('ends_at', new Date().toISOString()).neq('status', 'cancelled')),
      listAll<Facility>('facilities', 'name', true), listAll<Profile>('profiles', 'full_name', true),
    ])
    return { bookings, facilities, profiles }
  }, ['facility_bookings', 'facilities'])
  const cancel = async (b: Booking) => { if (confirm('Cancel this booking?')) { await sb().from('facility_bookings').update({ status: 'cancelled' }).eq('id', b.id); void q.refresh() } }
  return (
    <div>
      <PageHeader title="Facilities" subtitle="Courts and halls members can book" />
      <Tabs tabs={[{ id: 'facilities', label: 'Facilities' }, { id: 'bookings', label: `Upcoming bookings (${q.data?.bookings.length ?? 0})` }]} value={tab} onChange={setTab} />
      {tab === 'facilities' ? (
        <AdminCrud<Facility> table="facilities" fields={fields} orderBy="name" ascending newLabel="New facility" defaults={{ active: true, open_time: '08:00', close_time: '22:00', slot_minutes: 60, price_cents: 0 } as Partial<Facility>} transformOut={(f) => ({ ...f, slot_minutes: Number(f.slot_minutes) })} itemTitle={(r) => r.name} itemSubtitle={(r) => `${r.open_time.slice(0, 5)}–${r.close_time.slice(0, 5)} · ${r.slot_minutes} min · ${r.price_cents ? money(r.price_cents) : 'Free'}`} itemBadge={(r) => (r.active ? <Badge tone="green">Bookable</Badge> : <Badge tone="slate">Off</Badge>)} testPrefix="facilities" />
      ) : q.loading && !q.data ? <Spinner /> : !q.data?.bookings.length ? <Empty title="No upcoming bookings" /> : (
        <div className="space-y-2">
          {q.data.bookings.map((b) => { const p = q.data!.profiles.find((x) => x.id === b.profile_id); return (
            <Card key={b.id} testId={`booking-row-${b.id}`} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{q.data!.facilities.find((f) => f.id === b.facility_id)?.name} · {fmtDateTime(b.starts_at)}–{fmtTime(b.ends_at)}</p><p className="text-xs text-muted">{p?.full_name || p?.email}</p></div>
              <Badge tone={b.status === 'confirmed' ? 'green' : 'amber'}>{b.status}</Badge>
              <Button size="sm" variant="ghost" onClick={() => cancel(b)}>Cancel</Button>
            </Card>
          ) })}
        </div>
      )}
    </div>
  )
}

export function AdminProducts() {
  const fields: FieldDef[] = useMemo(() => [
    { key: 'name', label: 'Product name', type: 'text', required: true },
    { key: 'price_cents', label: 'Price (€)', type: 'money', required: true, half: true },
    { key: 'category', label: 'Category', type: 'text', half: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'image_url', label: 'Photo', type: 'image', folder: 'products' },
    { key: 'sizes', label: 'Sizes (comma separated, optional)', type: 'tags' },
    { key: 'stock', label: 'Stock (blank = unlimited)', type: 'number', half: true, nullable: true },
    { key: 'sort_order', label: 'Order', type: 'number', half: true },
    { key: 'active', label: 'Visible in shop', type: 'toggle' },
  ], [])
  return (
    <div>
      <PageHeader title="Shop products" subtitle="Merchandise sold through the app" />
      <AdminCrud<Product> table="products" fields={fields} orderBy="sort_order" ascending newLabel="New product" defaults={{ active: true, category: 'Merchandise' } as Partial<Product>} itemTitle={(r) => r.name} itemSubtitle={(r) => `${money(r.price_cents)}${r.category ? ` · ${r.category}` : ''}${r.stock != null ? ` · ${r.stock} in stock` : ''}`} itemBadge={(r) => (r.active ? (r.stock != null && r.stock <= 0 ? <Badge tone="red">Sold out</Badge> : <Badge tone="green">Live</Badge>) : <Badge tone="slate">Hidden</Badge>)} testPrefix="products" />
    </div>
  )
}

export function AdminSponsors() {
  const fields: FieldDef[] = [
    { key: 'name', label: 'Sponsor name', type: 'text', required: true },
    { key: 'tier', label: 'Tier / level', type: 'text', hint: 'e.g. Main sponsor, Kit partner' },
    { key: 'logo_url', label: 'Logo', type: 'image', folder: 'sponsors' },
    { key: 'website_url', label: 'Website (https://…)', type: 'text' },
    { key: 'blurb', label: 'Short description', type: 'textarea' },
    { key: 'active', label: 'Visible to members', type: 'toggle' },
  ]
  return (
    <div>
      <PageHeader title="Sponsors" subtitle="Shown on the member home screen and the Sponsors page" />
      <AdminCrud<Sponsor> table="sponsors" fields={fields} orderBy="sort_order" ascending newLabel="New sponsor" defaults={{ active: true, tier: 'Club partner' } as Partial<Sponsor>} itemTitle={(r) => r.name} itemSubtitle={(r) => [r.tier, r.website_url].filter(Boolean).join(' · ')} itemBadge={(r) => (r.active ? <Badge tone="green">Live</Badge> : <Badge tone="slate">Hidden</Badge>)} testPrefix="sponsors" />
    </div>
  )
}
