import type { LucideIcon } from 'lucide-react'
import { Calendar, ChevronRight } from 'lucide-react'

export function PageHero({
  eyebrow,
  title,
  subtitle,
  meta,
  avatar,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  meta?: string
  avatar?: React.ReactNode
}) {
  return (
    <div className="hero-band-v2 p-6 md:p-8">
      <div className="hero-court-lines" aria-hidden="true" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          {avatar}
          <div className="min-w-0">
            <p className="font-inter text-xs uppercase tracking-[0.22em] text-amber-400/85 mb-2">{eyebrow}</p>
            <h1 className="font-oswald font-bold text-[clamp(1.65rem,3.4vw,2.75rem)] text-white leading-none tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="font-inter text-base text-slate-300/90 mt-2">{subtitle}</p>
            )}
          </div>
        </div>
        {meta && (
          <div className="flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
            <Calendar size={15} className="text-amber-400/80" />
            <p className="font-inter text-sm text-slate-300">{meta}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function LiveStatusStrip({
  items,
}: {
  items: { label: string; value: string; tone?: 'live' | 'gold' | 'neutral' }[]
}) {
  return (
    <div className="live-status-strip">
      {items.map((item) => (
        <div key={item.label} className="live-status-item">
          {item.tone === 'live' && <span className="live-dot" aria-hidden="true" />}
          <span className="live-status-label">{item.label}</span>
          <span className={`live-status-value ${item.tone === 'gold' ? 'text-amber-300' : ''}`}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function QuickActionList({
  actions,
}: {
  actions: { label: string; icon: LucideIcon; onClick: () => void }[]
}) {
  return (
    <div className="space-y-2">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className="quick-action-row group w-full"
        >
          <span className="quick-action-icon">
            <a.icon size={16} />
          </span>
          <span className="font-inter font-medium text-sm text-slate-200 group-hover:text-white">{a.label}</span>
          <ChevronRight size={15} className="ml-auto text-slate-600 group-hover:text-amber-400 transition-colors" />
        </button>
      ))}
    </div>
  )
}

export function DashSectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="font-inter font-semibold text-lg text-white">{title}</h3>
      {action}
    </div>
  )
}
