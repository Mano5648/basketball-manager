// Supabase Edge Function — send a club notification (in-app inbox + FCM push).
// Manager-only. Body: { title, body, target: 'all'|'team', team_id?, link? }
// Secrets: FIREBASE_SERVICE_ACCOUNT (JSON of a Firebase service account key).
// If the secret is missing, the notification is still saved to the inbox and
// pushSkipped explains why no push went out.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.2.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function fcmAccessToken(sa: { client_email: string; private_key: string; token_uri?: string }): Promise<string> {
  const key = await importPKCS8(sa.private_key, 'RS256')
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience(sa.token_uri ?? 'https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Could not get FCM access token')
  return data.access_token as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { title, body, target = 'all', team_id = null, link = null } = await req.json()
    if (!title?.trim() || !body?.trim()) return json({ error: 'Title and message are required' }, 400)
    if (target === 'team' && !team_id) return json({ error: 'Pick a team' }, 400)

    const { data: isManager } = await userClient.rpc('is_manager')
    let allowed = Boolean(isManager)
    if (!allowed && target === 'team') {
      const { data: isCoach } = await userClient.rpc('is_team_coach', { p_team_id: team_id })
      allowed = Boolean(isCoach)
    }
    if (!allowed) return json({ error: 'Only club admins (or the team coach) can send notifications' }, 403)
    const { data: me } = await userClient.auth.getUser()

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Resolve recipient profile ids
    let profileIds: string[] | null = null
    if (target === 'team') {
      const [{ data: tm }, { data: kids }, { data: team }] = await Promise.all([
        admin.from('team_members').select('profile_id, child_id').eq('team_id', team_id),
        admin.from('children').select('parent_id').eq('team_id', team_id),
        admin.from('teams').select('coach_email').eq('id', team_id).maybeSingle(),
      ])
      const ids = new Set<string>()
      for (const r of tm ?? []) if (r.profile_id) ids.add(r.profile_id)
      const childIds = (tm ?? []).map((r) => r.child_id).filter(Boolean) as string[]
      if (childIds.length) {
        const { data: parents } = await admin.from('children').select('parent_id').in('id', childIds)
        for (const p of parents ?? []) ids.add(p.parent_id)
      }
      for (const k of kids ?? []) ids.add(k.parent_id)
      if (team?.coach_email) {
        const { data: coach } = await admin.from('profiles').select('id').ilike('email', team.coach_email).maybeSingle()
        if (coach) ids.add(coach.id)
      }
      profileIds = [...ids]
    }

    const { data: note, error: insErr } = await admin.from('notifications').insert({ title: title.trim(), body: body.trim(), target, team_id, link, sent_by: me.user?.id ?? null }).select().single()
    if (insErr) return json({ error: insErr.message }, 500)

    let tokenQuery = admin.from('push_tokens').select('token, profile_id')
    if (profileIds) tokenQuery = profileIds.length ? tokenQuery.in('profile_id', profileIds) : tokenQuery.in('profile_id', ['00000000-0000-0000-0000-000000000000'])
    const { data: tokens } = await tokenQuery

    const saRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!saRaw) return json({ ok: true, id: note.id, pushSent: 0, pushSkipped: 'push not configured — add FIREBASE_SERVICE_ACCOUNT secret' })
    if (!tokens?.length) return json({ ok: true, id: note.id, pushSent: 0, pushSkipped: 'no registered devices for this audience' })

    const sa = JSON.parse(saRaw)
    const accessToken = await fcmAccessToken(sa)
    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`
    let sent = 0
    const dead: string[] = []
    await Promise.all(tokens.map(async ({ token }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { token, notification: { title: title.trim(), body: body.trim() }, data: { link: link ?? '/app/inbox', notification_id: note.id }, android: { priority: 'high', notification: { sound: 'default' } }, apns: { payload: { aps: { sound: 'default', badge: 1 } } } } }),
      })
      if (res.ok) sent++
      else {
        const err = await res.json().catch(() => ({}))
        const code = err?.error?.details?.[0]?.errorCode ?? err?.error?.status
        if (code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT' || code === 'NOT_FOUND') dead.push(token)
      }
    }))
    if (dead.length) await admin.from('push_tokens').delete().in('token', dead)
    await admin.from('notifications').update({ push_sent: sent }).eq('id', note.id)
    return json({ ok: true, id: note.id, pushSent: sent })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : 'Send failed' }, 500)
  }
})
