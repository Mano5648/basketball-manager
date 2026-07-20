import { externalAppUrl, getAppBaseUrl } from './routing'

/** Turn a stored image path or data URL into something email clients can load. */
export function toAbsoluteImageUrl(imageKey: string | undefined | null): string | undefined {
  if (!imageKey) return undefined
  if (/^(data:|blob:|https?:)/i.test(imageKey)) return imageKey
  if (typeof window === 'undefined') return imageKey
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const path = imageKey.startsWith('/') ? imageKey : `${base}/${imageKey.replace(/^\//, '')}`
  return `${window.location.origin}${path}`
}

export function getAppOrigin(): string {
  if (typeof window === 'undefined') return ''
  return getAppBaseUrl()
}

/** Supabase Auth redirect — must use hash route for static hosting. */
export function getPasswordResetRedirectUrl(): string {
  if (typeof window === 'undefined') return '/basketball-manager/#/reset-password'
  return externalAppUrl('/reset-password')
}
