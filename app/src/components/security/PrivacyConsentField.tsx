import { Link } from 'react-router-dom'
import { PRIVACY_POLICY_PATH } from '@/lib/security'

interface PrivacyConsentFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  tone?: 'light' | 'dark'
}

export function PrivacyConsentField({ checked, onChange, className = '', tone = 'dark' }: PrivacyConsentFieldProps) {
  const labelClass = tone === 'light' ? 'text-slate-600' : 'text-slate-300'
  const linkClass = tone === 'light' ? 'text-amber-600 hover:text-amber-700' : 'text-amber-400 hover:text-amber-300'

  return (
    <label className={`flex items-start gap-3 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-1 w-4 h-4 rounded accent-amber-400"
      />
      <span className={`font-inter text-xs leading-relaxed ${labelClass}`}>
        I agree to Dublin Lions BC processing my personal data as described in the{' '}
        <Link to={PRIVACY_POLICY_PATH} className={`${linkClass} underline`} target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </Link>
        . I understand I can withdraw consent or request access or erasure of my data at any time.
      </span>
    </label>
  )
}

export function HoneypotField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
      <label htmlFor="company_website">Company website</label>
      <input
        id="company_website"
        name="company_website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
