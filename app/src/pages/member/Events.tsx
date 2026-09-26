import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, Check, HelpCircle, MapPin, X } from 'lucide-react'
import { listAll, sb, type ClubEvent, type Rsvp } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { fmtDateTime, fmtTime } from '@/lib/format'
import { Badge, Button, Card, Empty, PageHeader, Spinner, cx } from '@/components/ui'
import { EventRow } from './HomeFeed'

export default function EventsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const q = useLiveQuery(async () => {
    const now = new Date().toISOString()
    return tab === 'upcoming'
      ? listAll<ClubEvent>('events', 'starts_at', true, (x) => x.gte('starts_at', now))
      : listAll<ClubEvent>('events', 'starts_at', false, (x) => x.lt('starts_at', now).limit(50))
  }, ['events'], [tab])

  return (
    <div>
      <PageHeader title="Events" subtitle="Club calendar" />
      <div className="mb-4 flex gap-1 rounded-full bg-line/[0.05] p-1">
        {(['upcoming', 'past'] as const).map((t) => (
          <button key={t} data-testid={`events-tab-${t}`} onClick={() => setTab(t)} className={cx('flex-1 rounded-full py-2 text-sm font-semibold capitalize transition-colors', tab === t ? 'bg-lions-500 text-white' : 'text-muted')}>{t}</button>
        ))}
      </div>
      {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <Empty icon={<CalendarDays />} title={tab === 'upcoming' ? 'No upcoming events' : 'No past events'} /> : (
        <div className="space-y-2">{q.data.map((ev) => <EventRow key={ev.id} ev={ev} />)}</div>
      )}
    </div>
  )
}

const RSVP_OPTS: { value: Rsvp['status']; label: string; icon: React.ReactNode }[] = [
  { value: 'going', label: 'Going', icon: <Check size={16} /> },
  { value: 'maybe', label: 'Maybe', icon: <HelpCircle size={16} /> },
  { value: 'not_going', label: "Can't go", icon: <X size={16} /> },
]

export function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { teams } = useClub()
  const [busy, setBusy] = useState(false)
  const q = useLiveQuery(async () => {
    const [ev, mine, counts] = await Promise.all([
      listAll<ClubEvent>('events', 'starts_at', true, (x) => x.eq('id', id)),
      user ? listAll<Rsvp>('event_rsvps', 'updated_at', false, (x) => x.eq('event_id', id).eq('profile_id', user.id)) : Promise.resolve([] as Rsvp[]),
      sb().rpc('event_rsvp_counts', { p_event_id: id }),
    ])
    return { ev: ev[0] ?? null, mine: mine[0]?.status, going: Number((counts.data as { going?: number } | null)?.going ?? 0) }
  }, ['events', 'event_rsvps'], [id, user?.id])

  if (q.loading && !q.data) return <Spinner />
  if (!q.data?.ev) return <Empty title="Event not found" />
  const ev = q.data.ev
  const mine = q.data.mine
  const going = q.data.going
  const team = ev.team_id ? teams.find((t) => t.id === ev.team_id) : null

  const setRsvp = async (status: Rsvp['status']) => {
    if (!user) return
    setBusy(true)
    await sb().from('event_rsvps').upsert({ event_id: ev.id, profile_id: user.id, status, updated_at: new Date().toISOString() })
    setBusy(false)
    void q.refresh()
  }

  return (
    <div className="space-y-4" data-testid="event-detail">
      <PageHeader title={ev.title} back="/app/events" />
      {ev.image_url && <img src={ev.image_url} alt="" className="w-full rounded-2xl object-cover" />}
      <Card className="space-y-2 text-sm">
        <p className="flex items-center gap-2 text-fg"><CalendarDays size={16} className="text-lions-300" /> {fmtDateTime(ev.starts_at)}{ev.ends_at ? ` – ${fmtTime(ev.ends_at)}` : ''}</p>
        {ev.location && <p className="flex items-center gap-2 text-muted"><MapPin size={16} className="text-lions-300" /> {ev.location}</p>}
        {team && <Badge>{team.name}</Badge>}
      </Card>
      {ev.description && <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg">{ev.description}</p>}
      {ev.rsvp_enabled && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold">Are you coming?</p><span className="text-xs text-muted" data-testid="rsvp-going-count">{going} going</span></div>
          <div className="grid grid-cols-3 gap-2">
            {RSVP_OPTS.map((o) => (
              <Button key={o.value} data-testid={`rsvp-${o.value}`} size="sm" variant={mine === o.value ? 'primary' : 'secondary'} loading={busy && mine !== o.value} onClick={() => setRsvp(o.value)}>{o.icon}{o.label}</Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
