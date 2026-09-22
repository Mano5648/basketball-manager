import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, ChevronRight, MapPin, Newspaper, Pin, Trophy } from 'lucide-react'
import { listAll, type ClubEvent, type Fixture, type NewsPost } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { useClub } from '@/lib/ClubContext'
import { useAuth } from '@/lib/AuthContext'
import { fmtDate, fmtDateTime, fmtTime, timeAgo } from '@/lib/format'
import { Badge, Card, Empty, PageHeader, Spinner } from '@/components/ui'

export function NewsCard({ post, compact }: { post: NewsPost; compact?: boolean }) {
  const nav = useNavigate()
  return (
    <Card testId={`news-card-${post.id}`} onClick={() => nav(`/app/news/${post.id}`)} className="overflow-hidden p-0">
      {post.image_url && !compact && <img src={post.image_url} alt="" className="aspect-[16/9] w-full object-cover" />}
      <div className="p-4">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-400">
          {post.pinned && <Pin size={12} className="text-lions-300" />}
          <span>{timeAgo(post.created_at)}</span>
        </div>
        <h3 className="font-display text-base font-bold leading-snug text-white">{post.title}</h3>
        {!compact && <p className="mt-1.5 line-clamp-2 text-sm text-slate-400">{post.body}</p>}
      </div>
    </Card>
  )
}

export function EventRow({ ev }: { ev: ClubEvent }) {
  const nav = useNavigate()
  const d = new Date(ev.starts_at)
  return (
    <Card testId={`event-row-${ev.id}`} onClick={() => nav(`/app/events/${ev.id}`)} className="flex items-center gap-4 py-3">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-lions-500/15 text-lions-200">
        <span className="text-[10px] font-bold uppercase tracking-wider">{d.toLocaleDateString('en-IE', { month: 'short' })}</span>
        <span className="font-display text-xl font-bold leading-none">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{ev.title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">{fmtTime(ev.starts_at)}{ev.location && <><span>·</span><MapPin size={11} />{ev.location}</>}</p>
      </div>
      <ChevronRight size={18} className="text-slate-600" />
    </Card>
  )
}

export function FixtureRow({ fx, teamName }: { fx: Fixture; teamName?: string }) {
  const nav = useNavigate()
  const done = fx.status === 'completed' && fx.home_score != null && fx.away_score != null
  const ourScore = fx.is_home ? fx.home_score : fx.away_score
  const theirScore = fx.is_home ? fx.away_score : fx.home_score
  const won = done && (ourScore ?? 0) > (theirScore ?? 0)
  return (
    <Card testId={`fixture-row-${fx.id}`} onClick={() => nav(`/app/fixtures/${fx.id}`)} className="py-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{teamName ?? 'Club'}{fx.competition ? ` · ${fx.competition}` : ''}</span>
        {done ? <Badge tone={won ? 'green' : (ourScore === theirScore ? 'slate' : 'red')}>{won ? 'Win' : ourScore === theirScore ? 'Draw' : 'Loss'}</Badge>
          : fx.status !== 'scheduled' ? <Badge tone="amber">{fx.status}</Badge> : <span>{fmtDateTime(fx.starts_at)}</span>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{fx.is_home ? 'Home' : 'Away'} vs {fx.opponent}</p>
        {done ? <p className="font-display text-xl font-bold tabular-nums text-white">{ourScore} <span className="text-slate-500">–</span> {theirScore}</p> : fx.tickets_enabled ? <Badge>Tickets</Badge> : null}
      </div>
      {fx.venue && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={11} /> {fx.venue}</p>}
    </Card>
  )
}

export default function HomeFeed() {
  const { profile } = useAuth()
  const { settings, isFeatureOn, teams } = useClub()
  const q = useLiveQuery(async () => {
    const now = new Date().toISOString()
    const [news, events, fixtures] = await Promise.all([
      listAll<NewsPost>('news_posts', 'created_at', false, (x) => x.eq('published', true).limit(20)),
      listAll<ClubEvent>('events', 'starts_at', true, (x) => x.gte('starts_at', now).limit(3)),
      listAll<Fixture>('fixtures', 'starts_at', true, (x) => x.gte('starts_at', now).eq('status', 'scheduled').limit(2)),
    ])
    return { news: [...news].sort((a, b) => Number(b.pinned) - Number(a.pinned)), events, fixtures }
  }, ['news_posts', 'events', 'fixtures'])

  const teamName = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams])
  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-slate-400">{new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">{firstName ? `Hey ${firstName}` : settings?.club_name}</h1>
        {settings?.tagline && <p className="mt-1 text-sm text-slate-400">{settings.tagline}</p>}
      </div>

      {q.loading && !q.data ? <Spinner /> : (
        <>
          {isFeatureOn('fixtures') && q.data?.fixtures.length ? (
            <section className="space-y-2">
              <SectionTitle icon={<Trophy size={15} />} title="Next up" to="/app/fixtures" />
              {q.data.fixtures.map((fx) => <FixtureRow key={fx.id} fx={fx} teamName={fx.team_id ? teamName[fx.team_id] : undefined} />)}
            </section>
          ) : null}

          {isFeatureOn('events') && q.data?.events.length ? (
            <section className="space-y-2">
              <SectionTitle icon={<CalendarDays size={15} />} title="Upcoming events" to="/app/events" />
              {q.data.events.map((ev) => <EventRow key={ev.id} ev={ev} />)}
            </section>
          ) : null}

          {isFeatureOn('news') && (
            <section className="space-y-3">
              <SectionTitle icon={<Newspaper size={15} />} title="Club news" />
              {q.data?.news.length ? q.data.news.map((p) => <NewsCard key={p.id} post={p} />) : <Empty icon={<Newspaper />} title="No news yet" hint="Club updates will appear here." />}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function SectionTitle({ icon, title, to }: { icon: React.ReactNode; title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{icon}{title}</h2>
      {to && <Link to={to} className="text-xs font-semibold text-lions-300">See all</Link>}
    </div>
  )
}

export function NewsDetail() {
  const { id } = useParams()
  const q = useLiveQuery(async () => (await listAll<NewsPost>('news_posts', 'created_at', false, (x) => x.eq('id', id)))[0] ?? null, ['news_posts'], [id])
  if (q.loading && !q.data) return <Spinner />
  if (!q.data) return <Empty title="Article not found" />
  const p = q.data
  return (
    <article className="space-y-4" data-testid="news-detail">
      <PageHeader title={p.title} subtitle={fmtDate(p.created_at, { day: 'numeric', month: 'long', year: 'numeric' })} back="/app" />
      {p.image_url && <img src={p.image_url} alt="" className="w-full rounded-2xl object-cover" />}
      <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">{p.body}</div>
    </article>
  )
}
