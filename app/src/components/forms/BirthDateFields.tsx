import { useEffect, useMemo, useRef, useState } from 'react'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

function daysInMonth(month: number, year: number): number {
  if (!month || !year) return 31
  return new Date(year, month, 0).getDate()
}

function parseIsoDate(iso: string): { day: string; month: string; year: string } {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { day: '', month: '', year: '' }
  }
  const [year, month, day] = iso.split('-')
  return { day: String(parseInt(day, 10)), month: String(parseInt(month, 10)), year }
}

function composeIsoDate(day: string, month: string, year: string): string {
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  if (!d || !m || !y) return ''
  const maxDay = daysInMonth(m, y)
  const safeDay = Math.min(d, maxDay)
  return `${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

function YearChipStrip({
  years,
  value,
  onChange,
  id,
}: {
  years: number[]
  value: string
  onChange: (year: string) => void
  id?: string
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const selectedYear = value ? parseInt(value, 10) : null

  useEffect(() => {
    if (!selectedYear || !stripRef.current) return
    const chip = stripRef.current.querySelector(`[data-year="${selectedYear}"]`)
    chip?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [selectedYear])

  return (
    <div className="dob-field">
      <p className="dob-field__label" id={id ? `${id}-label` : undefined}>Year</p>
      <div
        ref={stripRef}
        className="dob-year-strip"
        role="listbox"
        aria-labelledby={id ? `${id}-label` : undefined}
      >
        {years.map((year) => {
          const active = value === String(year)
          return (
            <button
              key={year}
              type="button"
              data-year={year}
              role="option"
              aria-selected={active}
              onClick={() => onChange(String(year))}
              className={`dob-year-chip${active ? ' dob-year-chip--active' : ''}`}
            >
              {year}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Birth year for players / parents — horizontal chip strip, no dropdown. */
export function BirthYearPicker({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
}) {
  const currentYear = new Date().getFullYear()
  const years = useMemo(
    () => Array.from({ length: 81 }, (_, i) => currentYear - i),
    [currentYear],
  )
  const ageHint =
    value && !Number.isNaN(parseInt(value, 10))
      ? `${currentYear - parseInt(value, 10)} years old`
      : null

  return (
    <div className="space-y-2">
      <YearChipStrip years={years} value={value} onChange={onChange} id={id} />
      {ageHint && <p className="dob-field__hint">{ageHint}</p>}
    </div>
  )
}

const MIN_CHILD_AGE = 10

/** Full date of birth for children — month pills + day input + year chips. */
export function ChildDobPicker({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
}) {
  const [parts, setParts] = useState(() => parseIsoDate(value))
  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    const newest = currentYear - MIN_CHILD_AGE
    const oldest = currentYear - 22
    return Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i)
  }, [currentYear])

  useEffect(() => {
    setParts(parseIsoDate(value))
  }, [value])

  const maxDay = parts.month && parts.year
    ? daysInMonth(parseInt(parts.month, 10), parseInt(parts.year, 10))
    : 31

  const patch = (next: Partial<typeof parts>) => {
    const merged = { ...parts, ...next }
    setParts(merged)
    // Notify the parent OUTSIDE the state updater — calling onChange (a parent
    // setState) from inside setParts' updater schedules a cross-component update
    // during render, which React drops/warns on and caused the child's DOB to be
    // lost before the roster save read it.
    onChange(composeIsoDate(merged.day, merged.month, merged.year))
  }

  const ageHint =
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? (() => {
          const birth = new Date(value)
          if (Number.isNaN(birth.getTime())) return null
          const today = new Date()
          let age = today.getFullYear() - birth.getFullYear()
          const m = today.getMonth() - birth.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1
          return `${age} years old`
        })()
      : null

  return (
    <div className="dob-picker space-y-4" id={id}>
      <YearChipStrip
        years={years}
        value={parts.year}
        onChange={(year) => patch({ year })}
        id={id ? `${id}-year` : undefined}
      />

      <div className="dob-field">
        <p className="dob-field__label">Month</p>
        <div className="dob-month-grid" role="listbox" aria-label="Month">
          {MONTHS.map((label, index) => {
            const month = String(index + 1)
            const active = parts.month === month
            return (
              <button
                key={label}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => patch({ month })}
                className={`dob-month-chip${active ? ' dob-month-chip--active' : ''}`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="dob-field">
        <label className="dob-field__label" htmlFor={id ? `${id}-day` : undefined}>
          Day
        </label>
        <input
          id={id ? `${id}-day` : undefined}
          type="number"
          inputMode="numeric"
          min={1}
          max={maxDay}
          placeholder="DD"
          value={parts.day}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
            patch({ day: raw })
          }}
          className="dob-day-input"
        />
      </div>

      {ageHint && <p className="dob-field__hint">Age: {ageHint}</p>}
    </div>
  )
}
