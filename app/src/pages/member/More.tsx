import { useNavigate } from 'react-router-dom'
import { Bell, CalendarCheck, ChevronRight, CreditCard, Dumbbell, ExternalLink, Handshake, Mail, Moon, Phone, Receipt, ShieldCheck, Sun, Ticket, UserCircle2, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { useTheme } from '@/lib/ThemeContext'
import { listAll, sb, type Notification, type Sponsor } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { fmtDateTime } from '@/lib/format'
import { Card, Empty, PageHeader, Spinner, cx } from '@/components/ui'
import type { FeatureKey } from '@/lib/db'

export default function MorePage() {
  const nav = useNavigate()
  const { role, profile } = useAuth()
  const { settings, isFeatureOn } = useClub()
  const { theme, toggle } = useTheme()
  type Item = { to: string; label: string; hint: string; icon: LucideIcon; feature?: FeatureKey; testId: string }
  const all: Item[] = [
    { to: '/app/membership', label: 'Membership', hint: 'Join, renew & view status', icon: CreditCard, feature: 'membership', testId: 'more-membership' },
    { to: '/app/sponsors', label: 'Sponsors', hint: 'The partners who back the club', icon: Handshake, feature: 'sponsors', testId: 'more-sponsors' },
    { to: '/app/lotto', label: 'Club Lotto', hint: 'Play & see results', icon: Ticket, feature: 'lotto', testId: 'more-lotto' },
    { to: '/app/bookings', label: 'Facility booking', hint: 'Book courts & halls', icon: Dumbbell, feature: 'booking', testId: 'more-bookings' },
    { to: '/app/orders', label: 'Purchases', hint: 'Orders, tickets & receipts', icon: Receipt, testId: 'more-orders' },
    { to: '/app/inbox', label: 'Notifications', hint: 'Club announcements', icon: Bell, testId: 'more-inbox' },
    { to: '/app/profile', label: 'My profile', hint: 'Details, children & sign out', icon: UserCircle2, testId: 'more-profile' },
  ]
  const items = all.filter((i) => !i.feature || isFeatureOn(i.feature))

  return (
    <div className="space-y-6">
      <PageHeader title="More" subtitle={profile?.full_name || profile?.email} />
      {role === 'manager' && (
        <Card testId="more-admin" onClick={() => nav('/admin')} className="flex items-center gap-3 border-lions-500/40 bg-lions-500/10">
          <ShieldCheck className="text-lions-200" /><div className="flex-1"><p className="text-sm font-semibold">Admin console</p><p className="text-xs text-muted">Manage the whole club</p></div><ChevronRight size={18} className="text-subtle" />
        </Card>
      )}
      <div className="space-y-2">
        {items.map((i) => (
          <Card key={i.to} testId={i.testId} onClick={() => nav(i.to)} className="flex items-center gap-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-line/[0.06] text-lions-200"><i.icon size={18} /></div>
            <div className="flex-1"><p className="text-sm font-semibold">{i.label}</p><p className="text-xs text-muted">{i.hint}</p></div>
            <ChevronRight size={18} className="text-subtle" />
          </Card>
        ))}
      </div>
      <Card className="flex items-center gap-3 py-3" testId="theme-card">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-line/[0.06] text-lions-200">{theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}</div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Appearance</p>
          <p className="text-xs text-muted">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
        </div>
        <button
          data-testid="theme-toggle"
          role="switch"
          aria-checked={theme === 'light'}
          aria-label="Switch between light and dark mode"
          onClick={toggle}
          className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', theme === 'light' ? 'bg-lions-500' : 'bg-line/15')}
        >
          <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform', theme === 'light' ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </Card>
      {settings?.about_text && <Card className="text-sm leading-relaxed text-muted"><p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-muted">About the club</p><p className="whitespace-pre-wrap">{settings.about_text}</p></Card>}
      {(settings?.contact_email || settings?.contact_phone) && (
        <Card className="space-y-2 text-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Contact the club</p>
          {settings.contact_email && <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 text-lions-200"><Mail size={15} /> {settings.contact_email}</a>}
          {settings.contact_phone && <a href={`tel:${settings.contact_phone}`} className="flex items-center gap-2 text-lions-200"><Phone size={15} /> {settings.contact_phone}</a>}
          {settings.address && <p className="text-muted">{settings.address}</p>}
        </Card>
      )}
      <p className="text-center text-[11px] text-subtle"><button onClick={() => nav('/privacy')} className="underline">Privacy policy</button> · v{__APP_VERSION__}</p>
    </div>
  )
}

export function InboxPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const q = useLiveQuery(async () => {
    const [notes, reads] = await Promise.all([
      listAll<Notification>('notifications', 'created_at', false, (x) => x.limit(100)),
      user ? sb().from('notification_reads').select('notification_id').eq('profile_id', user.id) : Promise.resolve({ data: [] }),
    ])
    const read = new Set(((reads as { data: { notification_id: string }[] | null }).data ?? []).map((r) => r.notification_id))
    return notes.map((n) => ({ ...n, read: read.has(n.id) }))
  }, ['notifications', 'notification_reads'], [user?.id])

  const open = async (n: Notification & { read: boolean }) => {
    if (user && !n.read) await sb().from('notification_reads').upsert({ notification_id: n.id, profile_id: user.id })
    if (n.link) nav(n.link)
    else void q.refresh()
  }
  const markAll = async () => {
    if (!user || !q.data) return
    await sb().from('notification_reads').upsert(q.data.filter((n) => !n.read).map((n) => ({ notification_id: n.id, profile_id: user.id })))
    void q.refresh()
  }

  return (
    <div>
      <PageHeader title="Notifications" back="/app" action={q.data?.some((n) => !n.read) ? <button data-testid="inbox-mark-all" onClick={markAll} className="text-xs font-semibold text-lions-300">Mark all read</button> : undefined} />
      {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <Empty icon={<Bell />} title="No notifications yet" /> : (
        <div className="space-y-2">
          {q.data.map((n) => (
            <Card key={n.id} testId={`notification-${n.id}`} onClick={() => open(n)} className={cx('flex items-start gap-3 py-3', !n.read && 'border-lions-500/40')}>
              <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-lions-400')} />
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{n.title}</p><p className="mt-0.5 text-sm text-muted">{n.body}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-subtle"><CalendarCheck size={11} /> {fmtDateTime(n.created_at)}</p></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function useSponsors() {
  return useLiveQuery(() => listAll<Sponsor>('sponsors', 'sort_order', true, (x) => x.eq('active', true)), ['sponsors'])
}

export function SponsorCard({ s }: { s: Sponsor }) {
  const inner = (
    <>
      {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-line/[0.06] text-muted"><Handshake size={20} /></div>}
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.name}</p><p className="text-xs text-warn-400">{s.tier}</p>{s.blurb && <p className="mt-1 text-xs text-muted">{s.blurb}</p>}</div>
      {s.website_url && <ExternalLink size={16} className="text-subtle" />}
    </>
  )
  return s.website_url
    ? <a data-testid={`sponsor-${s.id}`} href={s.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-line/[0.08] bg-surface p-4 hover:border-line/20">{inner}</a>
    : <Card testId={`sponsor-${s.id}`} className="flex items-center gap-3">{inner}</Card>
}

export function SponsorsPage() {
  const { settings } = useClub()
  const q = useSponsors()
  return (
    <div>
      <PageHeader title={settings?.sponsors_title || 'Our sponsors'} subtitle="Thank you for backing the club" back="/app/more" />
      {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <Empty icon={<Handshake />} title="No sponsors listed yet" /> : <div className="space-y-2">{q.data.map((s) => <SponsorCard key={s.id} s={s} />)}</div>}
    </div>
  )
}
