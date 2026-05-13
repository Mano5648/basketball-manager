import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSiteImage, asset } from '@/hooks/useSiteImages'
import {
  Trophy, Users, TrendingUp, Instagram, MapPin, Mail,
  User, Maximize2, ChevronLeft, ChevronRight, X, Check,
  Ticket, CreditCard, Banknote, CheckCircle,
} from 'lucide-react'
import {
  setTicketPrice, type TicketPrice, getTicketPrice,
  getPayments, setPayments, type Payment, addTicketPurchase,
  buildStripeCheckoutUrl,
} from '@/lib/clubData'

/* ─────────────────────── Scroll Reveal Hook ─────────────────────── */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}

/* ─────────────────────── Hero Section ─────────────────────── */
function HeroSection() {
  const [loaded, setLoaded] = useState(false)
  const heroImg = useSiteImage('hero')

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="relative min-h-[100dvh] flex items-end overflow-hidden">
      {/* Background Image */}
      <div
        className={`absolute inset-0 transition-all duration-1200 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
      >
        <img
          src={heroImg}
          alt="Dublin Lions team celebration"
          className="w-full h-full object-cover animate-ken-burns"
        />
      </div>

      {/* Gradient Overlay */}
      <div
        className={`absolute inset-0 hero-gradient-overlay transition-opacity duration-800 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Animated Gradient Wash */}
      <div className="absolute inset-0 animated-gradient-wash" />

      {/* Content */}
      <div className="relative z-10 w-full px-4 md:px-8 lg:px-16 pb-48 sm:pb-40 md:pb-48 pt-32">
        <div className="max-w-5xl mx-auto md:mx-0">
          <h1
            className={`font-oswald font-bold text-white leading-[0.9] tracking-[-0.03em] text-center md:text-left transition-all duration-800 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[60px]'
            }`}
            style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              transitionDelay: '400ms',
            }}
          >
            DUBLIN LIONS
          </h1>
          <h1
            className={`font-oswald font-bold text-white leading-[0.9] tracking-[-0.03em] text-center md:text-left transition-all duration-800 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[60px]'
            }`}
            style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              transitionDelay: '500ms',
            }}
          >
            BASKETBALL CLUB
          </h1>
          <p
            className={`font-inter text-lg text-slate-300 max-w-xl mt-6 text-center md:text-left transition-all duration-600 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]'
            }`}
            style={{ transitionDelay: '700ms' }}
          >
            Pride of Dublin. Competing in Irish Domino&apos;s Division 1 since 2018.
          </p>
          <div
            className={`flex flex-col sm:flex-row gap-4 mt-10 items-center md:items-start transition-all duration-500 ${
              loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
            style={{ transitionDelay: '900ms' }}
          >
            <Link
              to="/player/login"
              className="bg-electric-blue text-white font-inter font-semibold text-base uppercase tracking-widest px-8 py-4 rounded hover:bg-blue-400 hover:scale-[1.03] hover:shadow-lg transition-all duration-150 w-full sm:w-auto text-center"
            >
              Become a Member
            </Link>
            <Link
              to="/fixtures"
              className="border border-white/30 text-white font-inter font-semibold text-base uppercase tracking-widest px-8 py-4 rounded hover:bg-white/10 hover:border-white/40 transition-all duration-200 w-full sm:w-auto text-center"
            >
              View Fixtures
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Stats Row */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 transition-all duration-600 ${
          loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
        style={{
          transitionDelay: '1100ms',
          background: 'linear-gradient(to top, rgba(10,22,40,1) 0%, transparent 100%)',
        }}
      >
        <div className="border-t border-white/10 py-8 px-4 md:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: '2018', label: 'Founded' },
              { value: '2', label: 'Senior Teams' },
              { value: 'Div 1', label: 'Current League' },
              { value: 'Dublin', label: 'Home City' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center text-center transition-all duration-600"
                style={{
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${1100 + i * 100}ms`,
                }}
              >
                <span
                  className="font-oswald font-bold text-accent-gold"
                  style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
                >
                  {stat.value}
                </span>
                <span className="font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 mt-1">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── About Section ─────────────────────── */
function AboutSection() {
  const { ref, visible } = useScrollReveal()
  const { ref: imgRef, visible: imgVisible } = useScrollReveal()
  const { ref: cardsRef, visible: cardsVisible } = useScrollReveal()
  const aboutImg = useSiteImage('about')

  return (
    <section id="about" className="bg-soft-white py-24 md:py-32">
      <div ref={ref} className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column — Text */}
          <div
            className={`transition-all duration-600 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <span className="font-inter font-semibold text-xs uppercase tracking-widest text-electric-blue">
              ABOUT US
            </span>
            <h2
              className="font-oswald font-bold text-deep-navy mt-4"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
              }}
            >
              Built on Pride,<br />Driven by Passion
            </h2>
            <div className="mt-6 space-y-4 font-inter text-base text-slate-700 leading-relaxed">
              <p>
                Founded in 2018, Dublin Lions Basketball Club has grown from a small group of passionate players into one of Dublin&apos;s most exciting basketball organisations. We proudly field two senior teams — JOELS Dublin Lions (men) and Abbey Seals Dublin Lions (women) — both competing at the highest level of Irish amateur basketball.
              </p>
              <p>
                Our home is Coláiste Bríde in Clondalkin, Dublin 22, where we train, play, and build the next generation of Irish basketball talent. Under the guidance of Head Coach Rob White (men) and Haris Sikorskis (women), we combine professional coaching standards with a community-first ethos.
              </p>
              <p>
                Whether you&apos;re an aspiring player, a dedicated supporter, or a local business looking to partner with grassroots sport — there&apos;s a place for you in the Pride.
              </p>
            </div>
            <Link
              to="/teams"
              className="inline-block mt-8 border-2 border-electric-blue text-deep-navy font-inter font-semibold text-base uppercase tracking-widest px-8 py-4 rounded hover:bg-electric-blue hover:text-white transition-all duration-200"
            >
              Meet the Teams
            </Link>
          </div>

          {/* Right Column — Image + Values */}
          <div className="space-y-6">
            <div
              ref={imgRef}
              className={`transition-all duration-600 ${
                imgVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: '150ms' }}
            >
              <img
                src={aboutImg}
                alt="Dublin Lions team huddle"
                className="w-full rounded-lg shadow-xl object-cover aspect-[4/3]"
              />
            </div>
            <div
              ref={cardsRef}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {[
                {
                  icon: Trophy,
                  title: 'EXCELLENCE',
                  body: 'Professional coaching and elite competition standards',
                },
                {
                  icon: Users,
                  title: 'COMMUNITY',
                  body: 'Grassroots focus with deep local roots in Dublin 22',
                },
                {
                  icon: TrendingUp,
                  title: 'GROWTH',
                  body: 'Player development from amateur to Division 1',
                },
              ].map((card, i) => (
                <div
                  key={card.title}
                  className={`bg-white p-4 rounded-lg shadow-md transition-all duration-600 ${
                    cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${300 + i * 100}ms` }}
                >
                  <card.icon size={24} className="text-electric-blue mb-2" />
                  <h4 className="font-inter font-semibold text-sm text-deep-navy">
                    {card.title}
                  </h4>
                  <p className="font-inter text-sm text-slate-600 mt-1">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── Teams Section ─────────────────────── */
function TeamsSection() {
  const headerReveal = useScrollReveal()
  const mensReveal = useScrollReveal()
  const womensReveal = useScrollReveal()

  const playerKevin = useSiteImage('playerKevin')
  const playerTiago = useSiteImage('playerTiago')
  const playerTara = useSiteImage('playerTara')
  const playerEmily = useSiteImage('playerEmily')
  const match1 = useSiteImage('match1')
  const match2 = useSiteImage('match2')
  const match3 = useSiteImage('match3')
  const match5 = useSiteImage('match5')
  const match6 = useSiteImage('match6')
  const match7 = useSiteImage('match7')

  const menPlayers = [
    { name: 'Kevin Anyanwu', img: playerKevin },
    { name: 'Tiago Pereira', img: playerTiago },
    { name: 'Russ Marr', img: match1 },
    { name: 'Ignacio Folgueiras', img: match2 },
    { name: 'Tieran Howe', img: match3 },
  ]

  const womenPlayers = [
    { name: 'Tara Nevin', img: playerTara },
    { name: 'Emily Smyth', img: playerEmily },
    { name: 'Sinead Keane', img: match5 },
    { name: 'Makenzie Helms', img: match6 },
    { name: 'Rachel Brennan', img: match7 },
  ]

  return (
    <>
      {/* Transition Strip */}
      <div className="h-16 section-transition-light-to-dark" />
      <section id="teams" className="bg-deep-navy py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          {/* Section Header */}
          <div
            ref={headerReveal.ref}
            className={`text-center mb-16 transition-all duration-600 ${
              headerReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <span className="font-inter font-semibold text-xs uppercase tracking-widest text-electric-blue">
              OUR TEAMS
            </span>
            <h2
              className="font-oswald font-bold text-white mt-4"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
              }}
            >
              Two Teams.<br />One Pride.
            </h2>
            <p className="font-inter text-lg text-slate-300 max-w-xl mx-auto mt-4">
              Meet the players and coaches representing Dublin Lions in Irish Domino&apos;s Division 1.
            </p>
          </div>

          {/* Men's Team */}
          <div ref={mensReveal.ref} className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <img
                src={asset('sponsor-joels.png')}
                alt="JOELS"
                className="h-10 w-auto brightness-0 invert opacity-90"
              />
              <div>
                <h3 className="font-oswald font-bold text-2xl text-white">
                  JOELS DUBLIN LIONS
                </h3>
                <p className="font-inter text-sm text-slate-400">
                  Men&apos;s Senior Team
                </p>
              </div>
            </div>
            <p className="font-inter text-sm text-slate-400 mb-6">
              Head Coach: Rob White
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
              {menPlayers.map((player, i) => (
                <div
                  key={player.name}
                  className={`group bg-muted-navy rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                    mensReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={player.img}
                      alt={player.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-inter font-semibold text-sm text-white">
                      {player.name}
                    </p>
                    <p className="font-inter text-xs text-slate-400 mt-0.5">
                      Senior Player
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Women's Team */}
          <div ref={womensReveal.ref}>
            <div className="flex items-center gap-4 mb-6">
              <img
                src={asset('sponsor-abbey-seals.png')}
                alt="Abbey Seals"
                className="h-10 w-auto brightness-0 invert opacity-90"
              />
              <div>
                <h3 className="font-oswald font-bold text-2xl text-white">
                  ABBEY SEALS DUBLIN LIONS
                </h3>
                <p className="font-inter text-sm text-slate-400">
                  Women&apos;s Senior Team
                </p>
              </div>
            </div>
            <p className="font-inter text-sm text-slate-400 mb-6">
              Head Coach: Haris Sikorskis
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
              {womenPlayers.map((player, i) => (
                <div
                  key={player.name}
                  className={`group bg-muted-navy rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                    womensReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={player.img}
                      alt={player.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-inter font-semibold text-sm text-white">
                      {player.name}
                    </p>
                    <p className="font-inter text-xs text-slate-400 mt-0.5">
                      Senior Player
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View All CTA */}
          <div className="text-center mt-12">
            <Link
              to="/teams"
              className="font-inter font-semibold text-electric-blue hover:underline transition-all duration-200"
            >
              See Full Team Rosters →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

/* ─────────────────────── Schedule Section ─────────────────────── */
function ScheduleSection({ isManager }: { isManager: boolean }) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'results'>('upcoming')
  const headerReveal = useScrollReveal()
  const listReveal = useScrollReveal()

  const fixtures = [
    { day: 'SAT', date: '18', month: 'Jan', opponent: 'Neptune BC', venue: 'Home — Coláiste Bríde', time: '19:00', soldOut: false },
    { day: 'SAT', date: '25', month: 'Jan', opponent: 'UCD Marian', venue: 'Away — UCD Sports Centre', time: '18:30', soldOut: false },
    { day: 'SAT', date: '01', month: 'Feb', opponent: 'Belfast Star', venue: 'Home — Coláiste Bríde', time: '19:00', soldOut: false },
    { day: 'SAT', date: '08', month: 'Feb', opponent: 'Templeogue', venue: 'Away — Oblate Hall', time: '18:00', soldOut: false },
    { day: 'SAT', date: '15', month: 'Feb', opponent: 'Killester', venue: 'Home — Coláiste Bríde', time: '19:00', soldOut: false },
  ]

  const results = [
    { day: 'SAT', date: '14', month: 'Dec', opponent: 'Portlaoise Panthers', venue: 'Home — Coláiste Bríde', result: 'W 78-65' },
    { day: 'SAT', date: '07', month: 'Dec', opponent: 'Moycullen', venue: 'Away — Kingfisher', result: 'L 82-88' },
    { day: 'SAT', date: '30', month: 'Nov', opponent: 'Ballincollig', venue: 'Home — Coláiste Bríde', result: 'W 91-74' },
    { day: 'SAT', date: '23', month: 'Nov', opponent: 'Limerick Celtics', venue: 'Away — Crescent', result: 'W 85-79' },
  ]

  const getFixtureKey = (f: typeof fixtures[0]) => `${f.date}-${f.month}-${f.opponent}`

  return (
    <>
      <div className="h-16 section-transition-dark-to-light" />
      <section id="schedule" className="bg-soft-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          {/* Header */}
          <div
            ref={headerReveal.ref}
            className={`mb-10 transition-all duration-600 ${
              headerReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <span className="font-inter font-semibold text-xs uppercase tracking-widest text-electric-blue">
              FIXTURES & RESULTS
            </span>
            <h2
              className="font-oswald font-bold text-deep-navy mt-4"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
              }}
            >
              This Season&apos;s Battles
            </h2>
            <div className="flex gap-6 mt-6 border-b border-slate-200">
              {(
                [
                  { key: 'upcoming', label: 'Upcoming Fixtures' },
                  { key: 'results', label: 'Recent Results' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative font-inter font-semibold text-sm pb-3 transition-colors duration-200 ${
                    activeTab === tab.key
                      ? 'text-deep-navy'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric-blue rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div ref={listReveal.ref} className="space-y-4">
            {activeTab === 'upcoming' &&
              fixtures.map((f, i) => (
                <FixtureRow
                  key={`${f.date}-${f.month}-${f.opponent}`}
                  fixture={f}
                  index={i}
                  listVisible={listReveal.visible}
                  isManager={isManager}
                  fixtureKey={getFixtureKey(f)}
                />
              ))}

            {activeTab === 'results' &&
              results.map((r, i) => {
                const isWin = r.result.startsWith('W')
                return (
                  <div
                    key={`${r.date}-${r.month}`}
                    className={`flex flex-col md:flex-row items-start md:items-center gap-4 bg-white rounded-lg p-4 md:p-6 border border-slate-100 hover:border-electric-blue/20 hover:bg-blue-50/50 transition-all duration-200 ${
                      listReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-center md:flex-col md:items-center gap-2 md:gap-0 md:w-20 shrink-0">
                      <span className="font-inter font-semibold text-xs uppercase text-electric-blue md:mb-1">
                        {r.day}
                      </span>
                      <span
                        className="font-oswald font-bold text-deep-navy"
                        style={{ fontSize: '1.5rem' }}
                      >
                        {r.date}
                      </span>
                      <span className="font-inter text-xs uppercase text-slate-400 md:mt-0.5">
                        {r.month}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter font-semibold text-lg text-deep-navy">
                        Dublin Lions vs {r.opponent}
                      </p>
                      <p className="font-inter text-sm text-slate-500 mt-0.5">
                        {r.venue}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span
                        className={`font-oswald font-bold text-2xl ${
                          isWin ? 'text-accent-gold' : 'text-red-500'
                        }`}
                      >
                        {r.result}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/fixtures"
              className="font-inter font-semibold text-electric-blue hover:underline transition-all duration-200"
            >
              View Complete Season Calendar →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

/* ─── Individual Fixture Row with Ticket Pricing ─── */
function FixtureRow({
  fixture,
  index,
  listVisible,
  isManager,
  fixtureKey,
}: {
  fixture: { day: string; date: string; month: string; opponent: string; venue: string; time: string; soldOut: boolean }
  index: number
  listVisible: boolean
  isManager: boolean
  fixtureKey: string
}) {
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [price, setPrice] = useState<TicketPrice | null>(() => getTicketPrice(fixtureKey))

  const handlePriceUpdate = (adultPrice: number, kidPrice: number, enabled: boolean) => {
    setTicketPrice(fixtureKey, adultPrice, kidPrice, enabled)
    setPrice(getTicketPrice(fixtureKey))
  }

  return (
    <>
      <div
        className={`flex flex-col md:flex-row items-start md:items-center gap-4 bg-white rounded-lg p-4 md:p-6 border border-slate-100 hover:border-electric-blue/20 hover:bg-blue-50/50 transition-all duration-200 group ${
          listVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
        style={{ transitionDelay: `${index * 80}ms` }}
      >
        {/* Date Badge */}
        <div className="flex items-center md:flex-col md:items-center gap-2 md:gap-0 md:w-20 shrink-0">
          <span className="font-inter font-semibold text-xs uppercase text-electric-blue md:mb-1">
            {fixture.day}
          </span>
          <span
            className="font-oswald font-bold text-deep-navy"
            style={{ fontSize: '1.5rem' }}
          >
            {fixture.date}
          </span>
          <span className="font-inter text-xs uppercase text-slate-400 md:mt-0.5">
            {fixture.month}
          </span>
        </div>

        {/* Match Info */}
        <div className="flex-1 min-w-0">
          <p className="font-inter font-semibold text-lg text-deep-navy">
            Dublin Lions vs {fixture.opponent}
          </p>
          <p className="font-inter text-sm text-slate-500 mt-0.5">
            {fixture.venue} · Tip-off: {fixture.time}
          </p>
        </div>

        {/* Manager: editable prices */}
        {isManager && (
          <ManagerPriceEditor
            fixtureKey={fixtureKey}
            currentPrice={price}
            onUpdate={handlePriceUpdate}
          />
        )}

        {/* Public: ticket button */}
        {!isManager && (
          <div className="shrink-0">
            {fixture.soldOut ? (
              <span className="inline-block font-inter font-semibold text-xs uppercase tracking-widest text-red-500 bg-red-50 px-3 py-1 rounded">
                SOLD OUT
              </span>
            ) : price && price.enabled && (price.adultPrice > 0 || price.kidPrice > 0) ? (
              <button
                onClick={() => setTicketModalOpen(true)}
                className="bg-electric-blue text-white font-inter font-semibold text-sm uppercase tracking-widest px-4 py-2 rounded hover:bg-blue-400 transition-all duration-150 inline-flex items-center gap-2"
              >
                <Ticket size={16} />
                {price.adultPrice > 0 && `Adult €${price.adultPrice}`}
                {price.adultPrice > 0 && price.kidPrice > 0 && ' · '}
                {price.kidPrice > 0 && `Kid €${price.kidPrice}`}
              </button>
            ) : (
              <span className="inline-block font-inter font-semibold text-xs uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded">
                Tickets not yet available
              </span>
            )}
          </div>
        )}
      </div>

      {/* Ticket Purchase Modal */}
      {ticketModalOpen && price && (
        <TicketModal
          fixtureName={`Dublin Lions vs ${fixture.opponent}`}
          fixtureDate={`${fixture.day} ${fixture.date} ${fixture.month}`}
          venue={fixture.venue}
          time={fixture.time}
          price={price}
          fixtureKey={fixtureKey}
          onClose={() => setTicketModalOpen(false)}
        />
      )}
    </>
  )
}

/* ─── Manager Price Editor ─── */
function ManagerPriceEditor({
  fixtureKey: _fixtureKey,
  currentPrice,
  onUpdate,
}: {
  fixtureKey: string
  currentPrice: TicketPrice | null
  onUpdate: (adultPrice: number, kidPrice: number, enabled: boolean) => void
}) {
  const [adult, setAdult] = useState(currentPrice?.adultPrice ?? 0)
  const [kid, setKid] = useState(currentPrice?.kidPrice ?? 0)
  const [enabled, setEnabled] = useState(currentPrice?.enabled ?? false)

  return (
    <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked)
            onUpdate(adult, kid, e.target.checked)
          }}
          className="w-4 h-4 accent-electric-blue"
        />
        <span className="font-inter text-xs text-slate-500">Enable</span>
      </label>
      <div className="flex items-center gap-2">
        <span className="font-inter text-xs text-slate-400">Adult €</span>
        <input
          type="number"
          min={0}
          value={adult}
          onChange={(e) => setAdult(Number(e.target.value))}
          onBlur={() => onUpdate(adult, kid, enabled)}
          className="w-16 border border-slate-300 rounded px-2 py-1 font-inter text-sm text-deep-navy focus:border-electric-blue outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-inter text-xs text-slate-400">Kid €</span>
        <input
          type="number"
          min={0}
          value={kid}
          onChange={(e) => setKid(Number(e.target.value))}
          onBlur={() => onUpdate(adult, kid, enabled)}
          className="w-16 border border-slate-300 rounded px-2 py-1 font-inter text-sm text-deep-navy focus:border-electric-blue outline-none"
        />
      </div>
    </div>
  )
}

/* ─── Ticket Purchase Modal ─── */
function TicketModal({
  fixtureName,
  fixtureDate,
  venue,
  time,
  price,
  fixtureKey,
  onClose,
}: {
  fixtureName: string
  fixtureDate: string
  venue: string
  time: string
  price: TicketPrice
  fixtureKey: string
  onClose: () => void
}) {
  const [adultQty, setAdultQty] = useState(0)
  const [kidQty, setKidQty] = useState(0)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [receipt, setReceipt] = useState<{
    receiptId: string
    total: number
    adultQty: number
    kidQty: number
    isLoggedIn: boolean
  } | null>(null)

  const adultTotal = adultQty * (price.adultPrice ?? 0)
  const kidTotal = kidQty * (price.kidPrice ?? 0)
  const total = adultTotal + kidTotal

  const getUser = (): { id: string; name: string; email?: string } | null => {
    try {
      const raw = localStorage.getItem('dlbc_user')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (parsed.id || parsed._id) {
        return { id: parsed.id || parsed._id, name: parsed.name || parsed.email || 'User', email: parsed.email }
      }
      return null
    } catch { return null }
  }

  const user = getUser()
  const isLoggedIn = !!user

  const [stripeError, setStripeError] = useState('')

  const persistPurchase = (receiptId: string, status: 'succeeded' | 'pending') => {
    const paymentEntry: Payment = {
      id: receiptId,
      playerId: user?.id || 'guest',
      playerName: buyerName,
      amount: total,
      status,
      date: new Date().toISOString().split('T')[0],
      method: paymentMethod === 'card' ? 'Stripe' : 'Cash',
      plan: `Ticket - ${fixtureName}`,
    }

    const payments = getPayments()
    payments.push(paymentEntry)
    setPayments(payments)

    if (user?.id) {
      addTicketPurchase({
        userId: user.id,
        fixtureKey,
        fixtureName,
        fixtureDate,
        adultQty,
        kidQty,
        adultPrice: price.adultPrice,
        kidPrice: price.kidPrice,
        total,
        receiptId,
        paymentMethod,
        buyerName,
        buyerEmail,
      })
    }
  }

  const handleSubmit = () => {
    if (total <= 0) return
    if (!buyerName.trim()) return
    if (!buyerEmail.trim()) return

    const receiptId = `DLBC-${Date.now().toString(36).toUpperCase()}`

    if (paymentMethod === 'card') {
      const url = buildStripeCheckoutUrl(receiptId)
      if (!url) {
        setStripeError('Card payments are not yet configured. Please choose Pay at Gate, or contact the club to set up a Stripe Payment Link.')
        return
      }
      // Record the purchase as pending; manager confirms once Stripe webhook
      // (or manual reconciliation) marks it succeeded.
      persistPurchase(receiptId, 'pending')
      window.location.href = url
      return
    }

    persistPurchase(receiptId, 'pending')
    setReceipt({
      receiptId,
      total,
      adultQty,
      kidQty,
      isLoggedIn,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!receipt ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="font-oswald font-bold text-xl text-deep-navy">
                  {fixtureName}
                </h3>
                <p className="font-inter text-sm text-slate-500 mt-1">
                  {fixtureDate} · {venue} · {time}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-deep-navy transition-colors"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Adult Tickets */}
              {price.adultPrice > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-inter font-semibold text-deep-navy">Adult Ticket</p>
                    <p className="font-inter text-sm text-slate-500">€{price.adultPrice} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAdultQty(Math.max(0, adultQty - 1))}
                      className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-deep-navy hover:bg-slate-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-inter font-semibold text-lg w-6 text-center">
                      {adultQty}
                    </span>
                    <button
                      onClick={() => setAdultQty(adultQty + 1)}
                      className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-deep-navy hover:bg-slate-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Kid Tickets */}
              {price.kidPrice > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-inter font-semibold text-deep-navy">Kid Ticket</p>
                    <p className="font-inter text-sm text-slate-500">€{price.kidPrice} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setKidQty(Math.max(0, kidQty - 1))}
                      className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-deep-navy hover:bg-slate-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-inter font-semibold text-lg w-6 text-center">
                      {kidQty}
                    </span>
                    <button
                      onClick={() => setKidQty(kidQty + 1)}
                      className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-deep-navy hover:bg-slate-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Running Total */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-inter font-semibold text-deep-navy">Total</span>
                  <span className="font-oswald font-bold text-2xl text-electric-blue">
                    €{total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="space-y-3">
                <div>
                  <label className="font-inter text-sm font-medium text-deep-navy mb-1 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full border border-slate-300 rounded px-4 py-2 font-inter text-sm text-deep-navy placeholder:text-slate-400 focus:border-electric-blue outline-none transition-all"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="font-inter text-sm font-medium text-deep-navy mb-1 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded px-4 py-2 font-inter text-sm text-deep-navy placeholder:text-slate-400 focus:border-electric-blue outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="font-inter text-sm font-medium text-deep-navy mb-2 block">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 flex items-center justify-center gap-2 font-inter font-semibold text-sm px-4 py-3 rounded border transition-all duration-200 ${
                      paymentMethod === 'card'
                        ? 'border-electric-blue bg-blue-50 text-electric-blue'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard size={16} />
                    Pay by Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 flex items-center justify-center gap-2 font-inter font-semibold text-sm px-4 py-3 rounded border transition-all duration-200 ${
                      paymentMethod === 'cash'
                        ? 'border-electric-blue bg-blue-50 text-electric-blue'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Banknote size={16} />
                    Pay at Gate
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100">
              {stripeError && (
                <p className="font-inter text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 mb-3">
                  {stripeError}
                </p>
              )}
              <button
                onClick={handleSubmit}
                disabled={total <= 0 || !buyerName.trim() || !buyerEmail.trim()}
                className="w-full bg-electric-blue text-white font-inter font-semibold text-base uppercase tracking-widest px-4 py-4 rounded hover:bg-blue-400 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {paymentMethod === 'card' ? (
                  <>
                    <CreditCard size={18} />
                    Pay with Stripe
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Confirm Booking
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Receipt View */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="font-oswald font-bold text-2xl text-deep-navy">
              Tickets Purchased!
            </h3>
            <p className="font-inter text-sm text-slate-500 mt-2">
              Receipt ID: <span className="font-mono font-semibold text-deep-navy">{receipt.receiptId}</span>
            </p>

            <div className="mt-6 bg-slate-50 rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="font-inter text-sm text-slate-500">Fixture</span>
                <span className="font-inter text-sm text-deep-navy text-right">{fixtureName}</span>
              </div>
              {receipt.adultQty > 0 && (
                <div className="flex justify-between">
                  <span className="font-inter text-sm text-slate-500">Adult x{receipt.adultQty}</span>
                  <span className="font-inter text-sm text-deep-navy">€{(receipt.adultQty * price.adultPrice).toFixed(2)}</span>
                </div>
              )}
              {receipt.kidQty > 0 && (
                <div className="flex justify-between">
                  <span className="font-inter text-sm text-slate-500">Kid x{receipt.kidQty}</span>
                  <span className="font-inter text-sm text-deep-navy">€{(receipt.kidQty * price.kidPrice).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="font-inter font-semibold text-deep-navy">Total Paid</span>
                <span className="font-oswald font-bold text-electric-blue">€{receipt.total.toFixed(2)}</span>
              </div>
            </div>

            <p className="font-inter text-sm text-slate-600 mt-6">
              {receipt.isLoggedIn
                ? 'Your tickets are saved to your account.'
                : 'A confirmation has been sent to your email.'}
            </p>

            <button
              onClick={onClose}
              className="mt-6 w-full bg-electric-blue text-white font-inter font-semibold text-sm uppercase tracking-widest px-4 py-3 rounded hover:bg-blue-400 transition-all duration-150"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── Gallery Section ─────────────────────── */
function GallerySection() {
  const headerReveal = useScrollReveal()
  const gridReveal = useScrollReveal()
  const [lightbox, setLightbox] = useState<number | null>(null)

  const match1 = useSiteImage('match1')
  const match2 = useSiteImage('match2')
  const match3 = useSiteImage('match3')
  const match4 = useSiteImage('match4')
  const match5 = useSiteImage('match5')
  const match6 = useSiteImage('match6')
  const match7 = useSiteImage('match7')
  const match8 = useSiteImage('match8')

  const galleryImages = [match1, match2, match3, match4, match5, match6, match7, match8]

  const openLightbox = (index: number) => setLightbox(index)
  const closeLightbox = () => setLightbox(null)
  const nextImage = useCallback(() => {
    setLightbox((prev) => (prev === null ? null : (prev + 1) % galleryImages.length))
  }, [galleryImages.length])
  const prevImage = useCallback(() => {
    setLightbox((prev) => (prev === null ? null : (prev - 1 + galleryImages.length) % galleryImages.length))
  }, [galleryImages.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightbox === null) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, nextImage, prevImage])

  useEffect(() => {
    if (lightbox !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  return (
    <>
      <div className="h-16 section-transition-light-to-dark" />
      <section id="gallery" className="bg-deep-navy py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          {/* Header */}
          <div
            ref={headerReveal.ref}
            className={`text-center mb-10 transition-all duration-600 ${
              headerReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <span className="font-inter font-semibold text-xs uppercase tracking-widest text-electric-blue">
              GALLERY
            </span>
            <h2
              className="font-oswald font-bold text-white mt-4"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
              }}
            >
              The Pride in Action
            </h2>
            <p className="font-inter text-base text-slate-300 max-w-md mx-auto mt-4">
              Moments from the court, the locker room, and the community.
            </p>
          </div>

          {/* Grid */}
          <div
            ref={gridReveal.ref}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {galleryImages.map((img, i) => (
              <button
                key={img}
                onClick={() => openLightbox(i)}
                className={`group relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-600 ${
                  gridReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <img
                  src={img}
                  alt={`Match action ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  <Maximize2
                    size={24}
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Instagram CTA */}
          <div className="text-center mt-10">
            <a
              href="https://www.instagram.com/dublinlionsbc/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-inter font-semibold text-electric-blue hover:underline transition-all duration-200"
            >
              <Instagram size={18} />
              Follow Us on Instagram →
            </a>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 hover:text-electric-blue transition-colors"
            onClick={closeLightbox}
            aria-label="Close"
          >
            <X size={32} />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 hover:text-electric-blue transition-colors"
            onClick={(e) => { e.stopPropagation(); prevImage() }}
            aria-label="Previous"
          >
            <ChevronLeft size={40} />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 hover:text-electric-blue transition-colors"
            onClick={(e) => { e.stopPropagation(); nextImage() }}
            aria-label="Next"
          >
            <ChevronRight size={40} />
          </button>
          <img
            src={galleryImages[lightbox]}
            alt={`Gallery image ${lightbox + 1}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

/* ─────────────────────── Membership CTA Section ─────────────────────── */
function MembershipSection() {
  const headerReveal = useScrollReveal()
  const cardsReveal = useScrollReveal()

  const tiers = [
    {
      title: 'YOUTH MEMBER',
      price: '€150 / season',
      features: [
        'Weekly training sessions',
        'Club jersey included',
        'Access to club facilities',
        'Priority match tickets',
      ],
      featured: false,
    },
    {
      title: 'ADULT PLAYER',
      price: '€250 / season',
      features: [
        'Weekly training sessions',
        'Club jersey included',
        'Access to club facilities',
        'Priority match tickets',
        'Division 1 squad eligibility',
        'Gym membership',
        'Travel to away games',
      ],
      featured: true,
      badge: 'MOST POPULAR',
    },
    {
      title: 'SUPPORTER',
      price: '€50 / season',
      features: [
        'Season ticket to all home games',
        'Club newsletter',
        'Supporters club events',
        'Club merchandise discount',
      ],
      featured: false,
    },
  ]

  return (
    <>
      <div className="h-16 section-transition-dark-to-gradient" style={{ background: 'linear-gradient(to bottom, #0A1628, #0A1628)' }} />
      <section
        id="membership"
        className="cta-gradient py-24 md:py-32"
      >
        <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-12 text-center">
          <div
            ref={headerReveal.ref}
            className={`transition-all duration-600 ${
              headerReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h2
              className="font-oswald font-bold text-white"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
              }}
            >
              Be Part of the Pride
            </h2>
            <p className="font-inter text-lg text-slate-300 max-w-2xl mx-auto mt-6 leading-relaxed">
              Join Dublin Lions Basketball Club for the 2025/26 season. Membership includes training access, matchday tickets, club gear, and entry to exclusive club events. Open to all skill levels — from beginners to Division 1 hopefuls.
            </p>
          </div>

          {/* Tier Cards */}
          <div
            ref={cardsReveal.ref}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
          >
            {tiers.map((tier, i) => (
              <div
                key={tier.title}
                className={`relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-electric-blue/50 ${
                  tier.featured ? 'md:-mt-4 md:mb-4 md:py-10' : ''
                } ${
                  cardsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{
                  transitionDelay: `${i * 150}ms`,
                  transform: cardsReveal.visible
                    ? tier.featured ? 'translateY(-8px)' : 'translateY(0)'
                    : 'translateY(20px)',
                }}
              >
                {tier.badge && (
                  <span className="absolute -top-3 right-4 bg-accent-gold text-deep-navy font-inter font-semibold text-xs uppercase tracking-wider px-3 py-1 rounded">
                    {tier.badge}
                  </span>
                )}
                <p className="font-inter font-semibold text-xs uppercase tracking-widest text-white mb-2">
                  {tier.title}
                </p>
                <p
                  className="font-oswald font-bold text-accent-gold mb-6"
                  style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                  }}
                >
                  {tier.price}
                </p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check size={16} className="text-electric-blue shrink-0 mt-1" />
                      <span className="font-inter text-sm text-slate-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/player/login"
                  className="block text-center w-full bg-electric-blue text-white font-inter font-semibold text-sm uppercase tracking-widest px-4 py-3 rounded hover:bg-blue-400 transition-all duration-150"
                >
                  Sign Up
                </Link>
              </div>
            ))}
          </div>

          <p className="font-inter text-sm text-slate-500 max-w-xl mx-auto mt-8">
            All membership fees support player development, facility hire, and competition costs. Dublin Lions is a registered amateur sports club.
          </p>
        </div>
      </section>
    </>
  )
}

/* ─────────────────────── Contact Section ─────────────────────── */
function ContactSection() {
  const headerReveal = useScrollReveal()
  const formReveal = useScrollReveal()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Enquiry',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', subject: 'General Enquiry', message: '' })
    }, 3000)
  }

  return (
    <>
      <div className="h-16" style={{ background: 'linear-gradient(to bottom, #0A1628, #F8FAFC)' }} />
      <section id="contact" className="bg-soft-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          {/* Header */}
          <div
            ref={headerReveal.ref}
            className={`mb-12 transition-all duration-600 ${
              headerReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <span className="font-inter font-semibold text-xs uppercase tracking-widest text-electric-blue">
              GET IN TOUCH
            </span>
            <h2
              className="font-oswald font-bold text-deep-navy mt-4"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
              }}
            >
              Contact the Pride
            </h2>
            <p className="font-inter text-base text-slate-700 max-w-xl mt-4 leading-relaxed">
              Have a question about membership, interested in sponsoring the club, or want to book a friendly? Reach out — we&apos;d love to hear from you.
            </p>
          </div>

          {/* Two Column Layout */}
          <div ref={formReveal.ref} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div
              className={`bg-white rounded-xl shadow-lg p-8 transition-all duration-600 ${
                formReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <h3 className="font-inter font-semibold text-lg text-deep-navy">
                    Message sent!
                  </h3>
                  <p className="font-inter text-sm text-slate-500 mt-2">
                    We&apos;ll be in touch soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="font-inter text-sm font-medium text-deep-navy mb-1 block">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-slate-300 rounded px-4 py-3 font-inter text-base text-deep-navy placeholder:text-slate-400 focus:border-accent-gold focus:ring-2 focus:ring-amber-300/30 outline-none transition-all"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="font-inter text-sm font-medium text-deep-navy mb-1 block">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-slate-300 rounded px-4 py-3 font-inter text-base text-deep-navy placeholder:text-slate-400 focus:border-accent-gold focus:ring-2 focus:ring-amber-300/30 outline-none transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="font-inter text-sm font-medium text-deep-navy mb-1 block">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full border border-slate-300 rounded px-4 py-3 font-inter text-base text-deep-navy focus:border-accent-gold focus:ring-2 focus:ring-amber-300/30 outline-none transition-all bg-white"
                    >
                      <option>General Enquiry</option>
                      <option>Membership</option>
                      <option>Sponsorship</option>
                      <option>Press</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-inter text-sm font-medium text-deep-navy mb-1 block">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full border border-slate-300 rounded px-4 py-3 font-inter text-base text-deep-navy placeholder:text-slate-400 focus:border-accent-gold focus:ring-2 focus:ring-amber-300/30 outline-none transition-all resize-none"
                      placeholder="Tell us what's on your mind..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-electric-blue text-white font-inter font-semibold text-base uppercase tracking-widest px-4 py-4 rounded hover:bg-blue-400 transition-all duration-150 mt-2"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {/* Contact Details */}
            <div
              className={`space-y-8 transition-all duration-600 ${
                formReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: '150ms' }}
            >
              {[
                {
                  icon: MapPin,
                  title: 'Home Court',
                  info: 'Coláiste Bríde, New Road, Clondalkin, Dublin 22, Ireland',
                },
                {
                  icon: Mail,
                  title: 'General Enquiries',
                  info: 'info@dublinlions.ie',
                },
                {
                  icon: Instagram,
                  title: 'Follow Us',
                  info: '@dublinlionsbc on Instagram',
                },
                {
                  icon: User,
                  title: 'Club Secretary',
                  info: 'Jack Maguire — secretary@dublinlions.ie',
                },
              ].map((detail) => (
                <div key={detail.title} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white shadow-md flex items-center justify-center shrink-0">
                    <detail.icon size={24} className="text-electric-blue" />
                  </div>
                  <div>
                    <h4 className="font-inter font-semibold text-lg text-deep-navy">
                      {detail.title}
                    </h4>
                    <p className="font-inter text-base text-slate-600 mt-1">
                      {detail.info}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

/* ─────────────────────── Home Page ─────────────────────── */
export default function Home() {
  const [isManager, setIsManager] = useState(false)

  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem('dlbc_user')
        setIsManager(!!raw && JSON.parse(raw).role === 'manager')
      } catch { setIsManager(false) }
    }
    check()
    window.addEventListener('storage', check)
    window.addEventListener('dlbc-auth-change', check)
    return () => {
      window.removeEventListener('storage', check)
      window.removeEventListener('dlbc-auth-change', check)
    }
  }, [])

  return (
    <div>
      <HeroSection />
      <AboutSection />
      <TeamsSection />
      <ScheduleSection isManager={isManager} />
      <GallerySection />
      <MembershipSection />
      <ContactSection />
    </div>
  )
}
