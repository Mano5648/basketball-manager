import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type ScheduleGridItem = {
  id: string
  title: string
  date: string
  time: string
  type: string
  subtitle?: string
  people?: string[]
}

export type ScheduleGridMode = 'day' | 'week' | 'month'

type Props = {
  items: ScheduleGridItem[]
  onEventClick?: (id: string) => void
  /** Click a day (or empty slot) to pick it — time is best-guess from click Y in week/day view */
  onDaySelect?: (date: string, time: string) => void
  /** Centered over the calendar board only (e.g. create form) */
  boardOverlay?: ReactNode
  onOverlayDismiss?: () => void
  selectedDate?: string | null
  selectedTime?: string | null
  headerRight?: ReactNode
  hint?: string
}

const HOUR_START = 7
const HOUR_END = 22
const HOUR_H = 64
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
function parseMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function formatHour(h: number) {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr} ${suffix}`
}
function formatClock(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`
}
function durationMins(type: string) {
  if (type === 'Match') return 120
  if (type === 'Event' || type === 'Social') return 90
  return 90
}
function toneClass(type: string) {
  if (type === 'Match') return 'tt-event--match'
  if (type === 'Event' || type === 'Social') return 'tt-event--event'
  return 'tt-event--training'
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function BoardShell({
  children,
  overlay,
  onDismiss,
}: {
  children: ReactNode
  overlay?: ReactNode
  onDismiss?: () => void
}) {
  return (
    <div className="tt-board dash-card overflow-hidden relative">
      {children}
      {overlay && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
          onClick={onDismiss}
          role="presentation"
        >
          <div
            className="dash-card w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Create session"
          >
            {overlay}
          </div>
        </div>
      )}
    </div>
  )
}

export function ScheduleTimeGrid({
  items,
  onEventClick,
  onDaySelect,
  boardOverlay,
  onOverlayDismiss,
  selectedDate,
  selectedTime,
  headerRight,
  hint,
}: Props) {
  const [mode, setMode] = useState<ScheduleGridMode>('week')
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  })
  const [now, setNow] = useState(() => new Date())
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const days = useMemo(() => {
    if (mode === 'day') return [new Date(anchor)]
    if (mode === 'month') {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12)
      const count = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
      return Array.from({ length: count }, (_, i) => addDays(start, i))
    }
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [anchor, mode])

  const dayIsos = useMemo(() => days.map(iso), [days])
  const todayIso = iso(new Date())

  const filtered = useMemo(() => {
    return items.filter((it) => dayIsos.includes(it.date))
  }, [items, dayIsos])

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleGridItem[]>()
    for (const it of filtered) {
      const list = map.get(it.date) ?? []
      list.push(it)
      map.set(it.date, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time))
    }
    return map
  }, [filtered])

  const headerLabel = useMemo(() => {
    if (mode === 'month') {
      return anchor.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })
    }
    if (mode === 'day') {
      return anchor.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })
    }
    return days[0]?.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' }) ?? ''
  }, [anchor, mode, days])

  const shift = (dir: -1 | 1) => {
    setAnchor((prev) => {
      if (mode === 'month') return new Date(prev.getFullYear(), prev.getMonth() + dir, 1, 12)
      if (mode === 'day') return addDays(prev, dir)
      return addDays(prev, dir * 7)
    })
  }

  const nowMins = now.getHours() * 60 + now.getMinutes()
  const showNow =
    (mode === 'day' || mode === 'week') &&
    dayIsos.includes(iso(now)) &&
    nowMins >= HOUR_START * 60 &&
    nowMins < HOUR_END * 60
  const nowTop = ((nowMins - HOUR_START * 60) / 60) * HOUR_H
  const gridHeight = HOURS.length * HOUR_H
  const selectedHour = selectedTime ? Math.floor(parseMinutes(selectedTime) / 60) : null

  const slotClass = (di: string, hour: number) => {
    // Day tab: only the time row highlights
    if (mode !== 'day') return ''
    if (selectedDate === di && selectedHour === hour) return 'tt-slot-selected'
    if (hoveredDate === di && hoveredHour === hour) return 'tt-slot-hover'
    return ''
  }

  return (
    <div className="tt-cal space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => shift(-1)} className="tt-nav-btn" aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-oswald font-bold text-2xl sm:text-[1.75rem] text-slate-900 tracking-tight px-1">
            {headerLabel}
          </h2>
          <button type="button" onClick={() => shift(1)} className="tt-nav-btn" aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="tt-mode">
            {([
              ['day', 'Day'],
              ['week', 'Week'],
              ['month', 'Month'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={mode === key ? 'tt-mode-on' : 'tt-mode-off'}
              >
                {label}
              </button>
            ))}
          </div>
          {headerRight}
        </div>
      </div>

      {hint && (
        <p className="font-inter text-xs text-slate-500">{hint}</p>
      )}

      {mode === 'month' ? (
        <BoardShell overlay={boardOverlay} onDismiss={onOverlayDismiss}>
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="text-center font-inter text-[11px] font-medium text-slate-400 py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {(() => {
                const first = days[0]
                const pad = first ? (first.getDay() + 6) % 7 : 0
                const cells: (Date | null)[] = [
                  ...Array.from({ length: pad }, () => null),
                  ...days,
                ]
                while (cells.length % 7 !== 0) cells.push(null)
                return cells.map((d, i) => {
                  if (!d) return <div key={`pad-${i}`} className="min-h-[5.5rem] rounded-xl bg-slate-50/50" />
                  const di = iso(d)
                  const list = byDate.get(di) ?? []
                  const isToday = di === todayIso
                  return (
                    <button
                      key={di}
                      type="button"
                      onMouseEnter={() => setHoveredDate(di)}
                      onMouseLeave={() => setHoveredDate((h) => (h === di ? null : h))}
                      onClick={() => onDaySelect?.(di, '18:00')}
                      className={`min-h-[5.5rem] rounded-xl border border-slate-100 p-1.5 text-left transition-colors ${
                        isToday ? 'bg-lions-50/50 ring-1 ring-lions-200' : 'bg-white'
                      } ${selectedDate === di ? 'tt-day-selected' : hoveredDate === di ? 'tt-day-hover' : ''} ${onDaySelect ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-oswald text-sm tabular-nums ${isToday ? 'text-lions-600 font-bold' : 'text-slate-700'}`}>
                          {d.getDate()}
                        </span>
                        {onDaySelect && hoveredDate === di && (
                          <span className="font-inter text-[10px] font-medium text-lions-500">Select</span>
                        )}
                      </div>
                      <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                        {list.slice(0, 3).map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onEventClick?.(ev.id)}
                            className={`tt-event tt-event--compact ${toneClass(ev.type)} w-full text-left`}
                          >
                            <span className="truncate">{ev.title}</span>
                          </button>
                        ))}
                        {list.length > 3 && (
                          <p className="font-inter text-[10px] text-slate-400 px-1">+{list.length - 3} more</p>
                        )}
                      </div>
                    </button>
                  )
                })
              })()}
            </div>
          </div>
        </BoardShell>
      ) : (
        <BoardShell overlay={boardOverlay} onDismiss={onOverlayDismiss}>
          <div className="overflow-x-auto">
            <div
              className="tt-week-grid min-w-[640px]"
              style={{ gridTemplateColumns: `4.25rem repeat(${days.length}, minmax(7.5rem, 1fr))` }}
            >
              <div className="tt-corner sticky left-0 z-20 bg-white border-b border-slate-100" />
              {days.map((d) => {
                const di = iso(d)
                const isToday = di === todayIso
                return (
                  <div
                    key={di}
                    className="border-b border-slate-100 px-2 py-3 text-center bg-white"
                  >
                    <div
                      className={`inline-flex flex-col items-center rounded-2xl px-3 py-1.5 ${
                        isToday ? 'bg-lions-500 text-white' : 'text-slate-600'
                      }`}
                    >
                      <span className={`font-inter text-[11px] ${isToday ? 'opacity-80' : 'text-slate-400'}`}>
                        {d.toLocaleDateString('en-IE', { weekday: 'short' })}
                      </span>
                      <span className="font-oswald font-bold text-lg leading-none tabular-nums mt-0.5">
                        {d.getDate()}
                      </span>
                    </div>
                  </div>
                )
              })}

              <div className="relative sticky left-0 z-10 bg-white border-r border-slate-100" style={{ height: gridHeight }}>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    disabled={!onDaySelect || mode !== 'day' || days.length === 0}
                    onMouseEnter={() => {
                      if (mode === 'day' && days[0]) {
                        setHoveredDate(iso(days[0]))
                        setHoveredHour(h)
                      }
                    }}
                    onMouseLeave={() => {
                      if (mode === 'day') {
                        setHoveredHour(null)
                        setHoveredDate(null)
                      }
                    }}
                    onClick={() => {
                      if (!onDaySelect || mode !== 'day' || days.length === 0) return
                      onDaySelect(iso(days[0]), `${String(h).padStart(2, '0')}:00`)
                    }}
                    className={`absolute right-0 left-0 flex items-center justify-end pr-2 font-inter text-[11px] text-slate-400 -translate-y-1/2 ${
                      mode === 'day' && onDaySelect ? 'hover:text-slate-700 cursor-pointer' : 'pointer-events-none'
                    } disabled:pointer-events-none`}
                    style={{ top: (h - HOUR_START) * HOUR_H }}
                    title={mode === 'day' && onDaySelect ? `Add session at ${formatHour(h)}` : undefined}
                  >
                    {formatHour(h)}
                  </button>
                ))}
                {showNow && (
                  <div
                    className="absolute right-0 left-0 z-20 flex items-center justify-end pr-1 pointer-events-none"
                    style={{ top: nowTop }}
                  >
                    <span className="tt-now-pill">{formatClock(nowMins)}</span>
                  </div>
                )}
              </div>

              {days.map((d) => {
                const di = iso(d)
                const list = byDate.get(di) ?? []
                const isToday = di === todayIso
                const weekColHover = mode === 'week' && hoveredDate === di
                return (
                  <div
                    key={`col-${di}`}
                    className={`relative border-l border-slate-100 transition-colors ${
                      weekColHover ? 'tt-col-hover' : 'bg-white'
                    }`}
                    style={{ height: gridHeight }}
                    onMouseEnter={() => {
                      if (mode === 'week') setHoveredDate(di)
                    }}
                    onMouseLeave={() => {
                      if (mode === 'week') {
                        setHoveredDate(null)
                        setHoveredHour(null)
                      }
                    }}
                  >
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-slate-100 pointer-events-none"
                        style={{ top: (h - HOUR_START) * HOUR_H, height: HOUR_H }}
                      />
                    ))}
                    {onDaySelect && HOURS.map((h) => (
                      <button
                        key={`hit-${h}`}
                        type="button"
                        className={`tt-hour-hit absolute left-0 right-0 z-[2] cursor-pointer transition-colors ${slotClass(di, h)}`}
                        style={{ top: (h - HOUR_START) * HOUR_H, height: HOUR_H }}
                        onMouseEnter={() => {
                          setHoveredDate(di)
                          if (mode === 'day') setHoveredHour(h)
                        }}
                        onMouseLeave={() => {
                          if (mode === 'day') {
                            setHoveredHour(null)
                            setHoveredDate(null)
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDaySelect(di, `${String(h).padStart(2, '0')}:00`)
                        }}
                        aria-label={`Create session at ${formatHour(h)}`}
                      />
                    ))}
                    {showNow && isToday && (
                      <div className="tt-now-line absolute left-0 right-0 z-10 pointer-events-none" style={{ top: nowTop }} />
                    )}
                    {list.map((ev) => {
                      const start = parseMinutes(ev.time)
                      const dur = durationMins(ev.type)
                      const top = ((start - HOUR_START * 60) / 60) * HOUR_H
                      const height = Math.max((dur / 60) * HOUR_H, 44)
                      const people = ev.people?.slice(0, 3) ?? []
                      const extra = Math.max(0, (ev.people?.length ?? 0) - people.length)
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick?.(ev.id)
                          }}
                          className={`tt-event absolute left-1 right-1 z-[5] overflow-hidden text-left ${toneClass(ev.type)}`}
                          style={{ top: Math.max(0, top), height }}
                          title={`${ev.title} · ${ev.time}`}
                        >
                          <p className="font-inter font-semibold text-[12px] text-slate-900 leading-snug line-clamp-2">
                            {ev.title}
                          </p>
                          <p className="font-inter text-[10px] text-slate-500 mt-0.5 tabular-nums">
                            {formatClock(start)} – {formatClock(start + dur)}
                          </p>
                          {ev.subtitle && (
                            <p className="font-inter text-[10px] text-slate-400 truncate mt-0.5">{ev.subtitle}</p>
                          )}
                          {people.length > 0 && (
                            <div className="flex items-center mt-1.5 -space-x-1.5">
                              {people.map((name) => (
                                <span key={name} className="tt-avatar" title={name}>
                                  {initials(name)}
                                </span>
                              ))}
                              {extra > 0 && <span className="tt-avatar tt-avatar-more">+{extra}</span>}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          {onDaySelect && !boardOverlay && (
            <p className="font-inter text-[11px] text-slate-400 px-4 py-2 border-t border-slate-100">
              {mode === 'day'
                ? 'Hover a time row, then click to create at that hour'
                : 'Hover a day column, then click a time slot to create'}
            </p>
          )}
        </BoardShell>
      )}
    </div>
  )
}
