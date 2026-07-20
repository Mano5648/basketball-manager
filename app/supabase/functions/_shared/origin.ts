/** Resolve a safe checkout redirect origin — never trust client origin blindly. */
export function resolveCheckoutOrigin(clientOrigin: string | undefined): string | null {
  if (!clientOrigin) return null

  const normalized = clientOrigin.replace(/\/$/, '')
  const configured = [
    Deno.env.get('SITE_URL'),
    Deno.env.get('VITE_SITE_URL'),
    ...(Deno.env.get('ALLOWED_CHECKOUT_ORIGINS') || '').split(','),
  ]
    .map((value) => value?.trim().replace(/\/$/, ''))
    .filter((value): value is string => Boolean(value))

  const uniqueAllowed = [...new Set(configured)]

  if (uniqueAllowed.length > 0) {
    return uniqueAllowed.includes(normalized) ? normalized : null
  }

  // Dev fallback when origins are not configured yet.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
    return normalized
  }

  return null
}
