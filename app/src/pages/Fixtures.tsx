import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Ticket,
  ChevronDown,
  Home,
  ArrowRight,
} from 'lucide-react'
import { asset } from '@/hooks/useSiteImages'
import { getFixtures, getTeams, type ClubFixture } from '@/lib/clubData'

// ─── Types ───
interface Fixture {
  id: number
  date: string
  day: string
  monthShort: string
  monthLong: string
  time: string
  opponent: string
  venue: 'Home' | 'Away'
  competition: string
  status: 'upcoming' | 'completed' | 'live'
  result?: {
    lionsScore: number
    opponentScore: number
    won: boolean
  }
  mvp?: string
  ticketLink?: string
}

interface Standing {
  pos: number
  team: string
  p: number
  w: number
  l: number
  pf: number
  pa: number
  diff: number
  pts: number
  isLions?: boolean
}

// Returns true if the fixture's date+time has already passed.
function isFixturePast(f: Pick<Fixture, 'date' | 'monthLong' | 'time'>): boolean {
  const parsed = new Date(`${f.monthLong} ${f.date} ${f.time}`)
  if (isNaN(parsed.getTime())) return false
  return parsed.getTime() < Date.now()
}

// Convert a ClubFixture (manager-editable) into the display shape that the
// page renders.
function toDisplayFixture(f: ClubFixture, index: number): Fixture {
  const d = new Date(`${f.date}T${f.time || '00:00'}`)
  const day = d.toLocaleDateString('en-IE', { weekday: 'short' }).toUpperCase()
  const monthShort = d.toLocaleDateString('en-IE', { month: 'short' }).toUpperCase()
  const monthLong = d.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })
  const status: 'upcoming' | 'completed' | 'live' = f.result ? 'completed' : 'upcoming'
  return {
    id: index + 1,
    date: String(d.getDate()),
    day,
    monthShort,
    monthLong,
    time: f.time,
    opponent: f.opponent,
    venue: f.venue,
    competition: f.competition,
    status,
    result: f.result ? {
      lionsScore: f.result.lionsScore,
      opponentScore: f.result.opponentScore,
      won: f.result.lionsScore > f.result.opponentScore,
    } : undefined,
    mvp: f.result?.mvp,
    ticketLink: f.ticketLink,
  }
}

// Live hook: returns fixtures from the store and refreshes when they change.
function useLiveFixtures(): Fixture[] {
  const [list, setList] = useState<Fixture[]>(() => getFixtures().map(toDisplayFixture))
  useEffect(() => {
    const sync = () => setList(getFixtures().map(toDisplayFixture))
    sync()
    const h = (e: StorageEvent) => { if (e.key === 'dlbc_fixtures') sync() }
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }, [])
  return list
}

// ─── Data ───
const standings: Standing[] = [
  { pos: 1, team: 'Templeogue', p: 14, w: 11, l: 3, pf: 1120, pa: 980, diff: 140, pts: 33 },
  { pos: 2, team: 'Neptune BC', p: 14, w: 10, l: 4, pf: 1080, pa: 1010, diff: 70, pts: 30 },
  { pos: 3, team: 'Dublin Lions', p: 14, w: 8, l: 6, pf: 1050, pa: 1020, diff: 30, pts: 26, isLions: true },
  { pos: 4, team: 'UCD Marian', p: 14, w: 7, l: 7, pf: 990, pa: 1000, diff: -10, pts: 23 },
  { pos: 5, team: 'Killester', p: 14, w: 6, l: 8, pf: 980, pa: 1010, diff: -30, pts: 20 },
  { pos: 6, team: 'Belfast Star', p: 14, w: 5, l: 9, pf: 970, pa: 1060, diff: -90, pts: 17 },
  { pos: 7, team: 'DCU Saints', p: 14, w: 4, l: 10, pf: 940, pa: 1090, diff: -150, pts: 14 },
  { pos: 8, team: '\u00C9anna', p: 14, w: 3, l: 11, pf: 920, pa: 1120, diff: -200, pts: 11 },
]


// ─── Scroll Reveal Hook ───
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

// ─── Components ───
function FixtureCard({ fixture, index }: { fixture: Fixture; index: number }) {
  const { ref, visible } = useScrollReveal()

  return (
    <div
      ref={ref}
      className={`section-reveal ${visible ? 'visible' : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="group bg-[#1E293B] rounded-xl p-5 md:p-6 hover:bg-[rgba(59,130,246,0.05)] hover:border-l-4 hover:border-l-electric-blue transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Date Block */}
          <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-0 md:w-20 shrink-0">
            <div className="md:hidden">
              <span className="font-inter font-semibold text-xs uppercase text-electric-blue">
                {fixture.day}
              </span>
            </div>
            <div className="hidden md:block">
              <div className="font-inter font-semibold text-xs uppercase text-electric-blue">
                {fixture.day}
              </div>
              <div className="font-oswald font-bold text-3xl text-white leading-none">
                {fixture.date}
              </div>
              <div className="font-inter text-xs text-slate-400 mt-1">
                {fixture.monthShort}
              </div>
            </div>
            <div className="md:hidden flex items-center gap-2">
              <span className="font-oswald font-bold text-2xl text-white">{fixture.date}</span>
              <span className="font-inter text-xs text-slate-400">{fixture.monthShort}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300 md:mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-inter text-sm">{fixture.time}</span>
            </div>
          </div>

          {/* Matchup */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-inter font-semibold text-lg text-white">Dublin Lions</span>
              <span className="font-inter text-slate-500">vs</span>
              <span className="font-inter font-semibold text-lg text-white">
                {fixture.opponent}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={`font-inter font-semibold text-[0.625rem] uppercase px-2 py-1 rounded ${
                  fixture.venue === 'Home'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {fixture.venue === 'Home' ? 'HOME' : 'AWAY'}
              </span>
              <span className="font-inter text-sm text-slate-400">
                {fixture.venue === 'Home' ? 'Col\u00E1iste Br\u00EDde, Clondalkin' : fixture.opponent + ' Arena'}
              </span>
            </div>
          </div>

          {/* Result / Action */}
          <div className="shrink-0 flex items-center">
            {fixture.status === 'upcoming' && !isFixturePast(fixture) && (
              <Link
                to={fixture.ticketLink || '/contact'}
                className="bg-electric-blue text-white font-inter font-semibold text-sm px-5 py-2.5 rounded hover:bg-blue-400 hover:scale-[1.03] hover:shadow-lg transition-all duration-150 flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                Get Tickets
              </Link>
            )}
            {fixture.status === 'upcoming' && isFixturePast(fixture) && (
              <span className="font-inter font-semibold text-xs uppercase tracking-widest text-slate-500 bg-slate-700/40 border border-slate-700 px-3 py-2 rounded">
                Tickets Closed
              </span>
            )}
            {fixture.status === 'completed' && fixture.result && (
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span
                    className={`font-oswald font-bold text-2xl ${
                      fixture.result.won ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {fixture.result.lionsScore}-{fixture.result.opponentScore}
                  </span>
                  <span
                    className={`font-inter font-bold text-xs uppercase px-2 py-1 rounded ${
                      fixture.result.won
                        ? 'bg-green-400/10 text-green-400'
                        : 'bg-red-400/10 text-red-400'
                    }`}
                  >
                    {fixture.result.won ? 'W' : 'L'}
                  </span>
                </div>
                {fixture.mvp && (
                  <div className="font-inter text-xs text-amber-400 mt-1">
                    MVP: {fixture.mvp}
                  </div>
                )}
              </div>
            )}
            {fixture.status === 'live' && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-40" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="font-inter font-bold text-sm text-red-400">LIVE</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MonthGroup({ month, children }: { month: string; children: React.ReactNode }) {
  const { ref, visible } = useScrollReveal()

  return (
    <div ref={ref} className={`section-reveal ${visible ? 'visible' : ''}`}>
      <h3 className="font-oswald font-bold text-xl text-white mt-8 first:mt-0 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-electric-blue" />
        {month}
      </h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

// ─── Main Page ───
export default function Fixtures() {
  const [filter, setFilter] = useState<'all' | 'home' | 'away' | 'mens' | 'womens'>('all')

  const heroReveal = useScrollReveal()
  const tableReveal = useScrollReveal()
  const statsReveal = useScrollReveal()
  const venueReveal = useScrollReveal()
  const venueImageReveal = useScrollReveal()

  const fixtures = useLiveFixtures()

  // Pull the men's senior team's live stats into the standings table so the
  // Dublin Lions row reflects the data the manager edits in the dashboard.
  const liveStandings: Standing[] = (() => {
    const lions = getTeams().find((t) => t.id === 'men-senior-d1')
    if (!lions) return standings
    return standings.map((row) =>
      row.isLions
        ? {
            ...row,
            p: lions.wins + lions.losses,
            w: lions.wins,
            l: lions.losses,
            pf: lions.pointsFor,
            pa: lions.pointsAgainst,
            diff: lions.pointsFor - lions.pointsAgainst,
            pts: lions.wins * 3 + lions.losses,
          }
        : row
    )
  })()

  const filteredFixtures = fixtures
    .filter((f) => {
      if (filter === 'home') return f.venue === 'Home'
      if (filter === 'away') return f.venue === 'Away'
      return true
    })
    // Sort latest first (most recent date at the top).
    .slice()
    .sort((a, b) => {
      const da = new Date(`${a.monthLong} ${a.date} ${a.time}`).getTime()
      const db = new Date(`${b.monthLong} ${b.date} ${b.time}`).getTime()
      return db - da
    })

  const grouped = filteredFixtures.reduce<Record<string, Fixture[]>>((acc, f) => {
    if (!acc[f.monthLong]) acc[f.monthLong] = []
    acc[f.monthLong].push(f)
    return acc
  }, {})

  const filterTabs = [
    { key: 'all' as const, label: 'All Fixtures' },
    { key: 'home' as const, label: 'Home' },
    { key: 'away' as const, label: 'Away' },
    { key: 'mens' as const, label: "Men's" },
    { key: 'womens' as const, label: "Women's" },
  ]

  return (
    <div className="min-h-[100dvh]">
      {/* Hero */}
      <section className="bg-deep-navy h-56 md:h-72 flex items-center justify-center">
        <div
          ref={heroReveal.ref}
          className={`section-reveal ${heroReveal.visible ? 'visible' : ''} text-center px-4`}
        >
          <nav className="font-inter text-sm text-slate-400 mb-4">
            <Link to="/" className="hover:text-electric-blue transition-colors">Home</Link>
            <ChevronRight className="inline w-4 h-4 mx-1" />
            <span className="text-slate-300">Fixtures</span>
          </nav>
          <h1 className="font-oswald font-bold text-4xl md:text-5xl lg:text-6xl text-white tracking-tight">
            Fixtures & Results
          </h1>
          <p className="font-inter text-base text-slate-300 mt-4">
            2024/25 Season \u00B7 Domino's Division 1
          </p>
          <div className="mt-6 inline-flex items-center gap-2 border border-white/10 rounded-lg px-4 py-2">
            <ChevronDown className="w-4 h-4 text-slate-400" />
            <span className="font-inter font-medium text-sm text-slate-400">2024/25 Season</span>
          </div>
        </div>
      </section>

      {/* Standings Snapshot */}
      <section className="bg-soft-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div
            ref={tableReveal.ref}
            className={`section-reveal ${tableReveal.visible ? 'visible' : ''}`}
          >
            <h2 className="font-oswald font-bold text-2xl text-deep-navy mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-electric-blue" />
              Division 1 Standings
            </h2>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-deep-navy">
                      {['Pos', 'Team', 'P', 'W', 'L', 'PF', 'PA', '+/-', 'Pts'].map((h) => (
                        <th
                          key={h}
                          className="font-inter font-semibold text-xs uppercase text-white px-4 py-3 text-left"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {liveStandings.map((s, i) => (
                      <tr
                        key={s.team}
                        className={`font-inter text-sm ${
                          s.isLions
                            ? 'bg-blue-500/[0.08] text-electric-blue font-semibold'
                            : i % 2 === 0
                              ? 'bg-white text-slate-700'
                              : 'bg-soft-white text-slate-700'
                        }`}
                        style={{ transitionDelay: `${i * 50}ms` }}
                      >
                        <td className="px-4 py-3">{s.pos}</td>
                        <td className="px-4 py-3">{s.team}</td>
                        <td className="px-4 py-3">{s.p}</td>
                        <td className="px-4 py-3">{s.w}</td>
                        <td className="px-4 py-3">{s.l}</td>
                        <td className="px-4 py-3">{s.pf}</td>
                        <td className="px-4 py-3">{s.pa}</td>
                        <td className={`px-4 py-3 ${s.diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {s.diff > 0 ? `+${s.diff}` : s.diff}
                        </td>
                        <td className="px-4 py-3 font-semibold">{s.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Team Stats Row */}
          <div
            ref={statsReveal.ref}
            className={`section-reveal ${statsReveal.visible ? 'visible' : ''} mt-8 grid grid-cols-2 md:grid-cols-4 gap-4`}
            style={{ transitionDelay: '100ms' }}
          >
            {[
              { label: 'Position', value: '3rd' },
              { label: 'Win Rate', value: '57%' },
              { label: 'Points For', value: '1050' },
              { label: 'Form', value: 'W-W-L-W' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-lg p-4 shadow-sm text-center"
              >
                <div className="font-oswald font-bold text-2xl text-deep-navy">
                  {stat.value}
                </div>
                <div className="font-inter text-xs text-slate-500 uppercase tracking-wider mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transition strip */}
      <div className="section-transition-light-to-dark h-16" />

      {/* Fixture List */}
      <section className="bg-deep-navy py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1 mb-8">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2.5 font-inter font-medium text-sm rounded-lg transition-all duration-200 ${
                  filter === tab.key
                    ? 'text-white bg-white/5 border-b-2 border-electric-blue'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Fixtures by Month */}
          {Object.entries(grouped).map(([month, monthFixtures]) => (
            <MonthGroup key={month} month={month}>
              {monthFixtures.map((f, i) => (
                <FixtureCard key={f.id} fixture={f} index={i} />
              ))}
            </MonthGroup>
          ))}

          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-16">
              <p className="font-inter text-lg text-slate-400">No fixtures match this filter.</p>
            </div>
          )}

          {/* Load More */}
          <div className="mt-10 text-center">
            <button className="inline-flex items-center gap-2 border border-white/20 text-white font-inter font-medium text-sm px-6 py-3 rounded-lg hover:bg-white/5 transition-colors">
              Load More Fixtures
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Transition strip */}
      <div className="section-transition-dark-to-light h-16" />

      {/* Venue Information */}
      <section className="bg-soft-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div
              ref={venueReveal.ref}
              className={`section-reveal ${venueReveal.visible ? 'visible' : ''}`}
            >
              <h2 className="font-oswald font-bold text-2xl text-deep-navy flex items-center gap-2">
                <Home className="w-6 h-6 text-electric-blue" />
                Home Court
              </h2>
              <h3 className="font-inter font-semibold text-xl text-deep-navy mt-4">
                Col\u00E1iste Br\u00EDde
              </h3>
              <p className="font-inter text-base text-slate-700 mt-2">
                New Road, Clondalkin, Dublin 22, D22 AB12
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  'Court: Indoor hardwood, full regulation',
                  'Capacity: 250 spectators',
                  'Parking: Free on-site parking',
                  'Transport: Bus 76, 76A from City Centre',
                ].map((item) => (
                  <li
                    key={item}
                    className="font-inter text-base text-slate-700 flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-electric-blue shrink-0 mt-1" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://maps.google.com/?q=Col%C3%A1iste+Br%C3%ADde+Clondalkin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-inter font-semibold text-electric-blue mt-4 hover:underline"
              >
                Get Directions
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div
              ref={venueImageReveal.ref}
              className={`section-reveal ${venueImageReveal.visible ? 'visible' : ''} relative rounded-xl overflow-hidden shadow-xl`}
              style={{ transitionDelay: '150ms' }}
            >
              <img
                src={asset('venue-colaiste-bride.jpg')}
                alt="Col\u00E1iste Br\u00EDde"
                className="w-full aspect-video object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                <p className="font-inter font-medium text-white">
                  Col\u00E1iste Br\u00EDde, Clondalkin
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
