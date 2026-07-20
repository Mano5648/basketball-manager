/** Hash-router path (in-app navigation). */
export function appRoute(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized
}

/** Full browser URL for external redirects (Stripe, Supabase Auth). */
export function externalAppUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const route = appRoute(path)
  return `${window.location.origin}${base}#${route}`
}

/** Path segment for Stripe / Supabase redirects: `/#/payment/success` */
export function hashReturnPath(path: string): string {
  return `/#${appRoute(path)}`
}

export function getAppBaseUrl(): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${window.location.origin}${base}`
}
