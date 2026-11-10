// Supabase Edge Function — delete an account (GDPR "right to erasure").
// A member may delete their own account; an admin may delete any member.
// Body: { userId?: string } (defaults to the caller).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: me } = await userClient.auth.getUser()
    if (!me.user) return json({ error: 'Not signed in' }, 401)

    const body = await req.json().catch(() => ({}))
    const targetId: string = body.userId || me.user.id
    if (targetId !== me.user.id) {
      const { data: isManager } = await userClient.rpc('is_manager')
      if (!isManager) return json({ error: 'Only admins can remove other members' }, 403)
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    // Use the verified login email from auth.users, never profiles.email, so a
    // member cannot point this cleanup at someone else's admin grant.
    const { data: authTarget } = await admin.auth.admin.getUserById(targetId)
    const targetEmail = authTarget.user?.email?.toLowerCase()
    if (targetEmail) {
      const { count } = await admin.from('managers').select('*', { count: 'exact', head: true })
      const { data: isTargetAdmin } = await admin.from('managers').select('email').eq('email', targetEmail).maybeSingle()
      if (isTargetAdmin && (count ?? 0) <= 1) return json({ error: 'Cannot delete the last club admin' }, 400)
    }
    // Erase the profile photo too, as the deletion page promises.
    const { data: prof } = await admin.from('profiles').select('avatar_url').eq('id', targetId).maybeSingle()
    const avatarPath = prof?.avatar_url?.split('/club-media/')[1]
    if (avatarPath) await admin.storage.from('club-media').remove([decodeURIComponent(avatarPath)])
    // profiles row cascades to children, team_members, memberships, tickets, bookings, tokens, rsvps.
    await admin.from('chat_messages').update({ sender_name: 'Deleted member' }).eq('user_id', targetId)
    const { error } = await admin.auth.admin.deleteUser(targetId)
    if (error) return json({ error: error.message }, 500)
    // Revoke admin only after the account is really gone.
    if (targetEmail) await admin.from('managers').delete().eq('email', targetEmail)
    return json({ ok: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Delete failed' }, 500)
  }
})
