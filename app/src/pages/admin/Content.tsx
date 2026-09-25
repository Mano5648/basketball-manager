import { useMemo } from 'react'
import { useClub } from '@/lib/ClubContext'
import type { ClubEvent, Fixture, NewsPost } from '@/lib/db'
import { fmtDateTime, money, timeAgo } from '@/lib/format'
import { AdminCrud, type FieldDef } from '@/components/AdminCrud'
import { Badge, PageHeader } from '@/components/ui'

export function AdminNews() {
  const fields: FieldDef[] = [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'body', label: 'Article', type: 'textarea', required: true },
    { key: 'image_url', label: 'Cover image', type: 'image', folder: 'news' },
    { key: 'published', label: 'Published (visible to members)', type: 'toggle' },
    { key: 'pinned', label: 'Pin to top of feed', type: 'toggle' },
  ]
  return (
    <div>
      <PageHeader title="News" subtitle="Articles shown on the member home feed" />
      <AdminCrud<NewsPost> table="news_posts" fields={fields} newLabel="New article" defaults={{ published: true } as Partial<NewsPost>} itemTitle={(r) => r.title} itemSubtitle={(r) => `${timeAgo(r.created_at)} · ${r.body.slice(0, 80)}`} itemBadge={(r) => (r.published ? (r.pinned ? <Badge>Pinned</Badge> : <Badge tone="green">Live</Badge>) : <Badge tone="slate">Draft</Badge>)} testPrefix="news" />
    </div>
  )
}

export function AdminEvents() {
  const { teams } = useClub()
  const fields: FieldDef[] = useMemo(() => [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'starts_at', label: 'Starts', type: 'datetime', required: true, half: true },
    { key: 'ends_at', label: 'Ends', type: 'datetime', half: true },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'team_id', label: 'Team (optional)', type: 'select', options: teams.map((t) => ({ value: t.id, label: t.name })) },
    { key: 'description', label: 'Details', type: 'textarea' },
    { key: 'image_url', label: 'Image', type: 'image', folder: 'events' },
    { key: 'rsvp_enabled', label: 'Allow RSVP', type: 'toggle' },
  ], [teams])
  return (
    <div>
      <PageHeader title="Events" subtitle="Training, socials, AGMs, tournaments" />
      <AdminCrud<ClubEvent> table="events" fields={fields} orderBy="starts_at" ascending={false} newLabel="New event" defaults={{ rsvp_enabled: true } as Partial<ClubEvent>} itemTitle={(r) => r.title} itemSubtitle={(r) => `${fmtDateTime(r.starts_at)}${r.location ? ` · ${r.location}` : ''}`} itemBadge={(r) => (new Date(r.starts_at) < new Date() ? <Badge tone="slate">Past</Badge> : <Badge tone="green">Upcoming</Badge>)} testPrefix="events" />
    </div>
  )
}

export function AdminFixtures() {
  const { teams } = useClub()
  const teamName = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams])
  const fields: FieldDef[] = useMemo(() => [
    { key: 'team_id', label: 'Team', type: 'select', required: true, options: teams.map((t) => ({ value: t.id, label: t.name })) },
    { key: 'opponent', label: 'Opponent', type: 'text', required: true },
    { key: 'competition', label: 'Competition', type: 'text', half: true },
    { key: 'is_home', label: 'Home game', type: 'toggle' },
    { key: 'starts_at', label: 'Tip-off', type: 'datetime', required: true, half: true },
    { key: 'venue', label: 'Venue', type: 'text', half: true },
    { key: 'status', label: 'Status', type: 'select', required: true, options: ['scheduled', 'live', 'completed', 'postponed', 'cancelled'].map((s) => ({ value: s, label: s })) },
    { key: 'home_score', label: 'Home score', type: 'number', half: true, nullable: true },
    { key: 'away_score', label: 'Away score', type: 'number', half: true, nullable: true },
    { key: 'notes', label: 'Match report / notes', type: 'textarea' },
    { key: 'tickets_enabled', label: 'Sell tickets for this game', type: 'toggle' },
    { key: 'adult_price_cents', label: 'Adult ticket (€)', type: 'money', half: true },
    { key: 'kid_price_cents', label: 'Child ticket (€)', type: 'money', half: true },
  ], [teams])
  return (
    <div>
      <PageHeader title="Fixtures & results" subtitle="Add games, then enter scores after the final whistle" />
      <AdminCrud<Fixture> table="fixtures" fields={fields} orderBy="starts_at" newLabel="New fixture" defaults={{ is_home: true, status: 'scheduled', adult_price_cents: 0, kid_price_cents: 0 } as Partial<Fixture>}
        itemTitle={(r) => `${teamName[r.team_id ?? ''] ?? 'Club'} vs ${r.opponent}`}
        itemSubtitle={(r) => `${fmtDateTime(r.starts_at)}${r.competition ? ` · ${r.competition}` : ''}${r.tickets_enabled ? ` · tickets ${money(r.adult_price_cents)}` : ''}`}
        itemBadge={(r) => (r.status === 'completed' && r.home_score != null ? <Badge tone="blue">{r.home_score}–{r.away_score}</Badge> : r.status === 'live' ? <Badge tone="red">● Live {r.home_score ?? 0}–{r.away_score ?? 0}</Badge> : <Badge tone={r.status === 'scheduled' ? 'green' : 'amber'}>{r.status}</Badge>)} testPrefix="fixtures" />
      <p className="mt-4 text-xs text-slate-500">Tip: open any fixture in the member view (Fixtures tab) to use <b>Match control</b> — start the game, tap scores live, post updates and finish. The team's coach gets the same controls.</p>
    </div>
  )
}
