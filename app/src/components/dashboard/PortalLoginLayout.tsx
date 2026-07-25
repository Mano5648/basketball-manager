import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ShieldCheck, Trophy, Users } from 'lucide-react'
import ClubVideoBackground from '@/components/ClubVideoBackground'
import { easeOut } from '@/components/motion/presets'

type PortalKind = 'manager' | 'player'

const PORTAL_COPY: Record<
  PortalKind,
  { eyebrow: string; title: string; subtitle: string; features: { icon: typeof Trophy; label: string }[] }
> = {
  manager: {
    eyebrow: 'Club Operations',
    title: 'Run the pride.',
    subtitle: 'Memberships, payments, fixtures, and team comms — all in one command centre.',
    features: [
      { icon: Users, label: 'Roster & age-group management' },
      { icon: Trophy, label: 'Season lifecycle & fixtures' },
      { icon: ShieldCheck, label: 'Secure manager access' },
    ],
  },
  player: {
    eyebrow: 'Member Hub',
    title: 'Own your season.',
    subtitle: 'Pay fees, check fixtures, chat with the squad, and stay match-ready — parents welcome.',
    features: [
      { icon: Trophy, label: 'Fixtures & training schedule' },
      { icon: Users, label: 'Team chat & announcements' },
      { icon: ShieldCheck, label: 'Membership & payments' },
    ],
  },
}

function PortalBrandMark({ logoUrl, eyebrow }: { logoUrl: string; eyebrow: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="portal-logo-ring-v2 shrink-0">
        <img src={logoUrl} alt="Dublin Lions" className="h-9 w-auto brightness-0 invert" />
      </div>
      <div className="min-w-0">
        <p className="font-oswald font-bold text-xl text-white tracking-wide leading-none">DUBLIN LIONS</p>
        <p className="font-inter text-[10px] uppercase tracking-[0.22em] text-warn-400 mt-1.5">{eyebrow}</p>
      </div>
    </div>
  )
}

export function PortalLoginLayout({
  portal,
  logoUrl,
  formTitle,
  formSubtitle,
  children,
  footer,
  alternateLink,
  shake = false,
}: {
  portal: PortalKind
  logoUrl: string
  formTitle: string
  formSubtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
  alternateLink?: { href: string; label: string }
  shake?: boolean
}) {
  const copy = PORTAL_COPY[portal]
  const reduceMotion = useReducedMotion()

  return (
    <div className="portal-shell-v2 relative flex min-h-[100dvh] flex-col lg:flex-row lg:overflow-hidden">
      <ClubVideoBackground overlay="portal" className="!fixed inset-0" />

      <header className="portal-nav absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-5">
        <Link
          to="/"
          className="portal-back-link flex min-w-0 items-center gap-2 font-inter text-sm text-white/70 hover:text-white transition-colors group"
        >
          <ArrowLeft size={16} className="shrink-0 group-hover:-translate-x-0.5 transition-transform" />
          <span className="truncate">Back to Dublin Lions</span>
        </Link>

        {alternateLink && (
          <Link
            to={alternateLink.href}
            className="portal-alt-link shrink-0 font-inter text-sm text-white/80 hover:text-white transition-colors"
          >
            {alternateLink.label}
          </Link>
        )}
      </header>

      {/* Mobile: logo + club name above the login card */}
      <div className="portal-mobile-brand relative z-10 order-1 shrink-0 px-6 pt-20 pb-3 lg:hidden">
        <PortalBrandMark logoUrl={logoUrl} eyebrow={copy.eyebrow} />
      </div>

      <section className="portal-form-panel-v2 relative z-10 order-2 flex shrink-0 min-w-0 items-center justify-center px-4 pb-6 sm:px-6 sm:pb-8 lg:order-2 lg:flex-1 lg:px-8 lg:py-16 xl:px-12">
        <motion.div
          className={`portal-card-v2 w-full max-w-md p-6 sm:p-8 md:p-10 ${shake ? 'portal-shake' : ''}`}
          initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease: easeOut }}
        >
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="font-oswald font-bold text-2xl text-slate-900">{formTitle}</h2>
            <p className="font-inter text-sm text-slate-500 mt-2">{formSubtitle}</p>
          </div>
          {children}
          {footer}
        </motion.div>
      </section>

      <section className="portal-brand-panel-v2 relative z-10 order-3 flex shrink-0 flex-col justify-start px-6 pb-10 pt-4 lg:order-1 lg:min-h-[100dvh] lg:w-[44%] xl:w-[42%] lg:justify-center lg:px-12 xl:px-14 lg:pb-16 lg:pt-28">
        <motion.div
          className="portal-brand-inner w-full max-w-md"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          <div className="hidden lg:block mb-6 lg:mb-8">
            <PortalBrandMark logoUrl={logoUrl} eyebrow={copy.eyebrow} />
          </div>

          <h1 className="font-oswald font-bold text-[clamp(2rem,3.8vw,3.5rem)] text-white leading-[1.02] tracking-tight">
            {copy.title}
          </h1>
          <p className="font-inter text-sm lg:text-base text-white/75 mt-3 lg:mt-4 leading-relaxed max-w-sm">
            {copy.subtitle}
          </p>

          <ul className="mt-8 space-y-3">
            {copy.features.map((f, i) => (
              <motion.li
                key={f.label}
                className="flex items-center gap-3 font-inter text-sm text-white/65"
                initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: easeOut }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 text-warn-400">
                  <f.icon size={16} />
                </span>
                <span className="min-w-0">{f.label}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </section>
    </div>
  )
}
