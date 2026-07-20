const RATE_LIMIT_PREFIX = 'dlbc_rl_'

export function isTurnstileConfigured(): boolean {
  return Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
}

/** Hidden field — bots often fill every input. */
export function isHoneypotTriggered(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

/** Reject instant submissions from automated scripts. */
export function isFormTooFast(formStartedAt: number, minMs = 2500): boolean {
  return Date.now() - formStartedAt < minMs
}

export function checkClientRateLimit(key: string, maxAttempts = 6, windowMs = 60 * 60 * 1000): boolean {
  try {
    const storageKey = `${RATE_LIMIT_PREFIX}${key}`
    const raw = localStorage.getItem(storageKey)
    const now = Date.now()
    const attempts: number[] = raw ? JSON.parse(raw) : []
    const recent = attempts.filter((ts) => now - ts < windowMs)
    if (recent.length >= maxAttempts) return false
    recent.push(now)
    localStorage.setItem(storageKey, JSON.stringify(recent))
    return true
  } catch {
    return true
  }
}

export interface PublicFormSecurityInput {
  honeypot?: string
  formStartedAt: number
  rateLimitKey: string
  privacyAccepted: boolean
  turnstileToken?: string
  maxAttempts?: number
}

export function validatePublicFormSecurity(input: PublicFormSecurityInput): { ok: true } | { ok: false; error: string } {
  if (isHoneypotTriggered(input.honeypot)) {
    return { ok: false, error: 'Unable to submit this form. Please try again.' }
  }
  if (!input.privacyAccepted) {
    return { ok: false, error: 'Please confirm you agree to our Privacy Policy.' }
  }
  if (isFormTooFast(input.formStartedAt)) {
    return { ok: false, error: 'Please take a moment to review your details before submitting.' }
  }
  if (!checkClientRateLimit(input.rateLimitKey, input.maxAttempts ?? 6)) {
    return { ok: false, error: 'Too many attempts from this device. Please try again later.' }
  }
  if (isTurnstileConfigured() && !input.turnstileToken) {
    return { ok: false, error: 'Please complete the security check.' }
  }
  return { ok: true }
}

export const PRIVACY_POLICY_PATH = '/privacy'
