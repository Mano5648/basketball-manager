import { useEffect, useState, type FormEvent } from 'react'
import { ShieldCheck, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { sb, type ClubSettings, type FeatureKey } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { Alert, Button, Card, Field, Input, PageHeader, Textarea, Toggle } from '@/components/ui'
import { isStripeCheckoutConfigured } from '@/lib/stripeCheckout'

const FEATURES: { key: FeatureKey; label: string }[] = [
  { key: 'news', label: 'Club news feed' }, { key: 'events', label: 'Events & RSVP' }, { key: 'fixtures', label: 'Fixtures & results' },
  { key: 'shop', label: 'Club shop' }, { key: 'membership', label: 'Membership packages' }, { key: 'lotto', label: 'Club lotto' },
  { key: 'booking', label: 'Facility booking' }, { key: 'sponsors', label: 'Sponsors' },
]

export function AdminSettings() {
  const { settings, refresh } = useClub()
  const { profile } = useAuth()
  const [form, setForm] = useState<ClubSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [newAdmin, setNewAdmin] = useState('')
  const admins = useLiveQuery(async () => (await sb().from('managers').select('email, created_at').order('created_at')).data ?? [], ['managers'])

  useEffect(() => { if (settings && !form) setForm(settings) }, [settings, form])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true); setMsg(null)
    const { id: _id, ...payload } = form
    void _id
    const { error } = await sb().from('club_settings').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', 1)
    setSaving(false)
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Settings saved' })
    void refresh()
  }
  const addAdmin = async (e: FormEvent) => {
    e.preventDefault()
    const email = newAdmin.trim().toLowerCase()
    if (!email) return
    const { error } = await sb().from('managers').insert({ email, added_by: profile?.email })
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: `${email} is now an admin (they must have an account with this email).` })
    setNewAdmin('')
  }
  const removeAdmin = async (email: string) => {
    if (email === profile?.email) { setMsg({ ok: false, text: "You can't remove yourself." }); return }
    if (!confirm(`Remove admin access from ${email}?`)) return
    await sb().from('managers').delete().eq('email', email)
  }

  if (!form) return null
  const set = <K extends keyof ClubSettings>(k: K, v: ClubSettings[K]) => setForm({ ...form, [k]: v })

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Branding, features, contact details and admins" />
      <form onSubmit={save} className="space-y-6" data-testid="settings-form">
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Club identity</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Club name"><Input data-testid="settings-club-name" value={form.club_name} onChange={(e) => set('club_name', e.target.value)} required /></Field>
            <Field label="Tagline"><Input data-testid="settings-tagline" value={form.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} /></Field>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Contact</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email"><Input data-testid="settings-email" type="email" value={form.contact_email ?? ''} onChange={(e) => set('contact_email', e.target.value)} /></Field>
            <Field label="Phone"><Input type="tel" value={form.contact_phone ?? ''} onChange={(e) => set('contact_phone', e.target.value)} /></Field>
            <Field label="Website"><Input value={form.website_url ?? ''} onChange={(e) => set('website_url', e.target.value)} /></Field>
            <Field label="Address"><Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Features shown to members</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {FEATURES.map((f) => <Toggle key={f.key} testId={`feature-${f.key}`} label={f.label} checked={form.features?.[f.key] !== false} onChange={(v) => set('features', { ...form.features, [f.key]: v })} />)}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">App text</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Home greeting" hint="{name} is replaced with the member's first name"><Input data-testid="settings-greeting" value={form.home_greeting ?? ''} onChange={(e) => set('home_greeting', e.target.value)} /></Field>
            <Field label="Sponsors section title"><Input data-testid="settings-sponsors-title" value={form.sponsors_title ?? ''} onChange={(e) => set('sponsors_title', e.target.value)} /></Field>
            <Field label="Login screen title"><Input value={form.welcome_title ?? ''} onChange={(e) => set('welcome_title', e.target.value)} /></Field>
            <Field label="Register screen title"><Input value={form.register_title ?? ''} onChange={(e) => set('register_title', e.target.value)} /></Field>
          </div>
          <Field label="About the club (shown in More)"><Textarea data-testid="settings-about" value={form.about_text ?? ''} onChange={(e) => set('about_text', e.target.value)} /></Field>
          <Field label="Privacy policy text" hint="Leave blank to use the built-in default policy"><Textarea value={form.privacy_text ?? ''} onChange={(e) => set('privacy_text', e.target.value)} /></Field>
        </section>
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Lotto rules / legal text</h2>
          <Textarea data-testid="settings-lotto-rules" value={form.lotto_rules ?? ''} onChange={(e) => set('lotto_rules', e.target.value)} placeholder="Shown under the lotto ticket picker. Include your licence number, age restrictions and prize terms." />
        </section>
        {msg && <Alert tone={msg.ok ? 'green' : 'red'} testId="settings-msg">{msg.text}</Alert>}
        <Button data-testid="settings-save" type="submit" loading={saving}>Save settings</Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Club admins</h2>
        <div className="space-y-2">
          {(admins.data ?? []).map((a) => (
            <Card key={a.email} testId={`admin-${a.email}`} className="flex items-center gap-3 py-3"><ShieldCheck size={16} className="text-lions-300" /><p className="flex-1 text-sm">{a.email}</p>{a.email !== profile?.email && <button data-testid={`remove-admin-${a.email}`} onClick={() => removeAdmin(a.email)} className="p-1.5 text-subtle hover:text-rose-400"><Trash2 size={15} /></button>}</Card>
          ))}
        </div>
        <form onSubmit={addAdmin} className="flex gap-2"><Input data-testid="new-admin-email" type="email" value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="coach@club.ie" required /><Button data-testid="add-admin-btn" type="submit" variant="secondary">Add admin</Button></form>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Payments</h2>
        <Card className="text-sm text-muted">
          <p>Stripe checkout: <b className={isStripeCheckoutConfigured() ? 'text-emerald-300' : 'text-rose-300'}>{isStripeCheckoutConfigured() ? 'configured' : 'not configured'}</b>. Card, Apple Pay and Google Pay are enabled automatically. Payouts and receipts are managed in your Stripe dashboard.</p>
        </Card>
      </section>
    </div>
  )
}

export function AdminReports() {
  const q = useLiveQuery(async () => {
    const { data } = await sb().from('purchases').select('purchase_type, amount_cents, status, paid_at').eq('status', 'paid')
    const rows = (data ?? []) as { purchase_type: string; amount_cents: number; paid_at: string | null }[]
    const byType: Record<string, number> = {}
    const byMonth: Record<string, number> = {}
    for (const r of rows) {
      byType[r.purchase_type] = (byType[r.purchase_type] ?? 0) + r.amount_cents
      const m = (r.paid_at ?? '').slice(0, 7)
      if (m) byMonth[m] = (byMonth[m] ?? 0) + r.amount_cents
    }
    return { total: rows.reduce((s, r) => s + r.amount_cents, 0), count: rows.length, byType, byMonth: Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12) }
  }, ['purchases'])
  const fmt = (c: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(c / 100)
  const LABEL: Record<string, string> = { store: 'Shop', ticket: 'Match tickets', membership: 'Memberships', lotto: 'Lotto', booking: 'Bookings' }
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Paid revenue via Stripe" />
      {q.data && (
        <>
          <Card><p className="text-xs text-muted">Total paid revenue</p><p className="font-display text-3xl font-bold" data-testid="report-total">{fmt(q.data.total)}</p><p className="text-xs text-subtle">{q.data.count} payments</p></Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-muted">By type</p>{Object.entries(q.data.byType).map(([k, v]) => <div key={k} className="flex justify-between text-sm"><span>{LABEL[k] ?? k}</span><b>{fmt(v)}</b></div>)}{!Object.keys(q.data.byType).length && <p className="text-sm text-subtle">No data yet</p>}</Card>
            <Card className="space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-muted">By month</p>{q.data.byMonth.map(([k, v]) => <div key={k} className="flex justify-between text-sm"><span>{k}</span><b>{fmt(v)}</b></div>)}{!q.data.byMonth.length && <p className="text-sm text-subtle">No data yet</p>}</Card>
          </div>
        </>
      )}
    </div>
  )
}
