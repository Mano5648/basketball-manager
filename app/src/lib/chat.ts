import { supabase } from './supabase'
import { sb } from './db'

export interface ChatMessage {
  id: string
  teamId: string
  senderName: string
  senderRole: string
  text: string
  timestamp: string
}
export type ChatSendStatus = 'pending' | 'sent' | 'failed'

export const CLUB_CHANNEL_ID = 'club'

type Row = { id: string; team_id: string; user_id: string | null; sender_name: string; sender_role: string; text: string; created_at: string }

export function rowToMessage(r: Row): ChatMessage {
  return { id: r.id, teamId: r.team_id, senderName: r.sender_name, senderRole: r.sender_role, text: r.text, timestamp: r.created_at }
}

export async function fetchMessages(teamId: string, limit = 200): Promise<ChatMessage[]> {
  const { data, error } = await sb()
    .from('chat_messages')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return ((data ?? []) as Row[]).map(rowToMessage).reverse()
}

export async function sendMessage(input: { id: string; teamId: string; senderName: string; senderRole: 'player' | 'manager'; text: string }): Promise<void> {
  const client = sb()
  const { data: sess } = await client.auth.getSession()
  const uid = sess.session?.user.id ?? (await client.auth.getUser()).data.user?.id
  if (!uid) throw new Error('Not signed in')
  const { error } = await client.from('chat_messages').insert({
    id: input.id,
    team_id: input.teamId,
    user_id: uid,
    sender_name: input.senderName,
    sender_role: input.senderRole,
    text: input.text,
  })
  if (error) throw error
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await sb().from('chat_messages').delete().eq('id', id)
  if (error) throw error
}

export function subscribeToTeam(teamId: string, onInsert: (m: ChatMessage) => void, onDelete: (id: string) => void): () => void {
  if (!supabase) return () => {}
  const ch = supabase
    .channel(`chat:${teamId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `team_id=eq.${teamId}` }, (p) => onInsert(rowToMessage(p.new as Row)))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (p) => onDelete((p.old as { id: string }).id))
    .subscribe()
  return () => { void supabase!.removeChannel(ch) }
}
