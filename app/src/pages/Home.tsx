import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { useSiteImage, useSiteText } from '@/hooks/useSiteImages'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import HeroBackground from '@/components/HeroBackground'
import HeroHeadline from '@/components/HeroHeadline'
import {
  Instagram, MapPin, Mail,
  User, Maximize2, ChevronLeft, ChevronRight, X, Check,
  Ticket, CreditCard, Banknote, CheckCircle,
} from 'lucide-react'
import {
  type TicketPrice,
  getPayments, setPayments, type Payment, addTicketPurchase,
  recordGuestCardPayment,
  getFixtures, type ClubFixture,
} from '@/lib/clubData'
import { PaymentCheckout } from '@/components/PaymentCheckout'
import { redirectToStripeCheckout } from '@/lib/stripeCheckout'
import { getLoggedInContact } from '@/lib/authUser'
import { sendPurchaseConfirmationEmail } from '@/lib/purchaseEmail'
import { toAbsoluteImageUrl } from '@/lib/imageUrl'
import { PrivacyConsentField } from '@/components/security/PrivacyConsentField'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'
import { validatePublicFormSecurity } from '@/lib/security'
/* ─────────────────────── Hero Section ─────────────────────── */
function HeroSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      <HeroBackground />

      <div className="absolute inset-0 ldf-hero-overlay pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 md:px-10 py-24 text-center">
        <HeroHeadline />
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        aria-hidden
      >
        <span className="font-inter text-[10px] uppercase tracking-[0.25em]">Scroll</span>
        <motion.span
          className="block h-8 w-px bg-gradient-to-b from-white/50 to-transparent"
          animate={reduceMotion ? {} : { scaleY: [1, 0.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  )
}

/* ─────────────────────── About Section ─────────────────────── */
function AboutSection() {
  const { ref, visible } = useScrollReveal()
  const { ref: imgRef, visible: imgVisible } = useScrollReveal()
  const aboutImg = useSiteImage('about')

  const workItems = [
    "Senior men's and women's competition",
    'Youth development pathways',
    'Community outreach and local partnerships',
    'Match-day experiences for families and fans',
  ]

  return (
    <section id="about" className="site-light py-24 md:py-36">
      <div ref={ref} className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div
            className={`scroll-reveal-left ${visible ? 'scroll-reveal-left--in' : ''}`}
          >
            <h4 className="font-inter text-sm font-semibold text-lions-600 mb-4">About us</h4>
            <h2
              className="ldf-section-title text-slate-900"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}
            >
              Built on pride, driven by passion
            </h2>
            <div className="mt-6 space-y-5 font-inter text-base text-slate-600 leading-relaxed max-w-xl">
              <p>
                Founded in 2018, Dublin Lions Basketball Club has grown from a small group of passionate players into one of Dublin&apos;s most exciting basketball organisations. We field two senior teams competing at the highest level of Irish amateur basketball.
              </p>
              <p>
                Under Head Coach Rob White (men) and Haris Sikorskis (women), we combine professional coaching standards with a community-first ethos. Whether you want to play, support, or partner with grassroots sport, there is a place for you in the Pride.
              </p>
            </div>
            <div className="mt-8">
              <p className="font-inter text-sm font-semibold text-slate-900 mb-3">Our work includes:</p>
              <ul className="space-y-2 font-inter text-base text-slate-600">
                {workItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-lions-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link to="/teams" className="ldf-btn-primary-dark mt-10">
              Meet the teams
            </Link>
          </div>

          <div
            ref={imgRef}
            className={`scroll-reveal-right ${imgVisible ? 'scroll-reveal-right--in' : ''}`}
            style={{ transitionDelay: '150ms' }}
          >
            <img
              src={aboutImg}
              alt="Dublin Lions team huddle"
              className="w-full rounded-[2rem] object-cover aspect-[4/5] shadow-[0_24px_80px_-24px_rgba(11,18,32,0.35)]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── Pathways (LDF-style) ─────────────────────── */
function PathwaysSection() {
  const { ref, visible } = useScrollReveal()

  const paths = [
    {
      num: '01',
      title: 'Become a member',
      body: 'Join the squad, pay fees, check fixtures, and stay match-ready through the player portal.',
      cta: 'Player login',
      href: '/player/login',
    },
    {
      num: '02',
      title: 'Support on game night',
      body: 'Follow the season, buy tickets for home fixtures, and cheer on the Pride from the stands.',
      cta: 'View fixtures',
      href: '/fixtures',
    },
  ]

  return (
    <section className="site-light border-t border-slate-200/80 py-24 md:py-32">
      <div ref={ref} className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <h2
          className={`ldf-section-title text-slate-900 text-center mb-14 scroll-reveal-up ${visible ? 'scroll-reveal-up--in' : ''}`}
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}
        >
          Two ways to get involved
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {paths.map((path, i) => (
            <div
              key={path.num}
              className={`rounded-[2rem] bg-white border border-slate-200/80 p-8 md:p-10 flex flex-col scroll-reveal-up ${visible ? 'scroll-reveal-up--in' : ''}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <span className="font-inter text-sm font-medium text-lions-600">{path.num}</span>
              <h3 className="ldf-section-title text-slate-900 mt-3 text-2xl">{path.title}</h3>
              <p className="font-inter text-base text-slate-600 leading-relaxed mt-4 flex-1">{path.body}</p>
              <Link
                to={path.href}
                className="mt-8 inline-flex items-center gap-2 font-inter text-sm font-semibold text-lions-600 hover:text-lions-700 transition-colors"
              >
                {path.cta}
                <ChevronRight size={16} />
              </Link>
            </div>
          ))}
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
  const nameKevin = useSiteText('playerKevin', 'Kevin Anyanwu')
  const nameTiago = useSiteText('playerTiago', 'Tiago Pereira')
  const nameTara = useSiteText('playerTara', 'Tara Nevin')
  const nameEmily = useSiteText('playerEmily', 'Emily Smyth')
  const coachMenName = useSiteText('coachRob', 'Rob White')
  const coachWomenName = useSiteText('coachWomenName', 'Haris Sikorskis')

  const menPlayers = [
    { name: nameKevin, img: playerKevin },
    { name: nameTiago, img: playerTiago },
    { name: 'Russ Marr', img: match1 },
    { name: 'Ignacio Folgueiras', img: match2 },
    { name: 'Tieran Howe', img: match3 },
  ]

  const womenPlayers = [
    { name: nameTara, img: playerTara },
    { name: nameEmily, img: playerEmily },
    { name: 'Sinead Keane', img: match5 },
    { name: 'Makenzie Helms', img: match6 },
    { name: 'Rachel Brennan', img: match7 },
  ]

  return (
    <>
      <div className="h-10 bg-[#F4F6FA]" />
      <section id="teams" className="site-dark py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div
            ref={headerReveal.ref}
            className={`text-center mb-16 scroll-reveal-up ${headerReveal.visible ? 'scroll-reveal-up--in' : ''}`}
          >
            <h4 className="font-inter text-sm font-semibold text-lions-400">Our teams</h4>
            <h2
              className="ldf-section-title text-white mt-3"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}
            >
              Two teams, one pride
            </h2>
            <p className="font-inter text-lg text-slate-300 max-w-xl mx-auto mt-4">
              Meet the players and coaches representing Dublin Lions in Irish Domino&apos;s Division 1.
            </p>
          </div>

          {/* Men's Team */}
          <div ref={mensReveal.ref} className="mb-16">
            <div className="flex items-center gap-4 mb-6">
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
              Head Coach: {coachMenName}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
              {menPlayers.map((player, i) => (
                <div
                  key={player.name}
                  className={`group bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-lions-400/30 scroll-reveal-up ${
                    mensReveal.visible ? 'scroll-reveal-up--in' : ''
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
              Head Coach: {coachWomenName}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
              {womenPlayers.map((player, i) => (
                <div
                  key={player.name}
                  className={`group bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-lions-400/30 scroll-reveal-up ${
                    womensReveal.visible ? 'scroll-reveal-up--in' : ''
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
function ScheduleSection() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'results'>('upcoming')
  const [allFixtures, setAllFixtures] = useState<ClubFixture[]>(() => getFixtures())
  const headerReveal = useScrollReveal()
  const listReveal = useScrollReveal()

  useEffect(() => {
    const sync = () => setAllFixtures(getFixtures())
    const h = (e: StorageEvent) => { if (e.key === 'dlbc_fixtures') sync() }
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }, [])

  const toRowParts = (f: ClubFixture) => {
    const d = new Date(`${f.date}T${f.time || '00:00'}`)
    return {
      day: d.toLocaleDateString('en-IE', { weekday: 'short' }).toUpperCase(),
      date: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleDateString('en-IE', { month: 'short' }),
    }
  }

  // Public fixtures show the next 5 upcoming and most recent 4 completed.
  // Future fixtures listed soonest-first.
  const fixtures = allFixtures
    .filter((f) => !f.result)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 5)
    .map((f) => ({
      ...toRowParts(f),
      id: f.id,
      opponent: f.opponent,
      venue: `${f.venue} — ${f.venue === 'Home' ? 'Coláiste Bríde' : f.opponent + ' Arena'}`,
      time: f.time,
      soldOut: !!f.soldOut,
      ticketsEnabled: !!f.ticketsEnabled,
      adultPrice: f.adultPrice ?? 0,
      kidPrice: f.kidPrice ?? 0,
    }))

  const results = allFixtures
    .filter((f) => !!f.result)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
    .slice(0, 4)
    .map((f) => {
      const parts = toRowParts(f)
      const r = f.result!
      const tag = r.lionsScore > r.opponentScore ? 'W' : 'L'
      return {
        ...parts,
        opponent: f.opponent,
        venue: `${f.venue} — ${f.venue === 'Home' ? 'Coláiste Bríde' : f.opponent + ' Arena'}`,
        result: `${tag} ${r.lionsScore}-${r.opponentScore}`,
      }
    })


  return (
    <>
      <div className="h-10" />
      <section id="schedule" className="site-light py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          {/* Header */}
          <div
            ref={headerReveal.ref}
            className={`mb-10 scroll-reveal-up ${headerReveal.visible ? 'scroll-reveal-up--in' : ''}`}
          >
            <span className="font-inter text-sm font-semibold text-lions-600">
              Fixtures & results
            </span>
            <h2
              className="ldf-section-title text-slate-900 mt-2"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}
            >
              This season&apos;s battles
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
                      ? 'text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lions-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div ref={listReveal.ref} className="space-y-4">
            {activeTab === 'upcoming' && fixtures.length === 0 && (
              <p className="text-center font-inter text-sm text-slate-500 py-8">
                No upcoming fixtures right now — check back soon.
              </p>
            )}
            {activeTab === 'upcoming' &&
              fixtures.map((f, i) => (
                <FixtureRow
                  key={f.id}
                  fixture={f}
                  index={i}
                  listVisible={listReveal.visible}
                />
              ))}

            {activeTab === 'results' &&
              results.map((r, i) => {
                const isWin = r.result.startsWith('W')
                return (
                  <div
                    key={`${r.date}-${r.month}`}
                    className={`flex flex-col md:flex-row items-start md:items-center gap-4 bg-white rounded-[1.5rem] p-4 md:p-6 border border-slate-200 hover:border-lions-300 hover:shadow-[0_12px_40px_-20px_rgba(46,107,255,0.2)] transition-all duration-200 scroll-reveal-up ${
                      listReveal.visible ? 'scroll-reveal-up--in' : ''
                    }`}
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-center md:flex-col md:items-center gap-2 md:gap-0 md:w-20 shrink-0">
                      <span className="font-inter font-semibold text-xs uppercase text-lions-600 md:mb-1">
                        {r.day}
                      </span>
                      <span
                className="font-oswald font-bold text-slate-900"
                style={{ fontSize: '1.5rem' }}
                      >
                        {r.date}
                      </span>
                      <span className="font-inter text-xs uppercase text-slate-400 md:mt-0.5">
                        {r.month}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
          <p className="font-inter font-semibold text-lg text-slate-900">
            Dublin Lions vs {r.opponent}
          </p>
          <p className="font-inter text-sm text-slate-400 mt-0.5">
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
}: {
  fixture: {
    id: string; day: string; date: string; month: string; opponent: string;
    venue: string; time: string; soldOut: boolean;
    ticketsEnabled: boolean; adultPrice: number; kidPrice: number;
  }
  index: number
  listVisible: boolean
}) {
  const [ticketModalOpen, setTicketModalOpen] = useState(false)

  // Build a TicketPrice-shaped object from the fixture for the TicketModal.
  const price: TicketPrice = {
    fixtureKey: fixture.id,
    adultPrice: fixture.adultPrice,
    kidPrice: fixture.kidPrice,
    enabled: fixture.ticketsEnabled,
  }
  const showBuy = price.enabled && (price.adultPrice > 0 || price.kidPrice > 0)

  // Fixture dates are short-form (e.g. "Jan 18"); assume current year and skip
  // fixtures whose tip-off time has already passed.
  const isPast = (() => {
    const year = new Date().getFullYear()
    const d = new Date(`${fixture.month} ${fixture.date} ${year} ${fixture.time}`)
    if (isNaN(d.getTime())) return false
    const sixMonths = 1000 * 60 * 60 * 24 * 183
    if (d.getTime() - Date.now() > sixMonths) return true
    return d.getTime() < Date.now()
  })()

  return (
    <>
      <div
        className={`flex flex-col md:flex-row items-start md:items-center gap-4 bg-white rounded-[1.5rem] p-4 md:p-6 border border-slate-200 hover:border-lions-300 hover:shadow-[0_12px_40px_-20px_rgba(46,107,255,0.2)] transition-all duration-200 group scroll-reveal-up ${
          listVisible ? 'scroll-reveal-up--in' : ''
        }`}
        style={{ transitionDelay: `${index * 80}ms` }}
      >
        {/* Date Badge */}
        <div className="flex items-center md:flex-col md:items-center gap-2 md:gap-0 md:w-20 shrink-0">
          <span className="font-inter font-semibold text-xs uppercase text-lions-400 md:mb-1">
            {fixture.day}
          </span>
          <span
                className="font-oswald font-bold text-slate-900"
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
          <p className="font-inter font-semibold text-lg text-slate-900">
            Dublin Lions vs {fixture.opponent}
          </p>
          <p className="font-inter text-sm text-slate-400 mt-0.5">
            {fixture.venue} · Tip-off: {fixture.time}
          </p>
        </div>

        <div className="shrink-0">
          {isPast ? (
            <span className="inline-block font-inter font-semibold text-xs uppercase tracking-widest text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              Tickets Closed
            </span>
          ) : fixture.soldOut ? (
            <span className="inline-block font-inter font-semibold text-xs uppercase tracking-widest text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              SOLD OUT
            </span>
          ) : showBuy ? (
            <button
              onClick={() => setTicketModalOpen(true)}
              className="ldf-btn-primary-dark text-sm px-5 py-2.5 inline-flex items-center gap-2"
            >
              <Ticket size={16} />
              {price.adultPrice > 0 && `Adult €${price.adultPrice}`}
              {price.adultPrice > 0 && price.kidPrice > 0 && ' · '}
              {price.kidPrice > 0 && `Kid €${price.kidPrice}`}
            </button>
          ) : (
            <span className="inline-block font-inter font-semibold text-xs uppercase tracking-widest text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              Tickets not yet available
            </span>
          )}
        </div>
      </div>

      {ticketModalOpen && (
        <TicketModal
          fixtureName={`Dublin Lions vs ${fixture.opponent}`}
          fixtureDate={`${fixture.day} ${fixture.date} ${fixture.month}`}
          venue={fixture.venue}
          time={fixture.time}
          price={price}
          fixtureKey={fixture.id}
          onClose={() => setTicketModalOpen(false)}
        />
      )}
    </>
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
  const loggedInContact = getLoggedInContact()
  const [buyerName, setBuyerName] = useState(loggedInContact?.name ?? '')
  const [buyerEmail, setBuyerEmail] = useState(loggedInContact?.email ?? '')
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
  const ticketImageUrl = toAbsoluteImageUrl(useSiteImage('logo'))

  const getUser = (): { id: string | number; name: string; email?: string } | null => {
    const contact = getLoggedInContact()
    if (!contact) return null
    return { id: contact.id ?? contact.email, name: contact.name, email: contact.email }
  }

  const user = getUser()
  const isLoggedIn = !!user

  const [stripeError, setStripeError] = useState('')
  const [showCardCheckout, setShowCardCheckout] = useState(false)
  const [paying, setPaying] = useState(false)
  const [ticketStartedAt] = useState(() => Date.now())
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')

  const persistPurchase = (receiptId: string, status: 'succeeded' | 'pending', cardLast4?: string) => {
    const method = paymentMethod === 'card'
      ? (cardLast4 ? `Card •••• ${cardLast4}` : 'Card')
      : 'Cash'

    if (paymentMethod === 'card' && status === 'succeeded') {
      recordGuestCardPayment({
        payerName: buyerName,
        payerEmail: buyerEmail,
        amount: total,
        plan: `Ticket - ${fixtureName}`,
        cardLast4,
        referenceId: receiptId,
      })
    } else {
      const paymentEntry: Payment = {
        id: receiptId,
        playerId: user?.id != null ? String(user.id) : 'guest',
        playerName: buyerName,
        amount: total,
        status,
        date: new Date().toISOString().split('T')[0],
        method,
        plan: `Ticket - ${fixtureName}`,
      }
      const payments = getPayments()
      payments.push(paymentEntry)
      setPayments(payments)
    }

    if (user?.id) {
      addTicketPurchase({
        userId: String(user.id),
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

  const handleSubmit = async () => {
    if (total <= 0) return
    if (!buyerName.trim()) return
    if (!buyerEmail.trim()) return
    setStripeError('')

    const security = validatePublicFormSecurity({
      formStartedAt: ticketStartedAt,
      rateLimitKey: `ticket:${buyerEmail.trim().toLowerCase()}`,
      privacyAccepted,
      turnstileToken,
      maxAttempts: 8,
    })
    if (!security.ok) {
      setStripeError(security.error)
      return
    }

    if (paymentMethod === 'card') {
      const receiptId = `DLBC-${Date.now().toString(36).toUpperCase()}`
      const lineItems: { name: string; amountCents: number; quantity: number; imageUrl?: string }[] = []
      if (adultQty > 0 && price.adultPrice > 0) {
        lineItems.push({ name: `Adult ticket — ${fixtureName}`, amountCents: Math.round(price.adultPrice * 100), quantity: adultQty, imageUrl: ticketImageUrl })
      }
      if (kidQty > 0 && price.kidPrice > 0) {
        lineItems.push({ name: `Kid ticket — ${fixtureName}`, amountCents: Math.round(price.kidPrice * 100), quantity: kidQty, imageUrl: ticketImageUrl })
      }

      setPaying(true)
      try {
        const redirected = await redirectToStripeCheckout({
          purchaseType: 'ticket',
          referenceId: receiptId,
          customerName: buyerName.trim(),
          customerEmail: buyerEmail.trim(),
          lineItems,
          metadata: {
            fixture_name: fixtureName,
            fixture_key: fixtureKey,
            fixture_date: fixtureDate,
            adult_qty: String(adultQty),
            kid_qty: String(kidQty),
            adult_price: String(price.adultPrice ?? 0),
            kid_price: String(price.kidPrice ?? 0),
            user_id: user?.id != null ? String(user.id) : '',
          },
          turnstileToken,
        })
        if (!redirected) setShowCardCheckout(true)
      } catch (err) {
        setStripeError(err instanceof Error ? err.message : 'Could not start payment')
      } finally {
        setPaying(false)
      }
      return
    }

    const receiptId = `DLBC-${Date.now().toString(36).toUpperCase()}`
    persistPurchase(receiptId, 'pending')
    setReceipt({
      receiptId,
      total,
      adultQty,
      kidQty,
      isLoggedIn,
    })
  }

  const completeCardPurchase = (cardLast4: string) => {
    const receiptId = `DLBC-${Date.now().toString(36).toUpperCase()}`
    persistPurchase(receiptId, 'succeeded', cardLast4)
    const lineItems: { name: string; quantity: number; amountCents: number; imageUrl?: string }[] = []
    if (adultQty > 0 && price.adultPrice > 0) {
      lineItems.push({ name: `Adult ticket — ${fixtureName}`, amountCents: Math.round(price.adultPrice * 100), quantity: adultQty, imageUrl: ticketImageUrl })
    }
    if (kidQty > 0 && price.kidPrice > 0) {
      lineItems.push({ name: `Kid ticket — ${fixtureName}`, amountCents: Math.round(price.kidPrice * 100), quantity: kidQty, imageUrl: ticketImageUrl })
    }
    void sendPurchaseConfirmationEmail({
      customerName: buyerName.trim(),
      customerEmail: buyerEmail.trim(),
      purchaseType: 'ticket',
      referenceId: receiptId,
      amountCents: Math.round(total * 100),
      items: lineItems,
      planLabel: `Ticket - ${fixtureName}`,
    })
    setShowCardCheckout(false)
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
        className="bg-[#0D1626] border border-white/10 rounded-3xl shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)] max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!receipt ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h3 className="font-oswald font-bold text-xl text-white">
                  {fixtureName}
                </h3>
                <p className="font-inter text-sm text-slate-400 mt-1">
                  {fixtureDate} · {venue} · {time}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
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
                    <p className="font-inter font-semibold text-white">Adult Ticket</p>
                    <p className="font-inter text-sm text-slate-400">€{price.adultPrice} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAdultQty(Math.max(0, adultQty - 1))}
                      className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-inter font-semibold text-lg w-6 text-center text-white">
                      {adultQty}
                    </span>
                    <button
                      onClick={() => setAdultQty(adultQty + 1)}
                      className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
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
                    <p className="font-inter font-semibold text-white">Kid Ticket</p>
                    <p className="font-inter text-sm text-slate-400">€{price.kidPrice} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setKidQty(Math.max(0, kidQty - 1))}
                      className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-inter font-semibold text-lg w-6 text-center text-white">
                      {kidQty}
                    </span>
                    <button
                      onClick={() => setKidQty(kidQty + 1)}
                      className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Running Total */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-inter font-semibold text-white">Total</span>
                  <span className="font-oswald font-bold text-2xl text-lions-400">
                    €{total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="space-y-3">
                {loggedInContact && (
                  <p className="font-inter text-xs text-slate-400">
                    Using your account details — edit below to use a different name or email.
                  </p>
                )}
                <div>
                  <label className="font-inter text-sm font-medium text-slate-200 mb-1 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full border border-white/10 bg-white/[0.05] rounded-lg px-4 py-2 font-inter text-sm text-white placeholder:text-slate-500 focus:border-lions-400 focus:ring-2 focus:ring-lions-400/30 outline-none transition-all"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="font-inter text-sm font-medium text-slate-200 mb-1 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full border border-white/10 bg-white/[0.05] rounded-lg px-4 py-2 font-inter text-sm text-white placeholder:text-slate-500 focus:border-lions-400 focus:ring-2 focus:ring-lions-400/30 outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="font-inter text-sm font-medium text-slate-200 mb-2 block">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 flex items-center justify-center gap-2 font-inter font-semibold text-sm px-4 py-3 rounded-lg border transition-all duration-200 ${
                      paymentMethod === 'card'
                        ? 'border-lions-400 bg-lions-500/15 text-lions-300'
                        : 'border-white/10 text-slate-400 hover:border-white/25'
                    }`}
                  >
                    <CreditCard size={16} />
                    Pay by Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 flex items-center justify-center gap-2 font-inter font-semibold text-sm px-4 py-3 rounded-lg border transition-all duration-200 ${
                      paymentMethod === 'cash'
                        ? 'border-lions-400 bg-lions-500/15 text-lions-300'
                        : 'border-white/10 text-slate-400 hover:border-white/25'
                    }`}
                  >
                    <Banknote size={16} />
                    Pay at Gate
                  </button>
                </div>
              </div>

              <PrivacyConsentField checked={privacyAccepted} onChange={setPrivacyAccepted} className="px-6" />
              <div className="px-6 pb-2">
                <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} theme="dark" />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10">
              {stripeError && (
                <p className="font-inter text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 mb-3">
                  {stripeError}
                </p>
              )}
              <button
                onClick={handleSubmit}
                disabled={total <= 0 || !buyerName.trim() || !buyerEmail.trim() || paying}
                className="w-full bg-gradient-to-br from-lions-400 to-lions-600 text-white font-inter font-semibold text-base uppercase tracking-widest px-4 py-4 rounded-full shadow-[0_14px_34px_-14px_rgba(46,107,255,0.85)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
              >
                {paying ? (
                  'Redirecting to Stripe…'
                ) : paymentMethod === 'card' ? (
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
            <div className="w-16 h-16 bg-green-500/15 ring-1 ring-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h3 className="font-oswald font-bold text-2xl text-white">
              Tickets Purchased!
            </h3>
            <p className="font-inter text-sm text-slate-400 mt-2">
              Receipt ID: <span className="font-mono font-semibold text-white">{receipt.receiptId}</span>
            </p>

            <div className="mt-6 bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="font-inter text-sm text-slate-400">Fixture</span>
                <span className="font-inter text-sm text-white text-right">{fixtureName}</span>
              </div>
              {receipt.adultQty > 0 && (
                <div className="flex justify-between">
                  <span className="font-inter text-sm text-slate-400">Adult x{receipt.adultQty}</span>
                  <span className="font-inter text-sm text-white">€{(receipt.adultQty * price.adultPrice).toFixed(2)}</span>
                </div>
              )}
              {receipt.kidQty > 0 && (
                <div className="flex justify-between">
                  <span className="font-inter text-sm text-slate-400">Kid x{receipt.kidQty}</span>
                  <span className="font-inter text-sm text-white">€{(receipt.kidQty * price.kidPrice).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="font-inter font-semibold text-white">Total Paid</span>
                <span className="font-oswald font-bold text-lions-400">€{receipt.total.toFixed(2)}</span>
              </div>
            </div>

            <p className="font-inter text-sm text-slate-400 mt-6">
              {receipt.isLoggedIn
                ? 'Your tickets are saved to your account.'
                : 'A confirmation has been sent to your email.'}
            </p>

            <button
              onClick={onClose}
              className="mt-6 w-full bg-gradient-to-br from-lions-400 to-lions-600 text-white font-inter font-semibold text-sm uppercase tracking-widest px-4 py-3 rounded-full shadow-[0_12px_30px_-14px_rgba(46,107,255,0.8)] hover:-translate-y-0.5 transition-all duration-200"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {showCardCheckout && (
        <PaymentCheckout
          open
          title="Match tickets"
          description={fixtureName}
          amount={total}
          onClose={() => setShowCardCheckout(false)}
          onSuccess={({ cardLast4 }) => completeCardPurchase(cardLast4)}
        />
      )}
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
            className={`text-center mb-10 scroll-reveal-up ${headerReveal.visible ? 'scroll-reveal-up--in' : ''}`}
          >
            <h4 className="font-inter text-sm font-semibold text-lions-400">Gallery</h4>
            <h2
              className="ldf-section-title text-white mt-3"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}
            >
              The pride in action
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
                className={`group relative aspect-square rounded-lg overflow-hidden cursor-pointer scroll-reveal-up ${
                  gridReveal.visible ? 'scroll-reveal-up--in' : ''
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
    // Open the user's mail client with the message pre-populated so the
    // form actually delivers something instead of pretending to.
    const body = `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
    const href = `mailto:info@dublinlions.ie?subject=${encodeURIComponent(`[${formData.subject}] ${formData.name}`)}&body=${encodeURIComponent(body)}`
    window.location.href = href
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', subject: 'General Enquiry', message: '' })
    }, 3000)
  }

  return (
    <>
      <div className="h-10" />
      <section id="contact" className="site-light border-t border-slate-200/80 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div
            ref={headerReveal.ref}
            className={`mb-12 scroll-reveal-up ${headerReveal.visible ? 'scroll-reveal-up--in' : ''}`}
          >
            <h4 className="font-inter text-sm font-semibold text-lions-600">Get in touch</h4>
            <h2
              className="ldf-section-title text-slate-900 mt-2"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}
            >
              Contact the Pride
            </h2>
            <p className="font-inter text-base text-slate-600 max-w-xl mt-4 leading-relaxed">
              Have a question about membership, interested in sponsoring the club, or want to book a friendly? We would love to hear from you.
            </p>
          </div>

          <div ref={formReveal.ref} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div
              className={`bg-white border border-slate-200/80 rounded-[2rem] p-8 scroll-reveal-left ${formReveal.visible ? 'scroll-reveal-left--in' : ''}`}
            >
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <h3 className="font-inter font-semibold text-lg text-slate-900">
                    Message sent!
                  </h3>
                  <p className="font-inter text-sm text-slate-500 mt-2">
                    We&apos;ll be in touch soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="font-inter text-sm font-medium text-slate-700 mb-1 block">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 font-inter text-base text-slate-900 placeholder:text-slate-400 focus:border-lions-400 focus:ring-2 focus:ring-lions-400/20 outline-none transition-all bg-white"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="font-inter text-sm font-medium text-slate-700 mb-1 block">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 font-inter text-base text-slate-900 placeholder:text-slate-400 focus:border-lions-400 focus:ring-2 focus:ring-lions-400/20 outline-none transition-all bg-white"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="font-inter text-sm font-medium text-slate-700 mb-1 block">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 font-inter text-base text-slate-900 focus:border-lions-400 focus:ring-2 focus:ring-lions-400/20 outline-none transition-all bg-white"
                    >
                      <option>General Enquiry</option>
                      <option>Membership</option>
                      <option>Sponsorship</option>
                      <option>Press</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-inter text-sm font-medium text-slate-700 mb-1 block">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 font-inter text-base text-slate-900 placeholder:text-slate-400 focus:border-lions-400 focus:ring-2 focus:ring-lions-400/20 outline-none transition-all resize-none bg-white"
                      placeholder="Tell us what's on your mind..."
                    />
                  </div>
                  <button type="submit" className="ldf-btn-primary-dark w-full mt-2">
                    Send message
                  </button>
                </form>
              )}
            </div>

            {/* Contact Details */}
            <div
              className={`space-y-8 scroll-reveal-right ${formReveal.visible ? 'scroll-reveal-right--in' : ''}`}
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
                  info: 'Jack Maguire, secretary@dublinlions.ie',
                },
              ].map((detail) => (
                <div key={detail.title} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-lions-500/10 flex items-center justify-center shrink-0">
                    <detail.icon size={22} className="text-lions-600" />
                  </div>
                  <div>
                    <h4 className="font-inter font-semibold text-lg text-slate-900">
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
  return (
    <div>
      <HeroSection />
      <AboutSection />
      <PathwaysSection />
      <TeamsSection />
      <ScheduleSection />
      <GallerySection />
      <ContactSection />
    </div>
  )
}
