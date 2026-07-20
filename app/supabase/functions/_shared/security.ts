import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

function isProductionEnv(): boolean {
  const flag = Deno.env.get('ENVIRONMENT') || Deno.env.get('NODE_ENV')
  if (flag) return flag.toLowerCase() === 'production'
  const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('VITE_SITE_URL') || ''
  return siteUrl.startsWith('https://') && !siteUrl.includes('localhost')
}

export async function verifyTurnstileToken(token: string | undefined, remoteIp?: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return !isProductionEnv()
  if (!token) return false

  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const result = await response.json() as { success?: boolean }
  return result.success === true
}

export async function enforceRateLimit(
  supabase: SupabaseClient,
  action: string,
  identifier: string,
  maxAttempts = 8,
  windowMinutes = 60,
): Promise<{ allowed: boolean; reason?: string }> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('security_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('action', action)
    .eq('identifier', identifier.toLowerCase())
    .gte('created_at', since)

  if (error) {
    console.warn('rate limit lookup failed', error.message)
    return isProductionEnv()
      ? { allowed: false, reason: 'Service temporarily unavailable. Please try again.' }
      : { allowed: true }
  }

  if ((count ?? 0) >= maxAttempts) {
    return { allowed: false, reason: 'Too many requests. Please try again later.' }
  }

  await supabase.from('security_rate_limits').insert({
    action,
    identifier: identifier.toLowerCase(),
  })

  return { allowed: true }
}

export async function assertHumanRequest(
  supabase: SupabaseClient,
  params: {
    action: string
    identifier: string
    turnstileToken?: string
    remoteIp?: string
    maxAttempts?: number
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const turnstileOk = await verifyTurnstileToken(params.turnstileToken, params.remoteIp)
  if (!turnstileOk) {
    return { ok: false, error: 'Security verification failed. Please try again.' }
  }

  const rate = await enforceRateLimit(
    supabase,
    params.action,
    params.identifier,
    params.maxAttempts ?? 8,
  )
  if (!rate.allowed) {
    return { ok: false, error: rate.reason || 'Too many requests.' }
  }

  return { ok: true }
}
