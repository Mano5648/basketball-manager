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
    <div className="portal-shell-v2 min-h-[100dvh] relative flex flex-col lg:flex-row overflow-hidden">
      <ClubVideoBackground overlay="portal" showCourtLines className="!fixed inset-0" />

      <Link
        to="/"
        className="portal-back-link absolute top-5 left-5 z-30 flex items-center gap-2 font-inter text-sm text-white/70 hover:text-white transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Dublin Lions
      </Link>

      {alternateLink && (
        <Link
          to={alternateLink.href}
          className="portal-alt-link absolute top-5 right-5 z-30 font-inter text-sm text-white/80 hover:text-white transition-colors"
        >
          {alternateLink.label}
        </Link>
      )}

      <section className="portal-brand-panel-v2 relative z-10 flex flex-col justify-end px-6 pb-10 pt-24 lg:px-14 lg:pb-16 lg:pt-28 lg:w-[46%] xl:w-[44%] min-h-[32vh] lg:min-h-[100dvh]">
        <motion.div
          className="portal-brand-inner max-w-md"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="portal-logo-ring-v2">
              <img src={logoUrl} alt="Dublin Lions" className="h-9 w-auto brightness-0 invert" />
            </div>
            <div>
              <p className="font-oswald font-bold text-xl text-white tracking-wide leading-none">DUBLIN LIONS</p>
              <p className="font-inter text-[10px] uppercase tracking-[0.22em] text-warn-400 mt-1.5">{copy.eyebrow}</p>
            </div>
          </div>

          <h1 className="font-oswald font-bold text-[clamp(2.25rem,4.5vw,3.5rem)] text-white leading-[1.02] tracking-tight">
            {copy.title}
          </h1>
          <p className="font-inter text-base text-white/75 mt-4 leading-relaxed max-w-sm">
            {copy.subtitle}
          </p>

          <ul className="mt-10 space-y-3 hidden sm:block">
            {copy.features.map((f, i) => (
              <motion.li
                key={f.label}
                className="flex items-center gap-3 font-inter text-sm text-white/65"
                initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: easeOut }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 text-warn-400">
                  <f.icon size={16} />
                </span>
                {f.label}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </section>

      <section className="portal-form-panel-v2 relative z-10 flex flex-1 items-center justify-center px-4 py-10 lg:px-12 lg:py-16">
        <motion.div
          className={`portal-card-v2 w-full max-w-md p-8 md:p-10 ${shake ? 'portal-shake' : ''}`}
          initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease: easeOut }}
        >
          <div className="text-center mb-8">
            <h2 className="font-oswald font-bold text-2xl text-slate-900">{formTitle}</h2>
            <p className="font-inter text-sm text-slate-500 mt-2">{formSubtitle}</p>
          </div>
          {children}
          {footer}
        </motion.div>
      </section>
    </div>
  )
}
