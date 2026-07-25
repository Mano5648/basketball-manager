import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { calcAge, isValidBirthYear } from '@/lib/clubData'

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

function hasAnyPart(parts: { day: string; month: string; year: string }): boolean {
  return !!(parts.day || parts.month || parts.year)
}

function DobSegmentFields({
  parts,
  onChange,
  id,
  error,
  helpText,
  yearPlaceholder = 'YYYY',
  showDay = true,
  showMonth = true,
}: {
  parts: { day: string; month: string; year: string }
  onChange: (parts: { day: string; month: string; year: string }) => void
  id?: string
  error?: string
  helpText?: string
  yearPlaceholder?: string
  showDay?: boolean
  showMonth?: boolean
}) {
  const invalid = !!error

  const patch = (next: Partial<typeof parts>) => {
    onChange({ ...parts, ...next })
  }

  return (
    <div className="dob-segments" id={id}>
      <div className={`dob-segments__row${invalid ? ' dob-segments__row--error' : ''}`}>
        {showDay && (
          <div className="dob-segment dob-segment--day">
            <label className="dob-segment__label" htmlFor={id ? `${id}-day` : undefined}>
              Day
            </label>
            <input
              id={id ? `${id}-day` : undefined}
              type="text"
              inputMode="numeric"
              autoComplete="bday-day"
              placeholder="DD"
              maxLength={2}
              value={parts.day}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
                patch({ day: raw })
              }}
              className="dob-segment__input"
              aria-invalid={invalid}
            />
          </div>
        )}
        {showMonth && (
          <div className="dob-segment dob-segment--month">
            <label className="dob-segment__label" htmlFor={id ? `${id}-month` : undefined}>
              Month
            </label>
            <input
              id={id ? `${id}-month` : undefined}
              type="text"
              inputMode="numeric"
              autoComplete="bday-month"
              placeholder="MM"
              maxLength={2}
              value={parts.month}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
                const m = parseInt(raw, 10)
                if (raw && (m < 1 || m > 12)) return
                patch({ month: raw })
              }}
              className="dob-segment__input"
              aria-invalid={invalid}
            />
          </div>
        )}
        <div className="dob-segment dob-segment--year">
          <label className="dob-segment__label" htmlFor={id ? `${id}-year` : undefined}>
            Year
          </label>
          <input
            id={id ? `${id}-year` : undefined}
            type="text"
            inputMode="numeric"
            autoComplete="bday-year"
            placeholder={yearPlaceholder}
            maxLength={4}
            value={parts.year}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
              patch({ year: raw })
            }}
            className="dob-segment__input"
            aria-invalid={invalid}
          />
        </div>
      </div>
      {error ? (
        <p className="dob-segments__error" role="alert">
          <AlertCircle size={14} aria-hidden />
          <span>{error}</span>
        </p>
      ) : helpText ? (
        <p className="dob-segments__help">{helpText}</p>
      ) : null}
    </div>
  )
}

/** Birth year for players / parents — year field only, same visual system. */
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
  const [touched, setTouched] = useState(false)
  const parts = { day: '', month: '', year: value }

  const ageHint =
    value && !Number.isNaN(parseInt(value, 10))
      ? `${currentYear - parseInt(value, 10)} years old`
      : null

  const yearNum = parseInt(value, 10)
  const error =
    touched && value && !isValidBirthYear(yearNum)
      ? 'Enter a valid year of birth'
      : undefined

  return (
    <div onBlur={() => setTouched(true)}>
      <DobSegmentFields
        id={id}
        parts={parts}
        showDay={false}
        showMonth={false}
        yearPlaceholder="YYYY"
        helpText={!error ? ageHint ?? 'Enter your year of birth' : undefined}
        error={error}
        onChange={(next) => onChange(next.year)}
      />
    </div>
  )
}

const MIN_CHILD_AGE = 10

function validateChildDob(parts: { day: string; month: string; year: string }, iso: string): string | undefined {
  if (!hasAnyPart(parts)) return undefined
  const d = parseInt(parts.day, 10)
  const m = parseInt(parts.month, 10)
  const y = parseInt(parts.year, 10)
  if (!parts.day || !parts.month || parts.year.length !== 4) {
    return 'Enter the full date of birth (day, month, and year)'
  }
  if (m < 1 || m > 12) return 'Month must be between 01 and 12'
  if (d < 1 || d > daysInMonth(m, y)) return 'Enter a valid day for that month'
  const age = calcAge(iso)
  if (age === null) return 'Enter a valid date of birth'
  if (age < MIN_CHILD_AGE) return `Child must be at least ${MIN_CHILD_AGE} years old`
  return undefined
}

/** Full date of birth for children — day / month / year text fields. */
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
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setParts(parseIsoDate(value))
  }, [value])

  const iso = composeIsoDate(parts.day, parts.month, parts.year)
  const ageHint =
    iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? (() => {
          const age = calcAge(iso)
          return age !== null ? `Age: ${age} years old` : null
        })()
      : null

  const validationError = touched ? validateChildDob(parts, iso) : undefined

  const handleChange = (next: { day: string; month: string; year: string }) => {
    setParts(next)
    onChange(composeIsoDate(next.day, next.month, next.year))
  }

  return (
    <div onBlur={() => setTouched(true)}>
      <DobSegmentFields
        id={id}
        parts={parts}
        error={validationError}
        helpText={!validationError ? ageHint ?? `Must be at least ${MIN_CHILD_AGE} years old` : undefined}
        onChange={handleChange}
      />
    </div>
  )
}
