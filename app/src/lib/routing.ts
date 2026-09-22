/** Hash-router path (in-app navigation). */
export function appRoute(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized
}

/** Full browser URL for external redirects (Stripe, Supabase Auth). */
export function externalAppUrl(path: string): string {
  const configured = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, '')
  const base = configured ?? window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '')
  return `${base}/#${appRoute(path)}`
}

/** Path segment for Stripe / Supabase redirects: `/#/payment/success` */
export function hashReturnPath(path: string): string {
  return `/#${appRoute(path)}`
}

export function getAppBaseUrl(): string {
  return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '')
}
