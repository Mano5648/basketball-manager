import { useState, type FormEvent } from 'react'
import { Bell, Send } from 'lucide-react'
import { useClub } from '@/lib/ClubContext'
import { listAll, sb, type Notification } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { fmtDateTime } from '@/lib/format'
import { Alert, Badge, Button, Card, Empty, Field, Input, PageHeader, Select, Spinner, Textarea } from '@/components/ui'

const LINKS = [
  { value: '', label: 'Open the app home' }, { value: '/app/events', label: 'Events' }, { value: '/app/fixtures', label: 'Fixtures' },
  { value: '/app/shop', label: 'Shop' }, { value: '/app/membership', label: 'Membership' }, { value: '/app/lotto', label: 'Lotto' },
  { value: '/app/bookings', label: 'Bookings' }, { value: '/app/sponsors', label: 'Sponsors' },
]

export function AdminNotifications() {
  const { teams } = useClub()
  const [form, setForm] = useState({ title: '', body: '', target: 'all', team_id: '', link: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const q = useLiveQuery(() => listAll<Notification>('notifications', 'created_at', false, (x) => x.limit(50)), ['notifications'])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!confirm(`Send "${form.title}" to ${form.target === 'all' ? 'ALL members' : teams.find((t) => t.id === form.team_id)?.name}?`)) return
    setBusy(true); setMsg(null)
    const { data, error } = await sb().functions.invoke('send-push', { body: { title: form.title.trim(), body: form.body.trim(), target: form.target, team_id: form.team_id || null, link: form.link || null } })
    setBusy(false)
    if (error || data?.error) { setMsg({ ok: false, text: error?.message || data?.error }); return }
    setMsg({ ok: true, text: `Sent. Delivered as push to ${data?.pushSent ?? 0} device${data?.pushSent === 1 ? '' : 's'}${data?.pushSkipped ? ` (${data.pushSkipped})` : ''}.` })
    setForm({ title: '', body: '', target: 'all', team_id: '', link: '' })
    void q.refresh()
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Notifications" subtitle="Push + in-app inbox message to members" />
      <form onSubmit={send} className="space-y-4" data-testid="notification-form">
        <Field label="Title"><Input data-testid="notif-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={80} /></Field>
        <Field label="Message"><Textarea data-testid="notif-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required maxLength={500} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Send to"><Select data-testid="notif-target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}><option value="all">Everyone</option><option value="team">One team</option></Select></Field>
          {form.target === 'team' ? <Field label="Team"><Select data-testid="notif-team" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })} required><option value="">Choose…</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
            : <Field label="Tapping opens"><Select data-testid="notif-link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}>{LINKS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select></Field>}
        </div>
        {msg && <Alert tone={msg.ok ? 'green' : 'red'} testId="notif-msg">{msg.text}</Alert>}
        <Button data-testid="notif-send" type="submit" loading={busy}><Send size={16} /> Send notification</Button>
      </form>
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Sent</h2>
        {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <Empty icon={<Bell />} title="Nothing sent yet" /> : q.data.map((n) => (
          <Card key={n.id} testId={`sent-notif-${n.id}`} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{n.title}</p><p className="text-sm text-muted">{n.body}</p><p className="mt-1 text-[11px] text-subtle">{fmtDateTime(n.created_at)} · {n.target === 'all' ? 'Everyone' : teams.find((t) => t.id === n.team_id)?.name ?? 'Team'}</p></div>
            <Badge tone="slate">{n.push_sent} push</Badge>
          </Card>
        ))}
      </section>
    </div>
  )
}
